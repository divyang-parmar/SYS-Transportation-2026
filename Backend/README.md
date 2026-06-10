# JotForm MongoDB Integration

Integration service to automatically save JotForm submissions to MongoDB.

## Project Setup

### Prerequisites

- Python 3.8+
- pip or conda
- MongoDB Atlas account (or local MongoDB)

### 1. Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your credentials:
   ```
   # MongoDB - Replace <password> with your actual password
   MONGODB_URI=mongodb+srv://divyangparmar2055_db_user:<YOUR_PASSWORD>@sps-transportation-admi.8cnqqlk.mongodb.net/?appName=SPS-Transportation-Admin
   
   # JotForm API Key - Get from https://www.jotform.com/myaccount/api
   JOTFORM_API_KEY=your_actual_api_key
   
   # Webhook Secret - Generate a random string (used for signature verification)
   JOTFORM_WEBHOOK_SECRET=your_secure_random_secret
   ```

### 4. Verify Configuration

```bash
python -c "from app.config import settings; print('✓ Configuration loaded successfully')"
```

If you see errors, check that:
- `.env` file exists and has correct values
- MongoDB URI is properly formatted
- API keys are correctly set

### 5. Run the Application

```bash
# Development with auto-reload
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### 6. Check API Health

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "environment": "development",
  "version": "0.1.0"
}
```

## Project Structure

```
jotform-mongodb-integration/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app initialization
│   └── config.py               # Configuration management
├── .env                        # Environment variables (DO NOT commit)
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

## Next Steps

1. **Create MongoDB Service** - Database operations layer
2. **Create Validation Service** - Webhook signature verification
3. **Create JotForm Routes** - Webhook endpoint handler
4. **Implement Data Models** - Pydantic schemas
5. **Add Error Handling** - Logging and monitoring
6. **Configure JotForm Webhook** - Point form to your endpoint

## Security Notes

- Never commit `.env` file to git
- Keep `JOTFORM_WEBHOOK_SECRET` secure
- Use HTTPS in production
- Validate all incoming data
- Implement rate limiting
- Monitor MongoDB connection

## Troubleshooting

**Configuration Error: "JOTFORM_API_KEY" missing**
- Make sure `.env` file exists and has `JOTFORM_API_KEY` set

**MongoDB Connection Error**
- Verify MongoDB URI in `.env` is correct
- Check password doesn't contain special characters (or URL encode them)
- Ensure IP is whitelisted in MongoDB Atlas

**Port Already in Use**
- Change `API_PORT` in `.env` or use: `--port 8001`

## Getting API Keys

**JotForm API Key:**
1. Go to https://www.jotform.com/myaccount/api
2. Copy your API Key
3. Add to `.env` as `JOTFORM_API_KEY`

**MongoDB Connection String:**
Already provided: `mongodb+srv://divyangparmar2055_db_user:<password>@sps-transportation-admi.8cnqqlk.mongodb.net/?appName=SPS-Transportation-Admin`
- Replace `<password>` with your actual database password
