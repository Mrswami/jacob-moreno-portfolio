const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const https = require("https");

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
- Projects: YMCA 360, Spotify Reshuffle, Autonomous ROS 2 Follow Bot, atxLetsPlay, Austin Petanque Platform, Azure Certification Dashboard.
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

exports.api = functions.https.onRequest(app);
