import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_alignment_requires_audio_url(client: AsyncClient) -> None:
    """Alignment endpoint should return 422 if required fields are missing."""
    response = await client.post("/api/v1/alignment", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_alignment_accepts_valid_payload(client: AsyncClient) -> None:
    """Alignment endpoint should return 202 Accepted for valid payload."""
    response = await client.post(
        "/api/v1/alignment",
        json={
            "project_id": "test-project-001",
            "audio_url": "https://example.com/audio.mp3",
            "lyrics": "Hello world\nThis is a test",
            "language": "en",
        },
    )
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "accepted"
    assert "job_id" in data
