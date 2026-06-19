# Airport Transportation Management App

[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green.svg)](https://fastapi.tiangolo.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/cloud/atlas)
[![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue.svg)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-1FA2B8.svg)](https://tailwindcss.com)

## Overview

A full-stack Airport Transportation Management System designed for coordinating passenger pickup and drop-off services at airports. The system integrates with JotForm for passenger intake, provides real-time flight status updates via FlightAware AeroAPI, and enables drivers (Sarthi) to view their pickup assignments with automated SMS and email notifications.

**Built for**: Religious/community organizations managing airport transportation logistics at scale.

---

## Features

- **Role-Based Access Control** — Super admin, transportation admin, and driver roles with screen-specific UI
- **JotForm Integration** — Automated webhook-driven passenger data ingestion with form submission validation
- **Flight Group Management** — Groups passengers by flight with real-time status (on-time, delayed, cancelled) from FlightAware
- **Sarthi Assignment** — Assign drivers to bookings/flights with automatic SMS + email notifications to passengers
- **Notification Templates** — Editable email and SMS templates with variable substitution (SendGrid + Twilio)
- **Driver Dashboard** — Pickup list view with passenger details, flight info, and trip status tracking
- **Dark/Light Mode** — Theme toggle persisted to localStorage with CSS variable-based dark mode
- **Responsive UI** — Mobile-friendly design with horizontal scroll tabs and Tailwind CSS v4 utilities
- **Health Checks** — MongoDB connectivity status endpoint for deployment monitoring

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | React | 18.3 |
| **Frontend Language** | TypeScript | Latest |
| **Frontend Build** | Vite | 6.3 |
| **CSS Framework** | Tailwind CSS | 4.1 |
| **UI Components** | shadcn/ui (Radix + MUI) | Latest |
| **Icons** | Lucide React | 0.487 |
| **State Management** | React Hooks | Native |
| **Auth** | Google OAuth 2.0 | @react-oauth/google 0.13 |
| **Backend Framework** | FastAPI | 0.115 |
| **Backend Language** | Python | 3.11+ |
| **Async Server** | Uvicorn | 0.32 |
| **Database** | MongoDB Atlas | Latest |
| **DB Driver** | Motor (async) | 3.3 |
| **ORM/Validation** | Pydantic | 2.10 |
| **HTTP Client** | httpx | 0.25 |
| **Email Service** | SendGrid REST API | v3 (w/ SMTP fallback) |
| **SMS Service** | Twilio REST API | 2010-04-01 |
| **Flight Data** | FlightAware AeroAPI | Latest |
| **Form Ingestion** | JotForm Webhook | Latest |

---

## Project Structure

```
transportation-app/
├── README.md                              (this file)
├── CLAUDE.md                              (dev guidance)
│
├── Frontend/
│   └── Airport Transportation Management App/
│       ├── package.json                   (pnpm dependencies)
│       ├── vite.config.ts                 (Vite 6 config)
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       ├── index.html
│       │
│       └── src/
│           ├── main.tsx                   (React root)
│           ├── app/
│           │   ├── App.tsx                (state-based routing, OAuth provider)
│           │   ├── components/
│           │   │   ├── LoginScreen.tsx
│           │   │   ├── SuperAdminScreen.tsx
│           │   │   ├── TransportScreen.tsx
│           │   │   ├── DriverScreen.tsx
│           │   │   ├── BhaktosDashboard.tsx
│           │   │   ├── FlightGroupView.tsx
│           │   │   ├── GoogleAuthModal.tsx
│           │   │   └── ui/                (50+ shadcn/ui components)
│           │   ├── hooks/
│           │   │   └── useTheme.ts        (dark/light mode)
│           │   ├── lib/
│           │   │   └── api.ts             (API_BASE from VITE_API_BASE_URL)
│           │   └── data/
│           │       └── mockData.ts
│           └── styles/
│               ├── theme.css              (CSS variables, light + dark)
│               ├── globals.css
│               ├── tailwind.css
│               ├── fonts.css
│               └── index.css
│
├── Backend/
│   ├── requirements.txt                   (Python dependencies)
│   ├── .env.example                       (env var template)
│   ├── .python-version
│   │
│   └── app/
│       ├── main.py                        (FastAPI app, CORS, route registration)
│       ├── config.py                      (Pydantic settings from .env)
│       │
│       ├── models/
│       │   └── submission.py
│       │
│       ├── routes/                        (API endpoints)
│       │   ├── admin_users.py             (POST/GET/DELETE admin users)
│       │   ├── sarthi.py                  (POST/GET/DELETE drivers)
│       │   ├── vehicles.py                (POST/GET/PUT/DELETE vehicles)
│       │   ├── bhaktos.py                 (passenger aggregation + stats)
│       │   ├── flight_groups.py           (GET arrivals/departures w/ AeroAPI)
│       │   ├── assignments.py             (PUT sarthi → booking + SMS/email)
│       │   ├── templates.py               (GET/PUT/DELETE notification templates)
│       │   ├── email.py                   (POST send invite email)
│       │   └── jotform_webhook.py         (POST webhook → MongoDB bookings)
│       │
│       └── services/                      (business logic + integrations)
│           ├── mongodb_service.py         (Motor async client)
│           ├── aero_api.py                (FlightAware REST API)
│           ├── email_service.py           (SendGrid + SMTP)
│           ├── sms_service.py             (Twilio REST API)
│           └── validation_service.py      (HMAC, form_id checks)
│
└── Database/
    ├── create_collections.py              (MongoDB collection setup w/ schemas)
    ├── update_collections.py              (migration script)
    └── DB_Design.docx                     (design documentation)
```

---

## Prerequisites

- **Node.js** 18+ (for pnpm package manager)
- **pnpm** 9+ (frontend package manager)
- **Python** 3.11+ (backend)
- **MongoDB Atlas** account with cluster (connection string required)
- **Git** for version control

### Required API Keys / Credentials

Obtain before setup:

1. **JotForm**
   - API Key: https://api.jotform.com/user
   - Form ID: from form settings URL
   - Webhook Secret: from form webhook settings

2. **Google OAuth 2.0**
   - Client ID & Secret: https://console.cloud.google.com/
   - Add `http://localhost:5173` to authorized origins (dev), production domain (prod)

3. **FlightAware AeroAPI** (optional, for flight status)
   - API Key: https://flightaware.com/commercial/aeroapi/

4. **SendGrid** (optional, for email)
   - API Key: https://sendgrid.com/
   - From Email: your SendGrid verified sender

5. **Twilio** (optional, for SMS)
   - Account SID, Auth Token: https://www.twilio.com/console
   - Phone Number: your Twilio number

---

## Setup

### 1. Clone the Repository

```bash
git clone <repo-url>
cd "Local Documents/App_Dev/Transportation_app"
```

### 2. Backend Setup

```bash
cd Backend

# Create Python virtual environment
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env

# Edit .env with your credentials
# Required: MONGODB_URI, JOTFORM_API_KEY, JOTFORM_WEBHOOK_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# Optional: SENDGRID_API_KEY, TWILIO_*, AERO_API_KEY
nano .env
```

### 3. Frontend Setup

```bash
cd "Frontend/Airport Transportation Management App"

# Install dependencies with pnpm
pnpm install

# Create .env from template
cp .env.example .env

# Edit .env
# Required: VITE_GOOGLE_CLIENT_ID
# Optional: VITE_API_BASE_URL (defaults to http://localhost:8000)
nano .env
```

### 4. Database Setup

```bash
cd Database

# Create MongoDB collections with schema validation
python3 create_collections.py '<your_mongodb_connection_string>'
```

This creates 6 collections in the `SPS-Transportation-Admin` database:
- `admin_users` — admin and transportation admin accounts
- `sarthi` — driver profiles
- `vehicles` — vehicle fleet
- `bookings` — passenger bookings from JotForm
- `flight_details` — arrival/departure flight data
- `assignments` — sarthi-to-booking assignments

---

## Environment Variables

### Backend (`.env`)

#### Required

| Variable | Example | Purpose |
|----------|---------|---------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/` | MongoDB Atlas connection |
| `JOTFORM_API_KEY` | `abc123xyz` | JotForm API access |
| `JOTFORM_WEBHOOK_SECRET` | `secret123` | HMAC validation for webhooks |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | OAuth login |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxx` | OAuth login |

#### Optional

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENVIRONMENT` | `development` | App environment (`development` / `production`) |
| `DEBUG` | `True` | Enable Swagger/ReDoc docs |
| `LOG_LEVEL` | `INFO` | Logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `ALLOWED_ORIGINS` | `*` | CORS origins (e.g., `http://localhost:5173,https://example.com`) |
| `SENDGRID_API_KEY` | — | Email service (if absent, falls back to SMTP) |
| `SENDGRID_FROM_EMAIL` | — | Email sender address |
| `SENDGRID_FROM_NAME` | — | Email sender name |
| `TWILIO_ACCOUNT_SID` | — | SMS service (required for SMS) |
| `TWILIO_AUTH_TOKEN` | — | SMS auth (required for SMS) |
| `TWILIO_FROM_NUMBER` | — | SMS from number (required for SMS) |
| `AERO_API_KEY` | — | FlightAware API (optional; if absent, no real-time status) |
| `MONGODB_DATABASE` | `SPS-Transportation-Admin` | MongoDB database name |
| `JOTFORM_FORM_ID` | `231615575331049` | JotForm form to monitor |
| `API_HOST` | `0.0.0.0` | Bind address |
| `API_PORT` | `8000` | API port |

### Frontend (`.env`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `VITE_GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | OAuth login (required) |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend URL (optional; defaults to localhost) |

---

## Running Locally

### Terminal 1: Backend

```bash
cd Backend
source venv/bin/activate  # On Windows: venv\Scripts\activate

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: **http://localhost:8000**
- Swagger docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

### Terminal 2: Frontend

```bash
cd "Frontend/Airport Transportation Management App"
pnpm dev
```

Frontend runs at: **http://localhost:5173**

### Verify Setup

```bash
# Backend health check
curl http://localhost:8000/health

# Frontend should connect to backend via http://localhost:8000 (or VITE_API_BASE_URL)
```

---

## User Roles & Screens

| Role | API Value | Screen | Access |
|------|-----------|--------|--------|
| **Super Admin** | `super_admin` | SuperAdminScreen | Create/delete admin users, manage vehicles, edit notification templates |
| **Transportation Admin** | `transport-admin` | TransportScreen | View flight groups (arrivals/departures), assign sarthis to bookings, manage templates |
| **Driver (Sarthi)** | `driver` | DriverScreen | View assigned pickups with passenger details and flight info |
| **Guest** | — | LoginScreen | Google OAuth login → validates email against `admin_users` + `sarthi` collections |

---

## Architecture & Data Flow

```
1. Passenger Form Submission (JotForm)
   ↓
2. JotForm Webhook POST /jotform/webhook
   ↓
3. Validate token, parse form fields
   ↓
4. Insert into MongoDB: bookings + flight_details + jotform_submissions
   ↓
5. TransportScreen fetches flight groups:
   GET /flight-groups/arrivals, /flight-groups/departures
   ↓
6. Enrichment: Query AeroAPI for real-time flight status (if AERO_API_KEY set)
   ↓
7. Display grouped by flight with passengers, status, terminal, delay
   ↓
8. Admin assigns sarthi to booking:
   PUT /assignments/{booking_id}/{flight_type}
   + Body: { sarthi_id, flight_group_id }
   ↓
9. Backend:
   - Update MongoDB assignment
   - Fetch passenger email/phone from bookings
   - Fetch notification template (email/SMS)
   - Render template with variables
   - Send email (SendGrid or SMTP) + SMS (Twilio) to passenger
   ↓
10. Sarthi views pickup list:
    GET /assignments/sarthi/{sarthi_id}
    ↓
    Returns all assignments with passenger + flight details
```

---

## API Reference

Base URL: `http://localhost:8000` (or your backend deployment)

### Authentication

- **Method**: Google OAuth 2.0 (frontend only)
- **Backend**: Email-based lookup in `admin_users` or `sarthi` collections
- **No bearer token required**: All routes currently public (protect with OAuth email validation in frontend)

### Admin Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin-users/` | List all admin users |
| GET | `/admin-users/find-by-email?email=user@example.com` | Find admin by email |
| POST | `/admin-users/` | Create admin user (409 if email exists) |
| DELETE | `/admin-users/{user_id}` | Delete admin user |

**POST body**: `{ google_id, email, full_name, role }` (role: `super_admin` or `transport-admin`)

### Sarthi (Drivers)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sarthi/` | List all drivers |
| GET | `/sarthi/find-by-email?email=driver@example.com` | Find driver by email |
| GET | `/sarthi/{sarthi_id}` | Get single driver |
| POST | `/sarthi/` | Create driver |
| DELETE | `/sarthi/{sarthi_id}` | Delete driver |

**POST body**: `{ full_name, phone, email, vehicle_id?, assigned_vehicle_type? }`

### Vehicles

| Method | Path | Description |
|--------|------|-------------|
| GET | `/vehicles/` | List all vehicles |
| POST | `/vehicles/` | Create vehicle |
| PUT | `/vehicles/{vehicle_id}` | Update vehicle |
| DELETE | `/vehicles/{vehicle_id}` | Delete vehicle |

**POST/PUT body**: `{ vehicle_name, vehicle_type, capacity, number_plate, assigned_sarthi? }`

**Valid vehicle_type values**: `SUV`, `MUV`, `Van`, `Tempo Traveller`, `Bus`, `Sedan`

### Bhaktos (Passengers) & Bookings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/bhaktos/overview` | Aggregated passenger stats (total, arrivals, departures, both) + list |

**Response**: `{ total, arrivals_only, departures_only, both, passengers: [{ contact, passengers_count, passengers }] }`

### Flight Groups

| Method | Path | Description |
|--------|------|-------------|
| GET | `/flight-groups/arrivals` | Arrivals grouped by flight, enriched with AeroAPI (status, delay, terminal) |
| GET | `/flight-groups/departures` | Departures grouped by flight, enriched with AeroAPI |

**Response**: Array of flight groups with passengers, flight status, actual time, terminal, delay.

### Assignments (Sarthi → Booking)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/assignments/` | List all assignments |
| GET | `/assignments/sarthi/{sarthi_id}` | Full pickup list for a driver (with passenger + flight details) |
| PUT | `/assignments/{booking_id}/{flight_type}` | Assign sarthi to booking (triggers SMS + email) |
| DELETE | `/assignments/{booking_id}/{flight_type}` | Remove assignment |

**PUT body**: `{ sarthi_id, flight_group_id }`

**flight_type**: `arrival` or `departure`

**On success**: Passenger receives SMS (Twilio) + email (SendGrid/SMTP) with assignment notification.

### Notification Templates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/templates/` | List all non-deleted templates |
| PUT | `/templates/{template_id}` | Upsert template |
| DELETE | `/templates/{template_id}` | Soft-delete template |

**PUT body**: `{ channel, name, subject?, body, variables? }`

**channel**: `email` or `sms`

**Variables**: Array of variable names (e.g., `["passenger_name", "flight_number"]`); template body uses `{{variable_name}}` syntax.

### Email

| Method | Path | Description |
|--------|------|-------------|
| POST | `/email/send-invite` | Send invite email to new admin user |

**Body**: `{ name, email, role, subject?, body?, app_url? }`

**Default template** includes role info and clickable app link.

### JotForm Webhook

| Method | Path | Description |
|--------|------|-------------|
| POST | `/jotform/webhook` | Receive form submissions from JotForm |

**Headers**: `X-JOTFORM-SIGNATURE: <hmac>` (validated against `JOTFORM_WEBHOOK_SECRET`)

**Payload**: Form data with question keys (e.g., `q83_name`, `q5_email`, `q95_familyCount`)

**On success**: Inserts `jotform_submissions`, `bookings`, `flight_details` to MongoDB.

**Errors**: 400 (invalid signature), 422 (form ID mismatch), 500 (DB error)

---

## External Integrations

### JotForm

**Purpose**: Inbound passenger data ingestion via form submissions

**Setup**:
1. Create form at jotform.com with passenger fields (name, email, phone, flight, passengers, bags, etc.)
2. Get **Form ID** from form URL (`/form/{form_id}`)
3. Get **API Key** from account settings
4. Configure webhook:
   - URL: `https://your-backend.com/jotform/webhook`
   - Headers: Signature enabled (generates secret)
5. Add to `.env`:
   ```
   JOTFORM_API_KEY=your_key
   JOTFORM_FORM_ID=123456
   JOTFORM_WEBHOOK_SECRET=your_secret
   ```

**Data Flow**: Form submission → POST webhook → validate signature → parse fields → MongoDB bookings + flight_details

### FlightAware AeroAPI

**Purpose**: Real-time flight status, delay, terminal, actual arrival/departure time

**Setup**:
1. Sign up at https://flightaware.com/commercial/aeroapi/
2. Get **API Key** from dashboard
3. Add to `.env`:
   ```
   AERO_API_KEY=your_key
   ```

**Behavior**:
- Queried on `GET /flight-groups/arrivals|departures`
- Returns `None` for flights >7 days out or unavailable
- Status values: `on_time`, `delayed`, `early`, `departed`, `landed`, `cancelled`
- Gracefully skips if key not set (no error)

### SendGrid

**Purpose**: Transactional email (invite, assignment confirmation)

**Setup**:
1. Sign up at https://sendgrid.com/
2. Create **API Key** (Settings → API Keys)
3. Verify **Sender Email** (Settings → Sender Authentication)
4. Add to `.env`:
   ```
   SENDGRID_API_KEY=SG.xxx
   SENDGRID_FROM_EMAIL=noreply@example.com
   SENDGRID_FROM_NAME=Your Org
   ```

**Fallback**: If `SENDGRID_API_KEY` not set, uses SMTP (Gmail/custom SMTP_HOST)

### Twilio

**Purpose**: SMS notifications for sarthi assignments

**Setup**:
1. Sign up at https://www.twilio.com/
2. Get **Account SID** and **Auth Token** from Console
3. Get **Phone Number** (Programmable SMS)
4. Add to `.env`:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_FROM_NUMBER=+1234567890
   ```

**Behavior**:
- SMS sent on `PUT /assignments/{booking_id}/{flight_type}`
- Phone numbers auto-normalized to E.164 format
- Gracefully skips if credentials not set

### Google OAuth 2.0

**Purpose**: User authentication (admin users and drivers)

**Setup**:
1. Go to https://console.cloud.google.com/
2. Create project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add **Authorized Origins**:
   - Dev: `http://localhost:5173`
   - Prod: `https://your-frontend-domain.com`
6. Add to backend `.env`:
   ```
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxx
   ```
7. Add to frontend `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   ```

**Email Validation**: Frontend OAuth returns email → backend checks `admin_users` collection (must be pre-added by super admin) or `sarthi` collection → sets `screen` (role-based routing)

---

## Database Collections

### admin_users

**Purpose**: Super admin and transportation admin accounts

| Field | Type | Unique | Notes |
|-------|------|--------|-------|
| `_id` | ObjectId | — | MongoDB primary key |
| `google_id` | String | Yes | Google OAuth ID |
| `email` | String | Yes | Unique email |
| `full_name` | String | No | User name |
| `role` | String | No | `super_admin` or `transport-admin` |

### sarthi

**Purpose**: Driver profiles

| Field | Type | Unique | Notes |
|-------|------|--------|-------|
| `_id` | ObjectId | — | MongoDB primary key |
| `full_name` | String | No | Driver name |
| `phone` | String | No | Phone number |
| `email` | String | Yes | Unique email |
| `vehicle_id?` | ObjectId | No | Assigned vehicle FK |
| `assigned_vehicle_type?` | String | No | Vehicle type |

### vehicles

**Purpose**: Fleet vehicles (cars, vans, buses, etc.)

| Field | Type | Unique | Notes |
|-------|------|--------|-------|
| `_id` | ObjectId | — | MongoDB primary key |
| `vehicle_name` | String | No | e.g., "Toyota Innova 1" |
| `vehicle_type` | String | No | `SUV`, `MUV`, `Van`, `Tempo Traveller`, `Bus`, `Sedan` |
| `capacity` | Number | No | Passenger capacity |
| `number_plate` | String | Yes | License plate (unique) |
| `assigned_sarthi?` | ObjectId | No | Assigned driver FK |

### bookings

**Purpose**: Passenger bookings from JotForm submissions

| Field | Type | Unique | Notes |
|-------|------|--------|-------|
| `_id` | ObjectId | — | MongoDB primary key |
| `contact` | Object | No | `{ name, email, phone }` |
| `passengers_count` | Number | No | Total passengers |
| `passengers` | Array | No | `[{ name, age?, category? }]` |
| `bags` | Number | No | Number of bags/luggage |
| `special_requirements?` | String | No | e.g., stroller, wheelchair |

### flight_details

**Purpose**: Arrival/departure flight info linked to bookings

| Field | Type | Unique | Notes |
|-------|------|--------|-------|
| `_id` | ObjectId | — | MongoDB primary key |
| `booking_id` | ObjectId | No | FK to bookings (indexed) |
| `flight_type` | String | No | `arrival` or `departure` |
| `flight_number` | String | No | e.g., "AI123" |
| `scheduled_date` | String | No | YYYY-MM-DD |
| `scheduled_time` | String | No | HH:MM |
| `origin_destination` | String | No | City name |

### assignments

**Purpose**: Sarthi-to-booking assignments for pickups/drop-offs

| Field | Type | Unique | Notes |
|-------|------|--------|-------|
| `_id` | ObjectId | — | MongoDB primary key |
| `booking_id` | ObjectId | No | FK to bookings (indexed) |
| `sarthi_id` | ObjectId | No | FK to sarthi (indexed) |
| `flight_type` | String | No | `arrival` or `departure` |
| `trip_status` | String | No | e.g., `pending`, `completed`, `cancelled` |
| `assignment_date` | String | No | ISO timestamp |

---

## Deployment

### Frontend (Vercel)

**Platform**: Vercel (https://vercel.com)

**Configuration**:

| Setting | Value |
|---------|-------|
| **Root Directory** | `Frontend/Airport Transportation Management App` |
| **Build Command** | `pnpm build` |
| **Output Directory** | `dist` |
| **Install Command** | `pnpm install` |

**Environment Variables**:
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID
- `VITE_API_BASE_URL` — Backend URL (e.g., `https://api.example.com`)

**Post-Deployment**:
1. Add Vercel domain to Google OAuth **Authorized Origins**
2. Update frontend `.env` with production `VITE_API_BASE_URL`

### Backend (Render)

**Platform**: Render (https://render.com)

**Configuration**:

| Setting | Value |
|---------|-------|
| **Root Directory** | `Backend` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

**Environment Variables**: All from `.env` loaded via Pydantic (MONGODB_URI, API keys, etc.)

**Health Check**:
- Endpoint: `GET /health`
- Interval: 10s
- Timeout: 5s

**Notes**:
- Render free tier sleeps after 15 min inactivity (~30s cold start on next request)
- Cron job or uptime monitor recommended to keep warm
- Use SendGrid/Twilio instead of local SMTP (requires HTTPS port 443)

---

## Development Patterns

### Adding a New API Route

1. Create file in `Backend/app/routes/your_resource.py`
2. Define async route handlers (e.g., `@router.get("/")`)
3. Import Motor/MongoDB in service layer, not routes
4. Register router in `main.py`: `app.include_router(your_router, prefix="/your-resource", tags=["Your Resource"])`

### Adding a New MongoDB Collection

1. Define schema in `Database/create_collections.py` under `create_collections()`
2. Add environment variable in `Backend/app/config.py` (optional, defaults to collection name)
3. Access in services: `db = get_database(); db[settings.my_collection].find_one(...)`
4. Run migration: `python3 Database/create_collections.py '<mongodb_uri>'`

### Adding a New Notification Template

1. Add default template to `DEFAULT_TEMPLATES` in frontend `SuperAdminScreen.tsx`
2. Add backend constants in `sms_service.py` or `email_service.py`
3. When sending: fetch template from MongoDB → `render_template(body, variables)` → SendGrid/Twilio

### Dark Mode / Theme

- Hook: `useTheme()` in `src/hooks/useTheme.ts` (returns `{ theme, toggleTheme }`)
- Persistence: `localStorage` key `"theme"`
- CSS: `src/styles/theme.css` with `:root` (light) and `.dark { ... }` blocks
- Tailwind responds to `.dark` class on `<html>` element
- Update colors: edit both light and `.dark` CSS variable blocks

### Async Patterns

**All MongoDB operations must be `async`/`await`**:
```python
db = get_database()
doc = await db[collection].find_one({"email": email})
await db[collection].insert_one(doc)
```

**All HTTP calls use `httpx.AsyncClient`**:
```python
async with httpx.AsyncClient() as client:
    resp = await client.post(url, json=body)
```

**Fire-and-forget tasks** (e.g., SMS after assignment):
```python
asyncio.create_task(send_sms(to, body))  # Don't await
```

### No React Router (State-Based Routing)

- Navigation happens by changing `screen` state in `App.tsx`
- No `<BrowserRouter>` or `<Routes>` — just `if (screen === "driver") return <DriverScreen />`
- Add new screen: edit `App.tsx` conditionals, add new component file
- Pro: simpler, no URL routing; Con: no deep links, back button doesn't work

---

## Contributing

### Code Style

- **Frontend**: ESLint + Prettier (configured in `vite.config.ts`)
- **Backend**: PEP 8 + async patterns (see above)
- **Naming**: camelCase (JS), snake_case (Python)

### Testing

- **Backend**: Pytest (run `pytest` from `Backend/` dir)
- **Frontend**: No tests currently; use `pnpm dev` and browser DevTools

### Debugging

- **Backend**: Set `LOG_LEVEL=DEBUG` in `.env`; logs sent to stdout (Render dashboard)
- **Frontend**: Chrome DevTools → Console (OAuth errors, API calls); Network tab (trace requests)
- **Database**: Use MongoDB Atlas web UI or local MongoDB Compass

### Submitting Changes

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes following patterns above
3. Test locally (see "Running Locally")
4. Commit with clear message: `git commit -m "feat: add new assignment SMS"`
5. Push and create pull request

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Backend won't start** | Check `.env` has `MONGODB_URI`, `JOTFORM_API_KEY`, `JOTFORM_WEBHOOK_SECRET` |
| **Frontend can't reach backend** | Verify `VITE_API_BASE_URL` matches backend URL; check CORS in backend `.env` `ALLOWED_ORIGINS` |
| **Google OAuth fails** | Confirm `VITE_GOOGLE_CLIENT_ID` in frontend `.env`; add frontend domain to OAuth authorized origins |
| **SMS not sending** | Check `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` in `.env`; ensure phone format is valid |
| **Email not sending** | If using SendGrid, verify `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` are set; otherwise check SMTP settings |
| **AeroAPI returns `None`** | Flight is >7 days out or API key invalid; no error is thrown (silent fail) |
| **Cold start on Render** | Expected on free tier (~30s); use uptime monitor or cron to keep warm |
| **Themes don't switch** | Clear `localStorage` key `"theme"`; check `.dark` class is added to `<html>` element |

---

## License

[Your License Here]

---

## Support

For issues, questions, or feedback:
- Check [CLAUDE.md](./CLAUDE.md) for dev guidance
- Review [Backend/README.md](./Backend/README.md) for backend-specific info
- Open an issue on GitHub

---

## Related Documentation

- [Frontend README](./Frontend/Airport%20Transportation%20Management%20App/README.md)
- [Backend README](./Backend/README.md)
- [Developer Guidance (CLAUDE.md)](./CLAUDE.md)
- [Database Design](./Database/DB_Design.docx)
