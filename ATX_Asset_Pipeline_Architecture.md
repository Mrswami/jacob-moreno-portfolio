# Automated Reality Capture Pipeline
**Project**: atxLetsPlay (Austin 3D Lore Map)
**Architecture**: Serverless Event-Driven (Azure)

## Overview
To bring real-world basketball courts into the `atxLetsPlay` 3D environment, I designed a fully serverless, zero-cost **Reality Capture Pipeline**. This pipeline automatically ingests raw phone photos from Google Drive, triggers a 3D photogrammetry reconstruction, applies a stylized AI texture pass, and syncs the final assets to the application's frontend.

## The Tech Stack
*   **Ingest**: Google Drive API (Webhooks)
*   **Compute**: Azure Functions (Node.js / Serverless Consumption Plan)
*   **Reconstruction**: Luma AI API (Gaussian Splatting to `.glb` Mesh)
*   **Stylization**: OpenArt.ai (Image-to-Image texturing)
*   **Database**: Azure Cosmos DB (NoSQL)
*   **Asset Storage**: Azure Blob Storage (LRS)

## Pipeline Workflow (The "Power Grid")
1.  **Event Trigger**: Unstructured phone photos of an Austin court are uploaded to a specific Google Drive folder.
2.  **Webhook Ping**: Google Drive sends a lightweight push notification to the Azure Function, ensuring the compute environment only wakes up when necessary (keeping costs at $0).
3.  **Geometry Bake**: The Azure Function packages the photos and sends them to Luma AI, generating an optimized `.glb` 3D mesh.
4.  **Surrealist Skinning**: The raw mesh textures are passed through an OpenArt.ai image-to-image script to apply the project's signature "Gritty Surrealist" (Seuss-Dali-Street) aesthetic.
5.  **Sync & Render**: The optimized, stylized `.glb` is compressed (Draco) and pushed to Azure Blob Storage. The metadata (district, name, blob URL) is written to Azure Cosmos DB. The `@react-three/fiber` frontend instantly renders the new court on the map.

## OpSec Considerations
*   All environment variables, connection strings, and API keys are strictly excluded from version control via `.gitignore`.
*   A recent security audit ensured that early development `.env` traces were purged from the git cache (`git rm --cached`).
*   Database partition keys (`/district`) are utilized to ensure horizontal scalability without exposing global read patterns.
