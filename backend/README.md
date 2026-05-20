---
title: GradeOps Backend
emoji: 🎓
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 8000
---

# GradeOps Backend - Hugging Face Space

This directory is configured to be deployed as a Docker Space on Hugging Face.

## Configuration Details
* **SDK:** Docker
* **Port:** 8000 (mapped via `app_port: 8000`)
* **Environment Variables Required:**
  - `DATABASE_URL` (e.g. Neon PostgreSQL string)
  - `DEBUG=false`
  - `LOG_LEVEL=INFO`
  - `NVIDIA_NIM_API_KEY` (if using VLM grading)
