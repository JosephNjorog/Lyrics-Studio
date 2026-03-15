import re
import tempfile
import urllib.request
from pathlib import Path
from typing import Any

import whisperx  # type: ignore[import]

from app.config import settings


class AlignmentService:
    def __init__(self) -> None:
        self._model: Any = None

    def _load_model(self) -> Any:
        if self._model is None:
            self._model = whisperx.load_model(
                settings.whisper_model,
                device=settings.whisper_device,
                compute_type=settings.whisper_compute_type,
            )
        return self._model

    def align(
        self,
        audio_url: str,
        lyrics: str,
        language: str,
        project_id: str,
    ) -> list[dict[str, Any]]:
        """
        Download audio, run WhisperX forced alignment, and return
        a list of word timing dicts matching the WordTiming TypeScript type.
        """
        # Download audio to temp file
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp_path = Path(tmp.name)
        urllib.request.urlretrieve(audio_url, tmp_path)  # noqa: S310

        try:
            model = self._load_model()

            # Transcribe (needed to get segments for alignment)
            audio = whisperx.load_audio(str(tmp_path))
            result = model.transcribe(audio, language=language)

            # Load alignment model
            align_model, metadata = whisperx.load_align_model(
                language_code=language,
                device=settings.whisper_device,
            )

            # Force-align against our known lyrics
            # WhisperX expects segments; we construct them from lyrics lines
            lyric_lines = [l.strip() for l in lyrics.splitlines() if l.strip()]
            segments = [{"text": line, "start": 0.0, "end": 999.0} for line in lyric_lines]

            aligned = whisperx.align(
                segments,
                align_model,
                metadata,
                audio,
                settings.whisper_device,
                return_char_alignments=False,
            )

            return self._extract_word_timings(aligned, lyric_lines)
        finally:
            tmp_path.unlink(missing_ok=True)

    @staticmethod
    def _extract_word_timings(
        aligned: dict[str, Any],
        lyric_lines: list[str],
    ) -> list[dict[str, Any]]:
        """
        Convert WhisperX output into our WordTiming schema.
        Map each word back to its line/word index in the original lyrics.
        """
        # Build a flat word→(lineIdx, wordIdx) lookup
        word_positions: list[tuple[int, int]] = []
        for line_idx, line in enumerate(lyric_lines):
            for word_idx, _ in enumerate(line.split()):
                word_positions.append((line_idx, word_idx))

        timings: list[dict[str, Any]] = []
        flat_idx = 0

        for segment in aligned.get("segments", []):
            for word_info in segment.get("words", []):
                if flat_idx >= len(word_positions):
                    break

                line_idx, word_idx = word_positions[flat_idx]
                flat_idx += 1

                timings.append(
                    {
                        "word": re.sub(r"[^\w\s'-]", "", word_info.get("word", "")).strip(),
                        "startTime": round(word_info.get("start", 0.0), 3),
                        "endTime": round(word_info.get("end", 0.0), 3),
                        "confidence": round(word_info.get("score", 0.9), 3),
                        "lineIndex": line_idx,
                        "wordIndex": word_idx,
                    }
                )

        return timings
