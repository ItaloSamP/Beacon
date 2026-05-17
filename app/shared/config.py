from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://beacon_user:beacon_pass@localhost:5432/beacon_db"
    JWT_SECRET: str = "dev-secret-change-in-production-at-least-32-chars!!"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    API_KEY_PREFIX: str = "bcn_"
    APP_VERSION: str = "0.1.0"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    REDIS_URL: str = "redis://localhost:6379/0"
    AGENT_TOKEN_PREFIX: str = "beacon_agent_"
    FERNET_KEY: str = ""
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "alerts@beacon.app"
    EMAIL_CHECK_DELIVERABILITY: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
