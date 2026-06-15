# Archive

Code in this directory is **no longer maintained** but kept for reference.

## `Backend/`

The original FastAPI + Motor (Python) backend. Frozen on **2026-06-14** when the project consolidated on the TypeScript backend at `../Backend-js/`.

- All routes were ported to `Backend-js/src/routes/*.ts` (Express + Mongoose).
- Document shapes in MongoDB are unchanged — the two backends produced identical `bookings`, `flight_details`, `admin_users`, `sarthi`, `vehicles`, `assignments`, and `notification_templates` documents.
- The new intake form endpoint (`POST /intake/submit`) lives in `Backend-js/src/routes/intake.ts`. The Python version of this endpoint was archived without being deployed.

### If you need to run this again

1. Bring back the entry: `mv archive/Backend ./Backend`
2. Rebuild the venv with Python 3.13 (Homebrew):
   ```bash
   cd Backend && rm -rf .venv && python3.13 -m venv .venv && .venv/bin/pip install -r requirements.txt
   ```
3. Start the launcher: `python3.13 dev.py` (or via `.claude/launch.json` after restoring the Python entry).

But the recommended path is to make changes in `Backend-js/` directly.
