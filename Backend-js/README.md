# SPS Transportation Backend (Node.js port)

Express + TypeScript + Mongoose port of the FastAPI backend.

## Setup

```bash
npm install
cp .env.example .env   # then fill in real values
```

## Run

```bash
npm run dev      # tsx watch on src/main.ts
npm run build    # compile to dist/
npm start        # node dist/main.js
```

Default port: 8000. Health check: `GET /health`.
