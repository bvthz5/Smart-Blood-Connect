# Findings
- You want a single, polished README you can copy-paste directly.
- It should include professional badges, structured sections, commands to set up locally, and work strictly within Markdown features.

# Complete README (copy everything inside this block into [README.md](cci:7://file:///c:/Users/lenovo/Desktop/smartBlood/Smart-Blood-Connect/README.md:0:0-0:0))
```markdown
# Smart Blood Connect

[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/API-Flask-000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/Frontend-Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Swagger Docs](https://img.shields.io/badge/API-Docs-85EA2D?logo=swagger&logoColor=white)](#api-documentation)
[![License: MIT](https://img.shields.io/badge/License-MIT-success.svg)](#license)

A professional, end‑to‑end blood bank management and donor–seeker matching platform. The backend provides a secure Flask REST API with JWT auth, Swagger docs, database migrations, and ML-assisted matching. The frontend is a modern React app powered by Vite for a fast, responsive experience.

---

## Table of Contents
- [Why Smart Blood Connect](#why-smart-blood-connect)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start (Windows PowerShell)](#quick-start-windows-powershell)
- [Common Commands](#common-commands)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [API Documentation](#api-documentation)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Why Smart Blood Connect
- **Reduce time‑to‑match** between seekers and compatible donors
- **Operational visibility** for hospitals with dashboards and alerts
- **Data‑driven decisions** using reliability scoring and demand forecasting
- **Developer-friendly** with clear API, docs, and fast frontend tooling

---

## How It Works

```mermaid
flowchart LR
  A[Donor/Hospital/Admin (Frontend)] -- HTTP/JSON --> B[Flask API]
  B -- SQLAlchemy --> C[(PostgreSQL)]
  B -- Models & Artifacts --> D[(ML Artifacts)]
  B -- JWT --> E[Auth]
  B -- Swagger --> F[API Docs]
  A <-- Proxy (Vite) --> B
```

- The React (Vite) frontend communicates with the Flask API.
- The Flask API manages authentication, donors, hospitals, requests, matches, and ML endpoints.
- Data is persisted in PostgreSQL. ML artifacts are loaded at runtime when available.

---

## Tech Stack

| Layer | Tools |
|---|---|
| Backend | Flask, Flask‑SQLAlchemy, Flask‑Migrate, Flask‑JWT‑Extended, Flasgger (Swagger) |
| Database | PostgreSQL (psycopg2) |
| ML | scikit‑learn, LightGBM, numpy, pandas, joblib |
| Tasks (optional) | Celery, Redis |
| Frontend | React, Vite, React Router, Redux Toolkit, TailwindCSS, Chart.js |

---

## Prerequisites

| Tool | Version | Link |
|---|---:|---|
| Python | 3.12+ | https://www.python.org/ |
| PostgreSQL | 14+ | https://www.postgresql.org/download/ |
| Node.js + npm | 18+/20+ | https://nodejs.org/ |
| Git | latest | https://git-scm.com/ |

> macOS/Linux users can run equivalent shell commands; paths may differ.

---

## Quick Start (Windows PowerShell)

Project directories:
- Backend: [backend/](cci:7://file:///c:/Users/lenovo/Desktop/smartBlood/Smart-Blood-Connect/backend:0:0-0:0)
- Frontend: `frontend/`

### 1) Clone
```powershell
git clone <your-repo-url> Smart-Blood-Connect
cd Smart-Blood-Connect
```

### 2) Backend – create virtual environment and install dependencies
```powershell
py -3.12 -m venv backend\.venv
backend\.venv\Scripts\python -m pip install --upgrade pip
backend\.venv\Scripts\python -m pip install -r backend\requirements.txt
```

### 3) Configure environment
Create [backend/.env](cci:7://file:///c:/Users/lenovo/Desktop/smartBlood/Smart-Blood-Connect/backend/.env:0:0-0:0) with at least:
```env
DATABASE_URL=postgresql+psycopg2://postgres:<password>@localhost:5432/smartblood
JWT_SECRET_KEY=<generate_a_long_random_hex>
```
Optional values for email and seeding exist under `backend/app/config/`.

### 4) PostgreSQL – create database (if needed)
```powershell
# Ensure psql is available in PATH for this session
$pgBin = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory | Sort-Object Name -Descending | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName "bin" }
$env:Path = "$pgBin;$env:Path"

psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE smartblood;"
```

### 5) Migrate database
```powershell
backend\.venv\Scripts\python backend\migrate_db.py
```
- Initializes tables and handles Alembic stamping/upgrades if needed.
- Seeds an admin user if missing.

### 6) Run backend API
```powershell
backend\.venv\Scripts\python backend\run.py
```

- API: http://127.0.0.1:5000/
- Health: http://127.0.0.1:5000/api/health
- Swagger: http://127.0.0.1:5000/apidocs

### 7) Frontend – install and run
```powershell
# If npm is not recognized, add Node to PATH for this session
$env:Path = "C:\Program Files\nodejs;$env:Path"

npm install --prefix frontend
npm run dev --prefix frontend
```

- Frontend: http://localhost:3000

---

## Common Commands

| Purpose | Command |
|---|---|
| Create venv | `py -3.12 -m venv backend\.venv` |
| Install backend deps | `backend\.venv\Scripts\python -m pip install -r backend\requirements.txt` |
| Migrate DB | `backend\.venv\Scripts\python backend\migrate_db.py` |
| Run backend | `backend\.venv\Scripts\python backend\run.py` |
| Install frontend deps | `npm install --prefix frontend` |
| Run frontend | `npm run dev --prefix frontend` |

---

## Environment Variables

Required by [backend/app/config/__init__.py](cci:7://file:///c:/Users/lenovo/Desktop/smartBlood/Smart-Blood-Connect/backend/app/config/__init__.py:0:0-0:0):

- `DATABASE_URL` e.g. `postgresql+psycopg2://postgres:password@localhost:5432/smartblood`
- `JWT_SECRET_KEY` long random secret for JWT signing

Optional:
- `FRONTEND_URL` (default `http://localhost:3000`)
- SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, etc.)
- Admin seed (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- Token expiries (`ACCESS_EXPIRES_MINUTES`, `REFRESH_EXPIRES_DAYS`, etc.)

> Ensure PostgreSQL is running and the database exists before starting the API.

---

## Troubleshooting

- **“npm is not recognized”**  
  Add Node to PATH for the current PowerShell session:  
  ```powershell
  $env:Path = "C:\Program Files\nodejs;$env:Path"
  ```

- **Database connection failed**  
  Verify `DATABASE_URL`, ensure PostgreSQL is running, confirm DB/user:
  ```powershell
  psql -U postgres -h localhost -p 5432 -c "\l"
  ```

- **Migrations complain about missing alembic path**  
  Re-run migrations; the script handles init/stamp/upgrade flows:
  ```powershell
  backend\.venv\Scripts\python backend\migrate_db.py
  ```

- **Port conflicts**  
  Change port in [backend/run.py](cci:7://file:///c:/Users/lenovo/Desktop/smartBlood/Smart-Blood-Connect/backend/run.py:0:0-0:0) or Vite settings.

---

## API Documentation
- Swagger UI: `http://127.0.0.1:5000/apidocs`  
- Health Check: `GET http://127.0.0.1:5000/api/health`

---

## License
This project is licensed under the MIT License.

---

## Acknowledgments
- Flask & React communities  
- PostgreSQL  
- Contributors and the open‑source ecosystem

> Built to support healthcare operations, accelerate donor‑seeker matching, and drive better outcomes.
```