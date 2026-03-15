from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    debug: bool = False
    allowed_origins: list[str] = ["http://localhost:3000"]

    whisper_model: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

    callback_url: str = "http://localhost:3000/api/webhooks/alignment"
    callback_secret: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
