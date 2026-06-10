"""
FastAPI application initialization and setup.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.routes.admin_users import router as admin_users_router
from app.routes.assignments import router as assignments_router
from app.routes.bhaktos import router as bhaktos_router
from app.routes.email import router as email_router
from app.routes.flight_groups import router as flight_groups_router
from app.routes.sarthi import router as sarthi_router
from app.routes.templates import router as templates_router
from app.routes.vehicles import router as vehicles_router
from app.routes.jotform_webhook import router as webhook_router
from app.services.mongodb_service import ping as db_ping

# Configure logging
logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info(f"Starting application in {settings.environment} mode")
    logger.info(f"MongoDB collection: {settings.mongodb_database}.{settings.mongodb_collection}")
    yield
    # Shutdown
    logger.info("Shutting down application")


# Initialize FastAPI application
app = FastAPI(
    title="JotForm MongoDB Integration",
    description="API for integrating JotForm submissions with MongoDB",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://form.jotform.com"] if not settings.debug else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Custom exception handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions."""
    logger.warning(f"HTTP {exc.status_code}: {exc.detail} - {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status": exc.status_code},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status": 500,
            "detail": str(exc) if settings.debug else "An unexpected error occurred",
        },
    )


# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    db_connected = await db_ping()
    return {
        "status": "healthy",
        "environment": settings.environment,
        "version": "0.1.0",
        "db_connected": db_connected,
    }


app.include_router(webhook_router, prefix="/jotform")
app.include_router(bhaktos_router, prefix="/bhaktos")
app.include_router(vehicles_router, prefix="/vehicles")
app.include_router(admin_users_router, prefix="/admin-users")
app.include_router(sarthi_router, prefix="/sarthi")
app.include_router(email_router, prefix="/email")
app.include_router(templates_router, prefix="/templates")
app.include_router(flight_groups_router, prefix="/flight-groups")
app.include_router(assignments_router, prefix="/assignments")


@app.get("/", tags=["System"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "JotForm MongoDB Integration API",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs" if settings.debug else "Not available",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
