"""
Application configuration management using Pydantic Settings.
Loads environment variables from .env file and validates them.
"""

from pydantic_settings import BaseSettings
from pydantic import Field, validator
from typing import Literal


class Settings(BaseSettings):
    """Application configuration settings."""

    # MongoDB Configuration
    mongodb_uri: str = Field(..., alias="MONGODB_URI")
    mongodb_database: str = Field(default="SPS-Transportation-Admin", alias="MONGODB_DATABASE")
    mongodb_collection: str = Field(default="jotform_submissions", alias="MONGODB_COLLECTION")
    flight_details_collection: str = Field(default="flight_details", alias="FLIGHT_DETAILS_COLLECTION")
    bookings_collection: str = Field(default="bookings", alias="BOOKINGS_COLLECTION")
    vehicles_collection: str = Field(default="vehicles", alias="VEHICLES_COLLECTION")
    admin_users_collection: str = Field(default="admin_users", alias="ADMIN_USERS_COLLECTION")
    sarthi_collection: str = Field(default="sarthi", alias="SARTHI_COLLECTION")
    templates_collection: str = Field(default="notification_templates", alias="TEMPLATES_COLLECTION")
    assignments_collection: str = Field(default="assignments", alias="ASSIGNMENTS_COLLECTION")

    # AeroAPI
    aero_api_key: str = Field(default="", alias="AERO_API_KEY")

    # Google OAuth
    google_client_id: str = Field(default="", alias="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(default="", alias="GOOGLE_CLIENT_SECRET")

    # Twilio SMS Configuration
    twilio_account_sid: str = Field(default="", alias="TWILIO_ACCOUNT_SID")
    twilio_auth_token: str = Field(default="", alias="TWILIO_AUTH_TOKEN")
    twilio_from_number: str = Field(default="", alias="TWILIO_FROM_NUMBER")

    # Email — SendGrid REST API (HTTPS/443, works on Render free tier)
    sendgrid_api_key: str = Field(default="", alias="SENDGRID_API_KEY")
    sendgrid_from_email: str = Field(default="", alias="SENDGRID_FROM_EMAIL")
    sendgrid_from_name: str = Field(default="Airport Transportation App", alias="SENDGRID_FROM_NAME")

    # Email / SMTP Configuration (kept for local dev fallback)
    smtp_host: str = Field(default="smtp.gmail.com", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from_name: str = Field(default="Airport Transportation App", alias="SMTP_FROM_NAME")

    # JotForm Configuration
    jotform_api_key: str = Field(..., alias="JOTFORM_API_KEY")
    jotform_form_id: str = Field(default="231615575331049", alias="JOTFORM_FORM_ID")
    jotform_webhook_secret: str = Field(..., alias="JOTFORM_WEBHOOK_SECRET")

    # FastAPI Configuration
    environment: Literal["development", "production"] = Field(
        default="development", alias="ENVIRONMENT"
    )
    debug: bool = Field(default=False, alias="DEBUG")
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO", alias="LOG_LEVEL"
    )
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")
    allowed_origins: str = Field(default="*", alias="ALLOWED_ORIGINS")

    # Security Configuration
    webhook_timeout_seconds: int = Field(default=30, alias="WEBHOOK_TIMEOUT_SECONDS")
    max_requests_per_minute: int = Field(default=100, alias="MAX_REQUESTS_PER_MINUTE")
    request_size_limit_mb: int = Field(default=10, alias="REQUEST_SIZE_LIMIT_MB")

    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    @validator("mongodb_uri")
    def validate_mongodb_uri(cls, v):
        """Validate MongoDB URI format."""
        if not v.startswith("mongodb"):
            raise ValueError("Invalid MongoDB URI: must start with 'mongodb' or 'mongodb+srv'")
        return v

    @validator("api_port")
    def validate_api_port(cls, v):
        """Validate API port is in valid range."""
        if not (1 <= v <= 65535):
            raise ValueError("API port must be between 1 and 65535")
        return v

    @validator("webhook_timeout_seconds", "max_requests_per_minute", "request_size_limit_mb")
    def validate_positive_integers(cls, v):
        """Validate positive integer values."""
        if v <= 0:
            raise ValueError("Value must be a positive integer")
        return v

    @property
    def mongodb_url(self) -> str:
        """Return MongoDB connection URL."""
        return self.mongodb_uri

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment == "production"


# Initialize global settings object
settings = Settings()
