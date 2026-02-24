# CareMatch AI

An AI-powered platform that streamlines the hiring process for foreign domestic workers (FDW), helping employers quickly identify the best-suited caregivers for their household and care needs.

## The Problem

Hiring a foreign domestic worker is often an emotionally taxing and inefficient process. Employers must review resumes across multiple agencies — each formatted differently — coordinate interviews, and make subjective judgments without a consistent framework. This leads to delays, frustration, and mismatches between caregivers and the families they serve.

## The Solution

CareMatch AI normalizes caregiver data across agencies and uses AI to match candidates to employer requirements objectively and transparently.

- Upload PDF resumes from multiple agencies
- GPT-4o extracts and structures caregiver profiles from each resume
- Employers fill in a care requirements form
- The AI scores, ranks, and generates explainable match reports for the top candidates

The result is a faster, more consistent, and transparent way to identify the best-suited candidate — without the manual effort.

## Features

- **Multi-resume upload** — batch upload PDFs from different agencies simultaneously
- **AI-powered resume parsing** — GPT-4o extracts structured caregiver data regardless of resume format
- **Care requirements form** — captures care type, languages, medical needs, experience level, and more
- **Scored matching** — candidates are ranked 0–100 with labels: Top Match, Strong Match, Good Match
- **Explainable results** — each match includes strengths, gaps, and recommendations
- **Supported care types** — eldercare, childcare, special needs, post-surgery recovery, dementia care, disability support

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| Backend | Python, FastAPI, Uvicorn |
| AI / Agents | CrewAI, LangChain, OpenAI GPT-4o |
| PDF Processing | PyMuPDF |
| Hosting | GitHub Pages (frontend), Render.com (backend) |
| CI/CD | GitHub Actions |