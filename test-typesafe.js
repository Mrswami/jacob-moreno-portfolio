const { choice, TypeSafeClient } = require("@typesafe-ai/sdk");

async function runTest() {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    console.error("\n❌ Error: Missing TYPESAFE_API_KEY.");
    console.error("To run this test, you need an API key from typesafe.ai.");
    console.error("Run it like this in PowerShell:\n");
    console.error("$env:TYPESAFE_API_KEY='your_key_here'");
    console.error("node test-typesafe.js\n");
    return;
  }

  const client = new TypeSafeClient();
  const sampleJobDescription = "We are looking for a Senior React Developer with 5+ years of experience in frontend technologies. Experience with Azure is a plus.";

  console.log("🤖 Running TypeSafe System One Model...");
  console.log("Analyzing Job Description:\n", sampleJobDescription, "\n");

  try {
    const response = await client.systemOne({
      state: { job_description: sampleJobDescription },
      questions: {
        job_category: choice("Which engineering category best fits this role?", {
          frontend: null,
          backend: null,
          fullstack: null,
          devops: null,
          other: null,
        }),
      },
    });

    console.log("✅ Analysis Complete!\n");
    console.log("Category Selected:", response.answers.job_category.choice);
    console.log("Confidence Score:", response.answers.job_category.confidence);
    
  } catch (error) {
    console.error("❌ TypeSafe API Error:", error.message);
  }
}

runTest();
