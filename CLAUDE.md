# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

### Frontend

```bash
# Navigate to frontend directory
cd "Frontend/Airport Transportation Management App"

# Install dependencies (uses pnpm)
pnpm install

# Start dev server (runs on http://localhost:5173)
pnpm dev

# Build for production
pnpm build
```

### Backend

`Backend-js/` (Express + TypeScript + Mongoose) is the canonical backend. The original FastAPI backend is frozen at `archive/Backend/` — see [archive/README.md](archive/README.md).

```bash
cd Backend-js
npm install
npm run dev                     # http://localhost:8000
curl http://localhost:8000/health
```

### Database

```bash
# Set up MongoDB collections — use the Python script preserved in archive/
archive/Backend/.venv/bin/python Database/create_collections.py 'mongodb://localhost:27017'
```

## Environment Setup

### Backend (.env file)

**Required** (no defaults):
- `MONGODB_URI` — MongoDB connection string (must start with `mongodb` or `mongodb+srv`)
- `JOTFORM_API_KEY` — JotForm webhook API key
- `JOTFORM_WEBHOOK_SECRET` — JotForm webhook signature secret

**Common Optional**:
- `ENVIRONMENT` — `development` or `production` (default: `development`)
- `DEBUG` — `True` or `False` (default: `True`)
- `LOG_LEVEL` — `DEBUG`, `INFO`, `WARNING`, `ERROR` (default: `INFO`)
- `ALLOWED_ORIGINS` — CORS origins (default: `*`)
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` — for email invitations
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` — for SMS
- `AERO_API_KEY` — FlightAware API key for real-time flight status

Database collections default to `SPS-Transportation-Admin` — override with `MONGODB_DATABASE`.

### Frontend (.env file)

**Required**:
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID
- `VITE_API_BASE_URL` — Backend API URL (default: `http://localhost:8000` if not set)

## Architecture Overview

### Frontend (React 18 + TypeScript + Vite + Tailwind v4)

**Location**: `Frontend/Airport Transportation Management App/src/app/`

**Screens** (state-based routing, no React Router):
- `LoginScreen.tsx` — Google OAuth login
- `SuperAdminScreen.tsx` — User management, notification templates, vehicle management
- `TransportScreen.tsx` — Flight group management, Sarthi assignment (Arrival/Departure tabs), Bhaktos dashboard
- `DriverScreen.tsx` — Sarthi pickup list view

**Theming**:
- Dark/light mode toggled with `useTheme()` hook (persists to `localStorage`)
- CSS variables and Tailwind semantic classes (`bg-card`, `text-foreground`, etc.) respond to `.dark` class on `<html>`
- Theme variables defined in `src/styles/theme.css` — update both light and `.dark` blocks when changing colors

**Key Hooks**:
- `useTheme()` — manages theme state and persistence
- All screens pass state down; no global context except Google OAuth provider

### Backend (Express + TypeScript + Mongoose)

**Location**: `Backend-js/src/`

**Structure**:
- `main.ts` — Express app setup, CORS, middleware, route mounting
- `config.ts` — zod-validated env loading
- `db.ts` — Mongoose connection (lazy, non-blocking)
- `routes/` — One file per resource (admin_users, sarthi, vehicles, intake, jotform_webhook, etc.)
- `services/` — Business logic (SendGrid email, Twilio SMS, AeroAPI, HMAC validation)
- `models/` — Mongoose schemas with `strict: false` (matches the Python era's flexible query style)
- `middleware/` — error handler (incl. `notFoundHandler`), rate limit

**Database**:
- Mongoose 8 — `await Model.find().lean()` everywhere reads happen
- Collections: `admin_users`, `sarthi`, `vehicles`, `bookings`, `flight_details`, `assignments`, `notification_templates`
- Schemas in `src/models/index.ts` mirror the validators in `Database/create_collections.py`

**Key Integrations**:
- **SendGrid** (`email_service.ts`) — invite emails via REST API
- **Twilio** (`sms_service.ts`) — SMS via REST API
- **FlightAware AeroAPI** (`aero_api.ts`) — real-time flight status; returns `null` for flights >7 days out
- **JotForm** (`jotform_webhook.ts`) — webhook-driven passenger intake; HMAC verification via `crypto.timingSafeEqual`
- **Intake form** (`intake.ts`) — public `POST /intake/submit` for the in-app intake wizard (`/intake` route). Idempotent on optional `submission_id`. Writes identical document shape to JotForm webhook so downstream views are unchanged.

**Notification Templates**:
- Stored in MongoDB collection (`notification_templates`)
- Editable via SuperAdminScreen (Email and SMS channels)
- Variables injected via `renderTemplate()` helper
- Default templates seeded to MongoDB on first access

### Data Flow

1. **Authentication**: Frontend calls Google OAuth → validates email against `admin_users` and `sarthi` collections + mock fallback → sets `screen` state
2. **Flight Data**: JotForm webhook → `bookings` collection → queried by TransportScreen
3. **Sarthi Assignment**: TransportScreen `PUT /assignments/{booking_id}/{flight_type}` → MongoDB + triggers SMS to passenger via template
4. **Real-time Flight Status**: AeroAPI queried when rendering flight groups (status, delay, terminal)

### Key File Patterns

**API Response Structure**:
- Success: `{"data": ..., "status": 200}` or just the object
- Errors on conflict (e.g., duplicate email): `JSONResponse(status_code=409, content={"detail": "...", "existing_id": "..."})`
- 404s on not found: HTTP 404 (logged at INFO, not WARNING)

**Async Patterns**:
- All MongoDB operations: `await db[collection].find_one(...)`, `await db[collection].insert_one(...)`
- All HTTP: `async with httpx.AsyncClient(...) as client: resp = await client.post(...)`
- Never use `asyncio.run()` inside a route; use `asyncio.create_task()` for fire-and-forget (e.g., SMS after assignment)

**Frontend API Calls**:
- Centralized base URL: `import { API_BASE } from "../lib/api"` (respects `VITE_API_BASE_URL`)
- All URLs template-literal: `` const API = `${API_BASE}/endpoint` ``
- No error boundaries — let errors surface as console warnings so they're visible

## Mobile Responsiveness

- Tab bars use `overflow-x-auto scrollbar-hide` with `flex-shrink-0 whitespace-nowrap` buttons for horizontal scroll on mobile
- `scrollbar-hide` utility defined in `src/styles/theme.css` (hides native scrollbars on all browsers)
- Filter pills on DriverScreen use `flex-1` to always fit without scroll
- No responsive grid; layouts are mostly flex-based and adapt naturally

## Common Development Patterns

### Adding a New Notification Channel (Email/SMS)

1. Add template to `DEFAULT_TEMPLATES` in `SuperAdminScreen.tsx` (frontend) and default body constant in `sms_service.py` or `email_service.py` (backend)
2. Auto-seed on first access in TemplatesTab via fetch loop
3. When sending, fetch template from MongoDB and `render_template()` to inject variables
4. For SMS: Twilio REST API via `sms_service.py:send_sms()`; for email: SendGrid REST API via `email_service.py:send_invite_email()`

### Adding a New MongoDB Collection

1. Define schema validation in `Database/create_collections.py` under `create_collections()`
2. Add environment variable in `config.py` (e.g., `my_collection: str = Field(default="my_collection", alias="MY_COLLECTION")`)
3. Access in services: `db = get_database()` → `db[settings.my_collection].find_one(...)`
4. Run `python3 Database/create_collections.py '<uri>'` to create in production

### Updating Theme Colors

- Edit `src/styles/theme.css` — both `:root` (light) and `.dark { ... }` (dark) blocks
- CSS variable names are prefixed `--color-*` in Tailwind's `@theme inline` block
- Semantic classes (`bg-card`, `text-foreground`, etc.) automatically respond to `.dark` being added

## Testing and Debugging

### Backend

- Pytest installed; test files convention: `test_*.py` in same directory as module or dedicated `tests/` folder
- Render free-tier logs viewable in Render dashboard
- `LOG_LEVEL=DEBUG` in `.env` for verbose output

### Frontend

- Vite dev server hot-reloads on save
- Chrome DevTools: check `localStorage` for theme preference (`key="theme"`)
- Network tab: trace API calls to `VITE_API_BASE_URL`
- Console: component errors logged without error boundary

### Local Testing

Both frontend and backend can run locally on `localhost`. To test Twilio/SendGrid locally:
- Mock responses in dev (check `if settings.debug:` patterns in code)
- Or use Twilio/SendGrid test accounts with real API keys

## Known Constraints

- **No React Router** — navigation is state-based (`screen` prop in App.tsx). Adding a new screen requires modifying `App.tsx` conditionals.
- **Render free tier** — sleeps after 15 min inactivity; first request ~30s cold start. Sendgrid/Twilio must use HTTPS (port 443).
- **AeroAPI coverage** — only returns data for flights within ~7 days of today; older/future flights return `None` silently.
- **MongoDB Atlas** — schema validation enforced at the collection level (defined in `create_collections.py`).
- **Inline styles** — many color/padding values hardcoded in `style={{}}` attributes; these don't respond to dark mode. Prefer Tailwind utility classes when possible.

## Deployment

### Frontend (Vercel)

- Root directory: `Frontend/Airport Transportation Management App`
- Build: `pnpm build`
- Output: `dist/`
- Env var: `VITE_API_BASE_URL` (e.g., `https://your-render-backend.onrender.com`)
- Add domain to Google OAuth authorized origins

### Backend (Render)

- Root directory: `Backend-js`
- Build: `npm install && npm run build`
- Start: `npm start` (runs `node dist/main.js`)
- Environment variables: all from `.env` loaded via zod-validated `src/config.ts`
- Health check: `GET /health` (used by Render to keep service alive)
