const functions = require("firebase-functions");
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


const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// In-memory rate limiting map: ip -> timestamps
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function checkRateLimit(ip) {
    const now = Date.now();
    const timestamps = rateLimitMap.get(ip) || [];
    const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);

    if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    validTimestamps.push(now);
    rateLimitMap.set(ip, validTimestamps);
    return true;
}

app.post("/chat", (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "client";

    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: "RATE_LIMIT_EXCEEDED: Maximum 5 queries per minute allowed." });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "MISSING_PROMPT" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "API_KEY_NOT_CONFIGURED: Set OPENROUTER_API_KEY in environment." });
    }

    const systemPrompt = `You are the AI Assistant avatar for Jacob Moreno, a Software Developer specializing in cloud applications, automation, and systems integration.
Key Information:
- Skills: Python, Go, React, Node.js, ROS 2 (Jazzy), Gazebo 3D, C++17, Microcontrollers (ESP32/Arduino), Microsoft Azure (AZ-900), Firebase.
- Projects: YMCA 360, Spotify Reshuffle, Cables Audio Visualizer, Autonomous ROS 2 Follow Bot, atxLetsPlay, Austin Petanque Platform, Azure Certification Dashboard.
- Response style: Concise, professional, tech-focused (1-3 sentences). Answer questions accurately as Jacob's AI representative.`;

    const payload = JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
        ],
        max_tokens: 180
    });

    const options = {
        hostname: "openrouter.ai",
        path: "/api/v1/chat/completions",
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://jacobdev.web.app",
            "X-Title": "Jacob Moreno Dev Suite",
            "Content-Length": Buffer.byteLength(payload)
        }
    };

    const apiReq = https.request(options, (apiRes) => {
        let body = "";
        apiRes.on("data", (chunk) => { body += chunk; });
        apiRes.on("end", () => {
            try {
                const parsed = JSON.parse(body);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
                    return res.json({ response: parsed.choices[0].message.content });
                }
                return res.status(500).json({ error: "INVALID_OPENROUTER_RESPONSE", raw: body });
            } catch (err) {
                return res.status(500).json({ error: "PARSE_ERROR" });
            }
        });
    });

    apiReq.on("error", (err) => {
        res.status(500).json({ error: "UPSTREAM_CONNECTION_ERROR" });
    });

    apiReq.write(payload);
    apiReq.end();
});

app.post("/generate-cv", async (req, res) => {
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
                    tsQuestions[`project_match_${idx}`] = noul(`Is the project '${proj.title}' highly relevant to this job description? Project details: ${proj.description}`);
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
                    const ans = tsResponse.answers[`project_match_${idx}`];
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
        formattedProjectsText = selectedProjects.map(p => `${p.title}: ${p.description}`).join("\n\n");
    }

    // --- Proceed to OpenRouter ---
    const systemPrompt = `You are an expert technical cover letter writer. Your task is to write a highly tailored cover letter for Jacob Moreno for the following job description.

Tone: ${tone || 'Professional'}
Primary Domain Identified: ${requiredSkills}

Rules:
1. Write in the first person ("I").
2. Do NOT use placeholder brackets like [Company Name] if the company isn't in the job description.
3. Keep it to a standard cover letter length (3-4 concise paragraphs).
4. Do NOT hallucinate skills. Only use the skills and experiences provided in the Resume and Projects context below.
5. Highlight relevant overlaps between the job description and the provided context.

Context - Resume:
${resumeText ? resumeText.substring(0, 5000) : 'No resume provided.'}

Context - Highly Relevant Selected Projects:
${formattedProjectsText}`;

    const payload = JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
        ],
        max_tokens: 180
    });

    const options = {
        hostname: "openrouter.ai",
        path: "/api/v1/chat/completions",
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://jacobdev.web.app",
            "X-Title": "Jacob Moreno Dev Suite",
            "Content-Length": Buffer.byteLength(payload)
        }
    };

    const apiReq = https.request(options, (apiRes) => {
        let body = "";
        apiRes.on("data", (chunk) => { body += chunk; });
        apiRes.on("end", () => {
            try {
                const parsed = JSON.parse(body);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
                    return res.json({ response: parsed.choices[0].message.content });
                }
                return res.status(500).json({ error: "INVALID_OPENROUTER_RESPONSE", raw: body });
            } catch (err) {
                return res.status(500).json({ error: "PARSE_ERROR" });
            }
        });
    });

    apiReq.on("error", (err) => {
        res.status(500).json({ error: "UPSTREAM_CONNECTION_ERROR" });
    });

    apiReq.write(payload);
    apiReq.end();
});

app.post("/generate-cv", (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "client";

    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: "RATE_LIMIT_EXCEEDED: Maximum 5 queries per minute allowed." });
    }

    const { jobDescription, tone, resumeText, projectsText } = req.body;
    
    if (!jobDescription) {
        return res.status(400).json({ error: "MISSING_JOB_DESCRIPTION" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "API_KEY_NOT_CONFIGURED: Set OPENROUTER_API_KEY in environment." });
    }

    const systemPrompt = `You are an expert technical cover letter writer. Your task is to write a highly tailored cover letter for Jacob Moreno for the following job description.

Tone: ${tone || 'Professional'}

Rules:
1. Write in the first person ("I").
2. Do NOT use placeholder brackets like [Company Name] if the company isn't in the job description, just speak generally about the role.
3. Keep it to a standard cover letter length (3-4 concise paragraphs).
4. Do NOT hallucinate skills. Only use the skills and experiences provided in the Resume and Projects context below.
5. Highlight relevant overlaps between the job description and the provided context.

Context - Resume:
${resumeText ? resumeText.substring(0, 5000) : 'No resume provided.'}

Context - Projects:
${projectsText ? projectsText.substring(0, 5000) : 'No projects provided.'}`;

    const payload = JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Job Description:\n${jobDescription}` }
        ],
        max_tokens: 800
    });

    const options = {
        hostname: "openrouter.ai",
        path: "/api/v1/chat/completions",
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://jacobdev.web.app",
            "X-Title": "Jacob Moreno Dev Suite",
            "Content-Length": Buffer.byteLength(payload)
        }
    };

    const apiReq = https.request(options, (apiRes) => {
        let body = "";
        apiRes.on("data", (chunk) => { body += chunk; });
        apiRes.on("end", () => {
            try {
                const parsed = JSON.parse(body);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
                    return res.json({ response: parsed.choices[0].message.content });
                }
                return res.status(500).json({ error: "INVALID_OPENROUTER_RESPONSE", raw: body });
            } catch (err) {
                return res.status(500).json({ error: "PARSE_ERROR" });
            }
        });
    });

    apiReq.on("error", (err) => {
        res.status(500).json({ error: "UPSTREAM_CONNECTION_ERROR" });
    });

    apiReq.write(payload);
    apiReq.end();
});

exports.api = functions.https.onRequest(app);
