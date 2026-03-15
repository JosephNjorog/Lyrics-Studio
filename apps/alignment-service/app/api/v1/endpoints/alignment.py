import asyncio
from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.models.alignment import AlignmentRequest, AlignmentJobResponse
from app.services.alignment_service import AlignmentService
from app.services.callback_service import send_callback

router = APIRouter()
alignment_service = AlignmentService()


@router.post("", response_model=AlignmentJobResponse, status_code=202)
async def start_alignment(
    request: AlignmentRequest,
    background_tasks: BackgroundTasks,
) -> AlignmentJobResponse:
    """
    Submit a forced alignment job.
    The result is POSTed back to request.callback_url when complete.
    """
    job_id = f"{request.project_id}_{int(asyncio.get_event_loop().time() * 1000)}"

    background_tasks.add_task(
        _run_alignment,
        job_id=job_id,
        request=request,
    )

    return AlignmentJobResponse(job_id=job_id, status="accepted")


async def _run_alignment(job_id: str, request: AlignmentRequest) -> None:
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            alignment_service.align,
            request.audio_url,
            request.lyrics,
            request.language or "en",
            request.project_id,
        )
        await send_callback(
            url=request.callback_url or "",
            secret=request.callback_secret or "",
            payload={
                "projectId": request.project_id,
                "status": "completed",
                "wordTimings": result,
                "durationSeconds": result[-1]["endTime"] if result else 0,
            },
        )
    except Exception as exc:
        await send_callback(
            url=request.callback_url or "",
            secret=request.callback_secret or "",
            payload={
                "projectId": request.project_id,
                "status": "failed",
                "error": str(exc),
            },
        )
