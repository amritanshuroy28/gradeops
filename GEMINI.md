# GRADEOPS - Project Conventions & Rules

## General
- This is a Full-Stack application comprising a FastAPI backend and a React (Vite) frontend.
- Do not use placeholders (like `// TODO`). Implement fully functioning, robust, cleanly structured code.

## Frontend
- React.js with TypeScript and Tailwind CSS.
- Use `npm` for package management.
- Prefer functional components and hooks.
- Use React Query (or similar) for async data fetching and caching, especially for the high-throughput TA review dashboard.

## Backend
- Python FastAPI.
- Use standard `pip` with `requirements.txt` (or a `venv`) for package management.
- SQLAlchemy for the ORM, pointing to PostgreSQL. Use Pydantic for validation.
- Implement RBAC roles (Instructor, TA) but mock the JWT auth flow temporarily as per the updated plan.

## AI / ML Pipeline
- Use `langchain` and `langgraph` for agentic orchestration.
- Output deterministic, structured JSON justifications for partial credits.
- Keep vision tasks modular so we can switch between local (Nougat/Qwen-VL) and API-based models.
