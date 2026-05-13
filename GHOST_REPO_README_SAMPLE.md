# 👻 [Private] Household Finance Ledger: Split-Logic Engine

> **Note**: This repository is a documentation proxy for a private proprietary project. The source code is not public, but the architecture and technical challenges are detailed below for technical review.

## 🎯 The Problem
Managing utility and rent distributions in a 20+ member residential co-op or multi-roommate environment is a nightmare of "non-uniform costs." Standard splitting apps (like Splitwise) struggle with weighted fees, non-weighted service charges, and historical credit tracking.

## 🚀 Technical Stack
*   **Frontend**: Flutter (Mobile/Web Sync)
*   **Backend**: Firebase (Firestore, Cloud Functions)
*   **Logic**: Proprietary Dart-based Split Engine
*   **DevOps**: GitHub Actions for automated testing of financial logic

## 🧠 Architectural Highlights

### 1. The Split-Logic Engine (Proprietary)
I developed a recursive engine that isolates "Service Fees" from "Consumption Costs."
*   **Feature**: Handles "Weighted Split" (e.g., Room A pays 1.2x of Room B) alongside "Flat Fees."
*   **Complexity**: Managed O(N) calculations across 500+ historical ledger entries with 20ms UI response time.

### 2. Automated Cost Reconciliation
Most banking exports include "Garbage/Service" fees that shouldn't be weighted. The system identifies these via regex and custom categorization logic to isolate them from the variable utility split.

## 🛠️ Infrastructure & Scale
*   **Real-time Sync**: Implemented broad-phase optimistic UI updates in Flutter to handle offline entry.
*   **Reliability**: 100% test coverage on the core financial calculation module.

## 📸 System Preview
*(Drop a high-quality screenshot or GIF here of the main dashboard)*

---
### 🤝 Technical Discussion
I am happy to dive deeper into the code organization, the Firestore schema design, or the reconciliation algorithms during a technical interview.
