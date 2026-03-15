import hashlib
import hmac
import json
from typing import Any

import httpx


async def send_callback(url: str, secret: str, payload: dict[str, Any]) -> None:
    """POST alignment result back to the Next.js webhook endpoint."""
    if not url:
        return

    body = json.dumps(payload)
    signature = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.post(
                url,
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "X-Signature": signature,
                },
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            print(f"[callback] Failed to deliver callback to {url}: {exc}")
