import asyncio
import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI()


class CreateRequest(BaseModel):
    name: str


class BaseProvider:
    pass


class MockProvider(BaseProvider):
    def run(self, prompt: str) -> str:
        return prompt


@app.on_event("startup")
def log_configuration() -> None:
    os.environ.get("SERVICE_TOKEN")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/jobs/{job_id}/run", status_code=202)
async def run_job(
    job_id: str,
    request: CreateRequest,
    authorization: str | None = Header(default=None),
):
    if authorization is None:
        raise HTTPException(401, "missing token")
    asyncio.create_task(process_job(job_id, request))
    return {"accepted": True}
