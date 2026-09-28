const fs = require('fs');

const code = fs.readFileSync('functions/index.js', 'utf8');

const newTop = `const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { noul, choice, TypeSafeClient } = require("@typesafe-ai/sdk");

const projectsDataPath = path.join(__dirname, "projects.json");
let projectsData = null;
try {
    projectsData = JSON.parse(fs.readFileSync(projectsDataPath, "utf-8"));
} catch (e) {
    console.error("Could not load projects.json", e);
}
`;

const newBody = `app.post("/generate-cv", async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "client";

    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: "RATE_LIMIT_EXCEEDED: Maximum 5 queries per minute allowed." });
    }

    const { jobDescription, tone, resumeText } = req.body;
    
    if (!jobDescription) {
        return res.status(400).json({ error: "MISSING_JOB_DESCRIPTION" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "API_KEY_NOT_CONFIGURED: Set OPENROUTER_API_KEY in environment." });
    }
    
    const typesafeKey = process.env.TYPESAFE_API_KEY;
    if (!typesafeKey) {
        return res.status(500).json({ error: "API_KEY_NOT_CONFIGURED: Set TYPESAFE_API_KEY in environment." });
    }

    // --- TypeSafe Pre-processing Cascade ---
    const tsClient = new TypeSafeClient({ apiKey: typesafeKey });
    
    let isJobValid = false;
    let requiredSkills = "";
    let selectedProjects = [];
    
    try {
        console.log("Evaluating Job Description with TypeSafe...");
        
        // Prepare project selection questions dynamically if projectsData exists
        const tsQuestions = {
            isValidJob: noul("Is the provided text a genuine job description for a software engineering, IT, or technical role?"),
            keyCategory: choice("What is the primary technical domain required for this role?", {
                frontend: null, backend: null, fullstack: null, cloud_devops: null, data: null, mobile: null, other: null
            })
        };
        
        if (projectsData && projectsData.projects) {
            projectsData.projects.forEach((proj, idx) => {
                if (proj.visible !== false) {
                    tsQuestions[\`project_match_\${idx}\`] = noul(\`Is the project '\${proj.title}' highly relevant to this job description? Project details: \${proj.description}\`);
                }
            });
        }

        const tsResponse = await tsClient.systemOne({
            state: { job_description: jobDescription },
            questions: tsQuestions
        });
        
        if (!tsResponse.answers.isValidJob.noul) {
            return res.status(400).json({ error: "INVALID_JOB_DESCRIPTION" }); // Frontend will catch this
        }
        
        requiredSkills = tsResponse.answers.keyCategory.choice;
        
        // Pick top 3 most relevant projects
        if (projectsData && projectsData.projects) {
            const scoredProjects = [];
            projectsData.projects.forEach((proj, idx) => {
                if (proj.visible !== false) {
                    const ans = tsResponse.answers[\`project_match_\${idx}\`];
                    if (ans && ans.noul) {
                        scoredProjects.push({ project: proj, confidence: ans.confidence });
                    }
                }
            });
            scoredProjects.sort((a, b) => b.confidence - a.confidence);
            selectedProjects = scoredProjects.slice(0, 3).map(p => p.project);
        }
        
    } catch (err) {
        console.error("TypeSafe error:", err);
        return res.status(500).json({ error: "TYPESAFE_API_ERROR" });
    }

    // Format selected projects for OpenRouter context
    let formattedProjectsText = "No relevant projects found.";
    if (selectedProjects.length > 0) {
        formattedProjectsText = selectedProjects.map(p => \`\${p.title}: \${p.description}\`).join("\\n\\n");
    }

    // --- Proceed to OpenRouter ---
    const systemPrompt = \`You are an expert technical cover letter writer. Your task is to write a highly tailored cover letter for Jacob Moreno for the following job description.

Tone: \${tone || 'Professional'}
Primary Domain Identified: \${requiredSkills}

Rules:
1. Write in the first person ("I").
2. Do NOT use placeholder brackets like [Company Name] if the company isn't in the job description.
3. Keep it to a standard cover letter length (3-4 concise paragraphs).
4. Do NOT hallucinate skills. Only use the skills and experiences provided in the Resume and Projects context below.
5. Highlight relevant overlaps between the job description and the provided context.

Context - Resume:
\${resumeText ? resumeText.substring(0, 5000) : 'No resume provided.'}

Context - Highly Relevant Selected Projects:
\${formattedProjectsText}\`;
`;

// Replace top
let finalCode = code.replace(
    'const functions = require("firebase-functions");\nconst express = require("express");\nconst cors = require("cors");\nconst https = require("https");', 
    newTop
);

// Replace route body
const startIndex = finalCode.indexOf(`app.post("/generate-cv"`);
const endIndex = finalCode.indexOf(`const payload = JSON.stringify({`);

finalCode = finalCode.substring(0, startIndex) + newBody + '\n    ' + finalCode.substring(endIndex);

fs.writeFileSync('functions/index.js', finalCode);
console.log("Successfully rewritten functions/index.js");
