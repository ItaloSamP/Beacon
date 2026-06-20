# Deploy Guide — Beacon

## Prerequisites

- [Render account](https://render.com)
- GitHub repo connected: `ItaloSamP/Beacon`
- PostgreSQL database (Render managed or external)

## Quick Deploy (Blueprint)

1. In Render dashboard, go to **Blueprints**
2. Click **New Blueprint Instance**
3. Select `ItaloSamP/Beacon` repository, branch `main`
4. Render auto-detects `render.yaml` and creates both services
5. Configure secrets in Render dashboard:
   - **DATABASE_URL** — PostgreSQL connection string
   - **JWT_SECRET** — random string (generate: `openssl rand -hex 32`)
   - **SENDGRID_API_KEY** — SendGrid API key
   - **FERNET_KEY** — generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`

## Manual Setup (if Blueprint unavailable)

### Backend (Web Service)
1. Create Web Service → **Deploy from GitHub** → `ItaloSamP/Beacon`
2. **Runtime:** Python 3
3. **Build Command:** `pip install -e ".[dev]" && alembic upgrade head`
4. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Health Check Path:** `/api/v1/health`
6. Add environment variables (see above)

### Frontend (Static Site)
1. Create Static Site → **Deploy from GitHub** → `ItaloSamP/Beacon`
2. **Build Command:** `cd frontend && npm install && npm run build`
3. **Publish Directory:** `frontend/dist`
4. **Environment Variable:** `VITE_BACKEND_URL` = `https://beacon-backend.onrender.com`

## Post-Deploy Verification

- [ ] Backend health check: `curl https://beacon-backend.onrender.com/api/v1/health`
- [ ] Frontend loads: open `https://beacon-frontend.onrender.com`
- [ ] Login works (register a user)
- [ ] Agent can connect: `beacon-agent run --token <token> --cloud-url https://beacon-backend.onrender.com/api/v1`
- [ ] Emails work (trigger a pipeline run)

## Rollback

- Render dashboard → select service → **Manual Deploy** → choose previous deploy
- Or: `git revert` the bad commit and push to main

## Limitations (Free Tier)
- Cold starts: ~50s after inactivity
- 750 hours/month for Web Services (one service)
- PostgreSQL: 90-day free tier, expires if not upgraded
- Agent: NOT deployed — users install via pip locally
