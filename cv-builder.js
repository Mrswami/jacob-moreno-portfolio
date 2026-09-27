document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const jobDescInput = document.getElementById('job-desc');
    const toneSelect = document.getElementById('tone-select');
    const useResume = document.getElementById('use-resume');
    const useProjects = document.getElementById('use-projects');
    const outputArea = document.getElementById('output-area');
    const loadingIndicator = document.getElementById('loading-indicator');

    generateBtn.addEventListener('click', async () => {
        const jobDesc = jobDescInput.value.trim();
        if (!jobDesc) {
            alert("Please paste a job description first.");
            return;
        }

        // Show loading state
        generateBtn.disabled = true;
        generateBtn.innerText = 'Synthesizing...';
        loadingIndicator.style.display = 'block';
        outputArea.style.display = 'none';
        outputArea.innerText = '';

        try {
            // Fetch context files if checked
            let resumeText = "";
            if (useResume.checked) {
                try {
                    const res = await fetch('RESUME.md');
                    if (res.ok) resumeText = await res.text();
                } catch (e) {
                    console.warn("Failed to load RESUME.md", e);
                }
            }

            let projectsText = "";
            if (useProjects.checked) {
                try {
                    const res = await fetch('projects.json');
                    if (res.ok) projectsText = await res.text();
                } catch (e) {
                    console.warn("Failed to load projects.json", e);
                }
            }

            const payload = {
                jobDescription: jobDesc,
                tone: toneSelect.value,
                resumeText: resumeText,
                projectsText: projectsText
            };

            const response = await fetch('/api/generate-cv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();
            
            outputArea.innerText = data.response || "No response generated.";
            outputArea.style.display = 'block';

        } catch (error) {
            alert("Error generating CV: " + error.message);
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerText = 'Generate Cover Letter';
            loadingIndicator.style.display = 'none';
        }
    });
});
