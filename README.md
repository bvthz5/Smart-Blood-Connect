<h1 align="center">🩸 Smart Blood Connect</h1>

<p align="center">
  <strong>A Complete Blood Bank Management & Donor–Seeker Matching Platform</strong><br>
  Built with ❤️ using Flask, PostgreSQL, and React (Vite)
</p>

<p align="center">
  <!-- Core Tech -->
  <img src="https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Flask-API-black?style=for-the-badge&logo=flask&logoColor=white" alt="Flask">
  <img src="https://img.shields.io/badge/PostgreSQL-DB-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Auth-JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT">
  <img src="https://img.shields.io/badge/Swagger-Docs-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger">
  <img src="https://img.shields.io/badge/License-MIT-success?style=for-the-badge&logo=opensourceinitiative&logoColor=white" alt="License">
</p>

---

### 🌟 Overview
Smart Blood Connect is an end-to-end blood bank and donor-seeker coordination platform.  
It connects **donors, hospitals, and administrators** through a secure REST API, an ML-powered matching engine, and a responsive React frontend.

> Designed for performance, reliability, and scalability — built for real-world healthcare operations.

---

## 📋 Table of Contents
- [Why Smart Blood Connect](#-why-smart-blood-connect)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Setup Guide](#-setup-guide)
- [Common Commands](#-common-commands)
- [Environment Variables](#-environment-variables)
- [Troubleshooting](#-troubleshooting)
- [API Docs](#-api-docs)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

---

## 💡 Why Smart Blood Connect
✅ **Fast Matching:** Real-time donor-seeker compatibility using ML models  
✅ **Transparent System:** End-to-end visibility for hospitals and admins  
✅ **Secure & Verified:** JWT-based authentication and role-based access  
✅ **Modern UX:** Built with React + Tailwind for a smooth experience  
✅ **Scalable Design:** Microservice-friendly backend architecture  

---

## 🧩 Architecture

```mermaid
flowchart LR
  A[Donor / Hospital / Admin (Frontend)] -- HTTP/JSON --> B[Flask REST API]
  B -- SQLAlchemy --> C[(PostgreSQL Database)]
  B -- ML Model Loader --> D[(ML Artifacts / joblib)]
  B -- JWT Auth --> E[User Sessions]
  B -- Swagger --> F[API Docs / OpenAPI]
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

### 6a) Alternative: Run with development script (includes fallback for donor matching)
Double-click `START_DEV.bat` to run the backend with synchronous donor matching when Redis is not available.

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