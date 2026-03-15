from pydantic import BaseModel, HttpUrl


class AlignmentRequest(BaseModel):
    project_id: str
    audio_url: str
    lyrics: str
    language: str = "en"
    callback_url: str | None = None
    callback_secret: str | None = None


class AlignmentJobResponse(BaseModel):
    job_id: str
    status: str


class WordTimingResult(BaseModel):
    word: str
    startTime: float
    endTime: float
    confidence: float
    lineIndex: int
    wordIndex: int
