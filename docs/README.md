# Budgeting App Documentation Pack (React Native + Expo)

Generated: 2026-02-03

This zip contains **product** and **technical** documentation for a month‑centric personal finance budgeting mobile app built with **React Native + Expo**.

## What’s inside

- `product/` – PRD, personas, user stories, IA/UX notes, success metrics, release plan
- `technical/` – architecture, data model, API spec, state management, offline/sync, visualization, security/privacy, testing, CI/CD, Expo setup
- `diagrams/` – standalone Mermaid `.mmd` diagrams (can be previewed in Mermaid Live Editor or in many Markdown viewers)
- `appendices/` – glossary + open questions

## Key concept

The app is **month-centric** (and optionally **pay-period-centric**): users create budgets based on monthly or biweekly income and can see:

- Monthly breakdowns + charts
- Daily breakdowns
- “Left to spend **today**” (per category)
- “Left to spend **this week**” (per category)

## Quick diagram preview

Open any `.mmd` file in a Mermaid viewer, or use the embedded Mermaid blocks in the Markdown docs (e.g., `technical/Architecture.md`).

## Suggested implementation defaults (for the first release)

- Local-first (offline) using SQLite
- Manual transaction entry + optional CSV import
- Bank sync optional, via a small backend (Plaid-style flow)
