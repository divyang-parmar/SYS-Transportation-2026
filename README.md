# SPS Airport Transportation

Volunteer coordination app for Suhradam Parivar Shibir airport transportation — sarthi (driver) assignments, flight tracking, passenger pickup logistics, public intake form.

## Project layout

```
Backend-js/                                       # Express + Mongoose (TypeScript) — canonical backend
Frontend/Airport Transportation Management App/   # React 18 + Vite + Tailwind v4
Database/                                         # MongoDB collection setup script
design_handoff_warm_refinement/                   # Visual design spec ("Warm Refinement")
archive/                                          # Frozen code — see archive/README.md
```

## Quick start (local dev)

```bash
# 1 · MongoDB — Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# 2 · Seed collections (one time, using the Python script in archive/)
cd archive/Backend && python3.13 -m venv .venv && .venv/bin/pip install -r requirements.txt
cd ../.. && archive/Backend/.venv/bin/python Database/create_collections.py 'mongodb://localhost:27017'

# 3 · Backend — http://localhost:8000
cd Backend-js
cp .env.example .env
# Fill in MONGODB_URI=mongodb://localhost:27017, JOTFORM_API_KEY=any-placeholder, JOTFORM_WEBHOOK_SECRET=any-placeholder
npm install
npm run dev

# 4 · Frontend — http://localhost:5173
cd "Frontend/Airport Transportation Management App"
cp .env.example .env
pnpm install
pnpm dev
```

## Routes

- `/` — login / dashboard (role-based: Super Admin, Transport Admin, Sarthi/Driver)
- `/intake` — public transportation request form (no auth required)

## Test logins (dev)

Without `VITE_GOOGLE_CLIENT_ID` set, the app shows a dev-only email-lookup login:

- `ronak@live.com` — Super Admin
- `tarak.patel369@gmail.com` — Transport Admin
- `parthpatel737@gmail.com` — Sarthi/Driver

## Backend

`Backend-js/` is canonical (TypeScript + Express + Mongoose). The original Python/FastAPI backend has been archived to [archive/Backend/](archive/Backend/) — see [archive/README.md](archive/README.md).

## Further reading

- [CLAUDE.md](CLAUDE.md) — architecture overview, env vars, deployment notes
- [design_handoff_warm_refinement/README.md](design_handoff_warm_refinement/README.md) — visual design spec
- [Backend-js/README.md](Backend-js/README.md) — backend specifics
