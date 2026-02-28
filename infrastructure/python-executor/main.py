import asyncio
import os
import time
import uuid
from collections import defaultdict
from contextlib import asynccontextmanager
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(cleanup_loop())
    yield

app = FastAPI(lifespan=lifespan)

EXECUTOR_API_KEY = os.environ["EXECUTOR_API_KEY"]
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT", "4"))
MAX_QUEUE_PER_USER = int(os.getenv("MAX_QUEUE_PER_USER", "2"))
RESULT_TTL_SECONDS = 300  # clean up results older than 5 minutes

semaphore = asyncio.Semaphore(MAX_CONCURRENT)
# token -> { status_id, description, stdout, stderr, time, created_at }
results: dict[str, dict] = {}
# user_id -> number of submissions currently queued or running
user_depth: dict[str, int] = defaultdict(int)


# ─── Auth ────────────────────────────────────────────────────────────────────

def check_auth(x_api_key: str | None):
    if x_api_key != EXECUTOR_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ─── Models ──────────────────────────────────────────────────────────────────

class SubmissionRequest(BaseModel):
    source_code: str
    language_id: int = 71  # ignored — always Python 3
    stdin: str = ""
    cpu_time_limit: float = 10.0


# ─── Execution ───────────────────────────────────────────────────────────────

async def run_python(code: str, stdin: str, time_limit: float) -> dict:
    """Execute Python code in a subprocess. Returns result dict."""
    start = time.monotonic()
    try:
        proc = await asyncio.create_subprocess_exec(
            "python3", "-c", code,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdin_bytes = stdin.encode() if stdin else b""
        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(stdin_bytes),
                timeout=time_limit,
            )
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except ProcessLookupError:
                pass
            return {
                "status": {"id": 5, "description": "Time Limit Exceeded"},
                "stdout": None,
                "stderr": None,
                "time": str(round(time_limit, 3)),
                "memory": None,
            }

        elapsed = round(time.monotonic() - start, 3)
        stdout = stdout_bytes.decode(errors="replace") or None
        stderr = stderr_bytes.decode(errors="replace") or None

        if proc.returncode == 0:
            return {
                "status": {"id": 3, "description": "Accepted"},
                "stdout": stdout,
                "stderr": stderr,
                "time": str(elapsed),
                "memory": None,
            }
        else:
            return {
                "status": {"id": 11, "description": "Runtime Error (NZEC)"},
                "stdout": stdout,
                "stderr": stderr,
                "time": str(elapsed),
                "memory": None,
            }
    except Exception as e:
        return {
            "status": {"id": 13, "description": "Internal Error"},
            "stdout": None,
            "stderr": str(e),
            "time": None,
            "memory": None,
        }


async def process_submission(token: str, code: str, stdin: str, time_limit: float, user_id: str):
    """Acquire semaphore, run, store result, decrement user depth."""
    try:
        async with semaphore:
            results[token]["status"] = {"id": 2, "description": "Processing"}
            result = await run_python(code, stdin, time_limit)
            results[token].update(result)
    finally:
        user_depth[user_id] = max(0, user_depth[user_id] - 1)


# ─── Cleanup ─────────────────────────────────────────────────────────────────

async def cleanup_loop():
    while True:
        await asyncio.sleep(60)
        try:
            cutoff = time.time() - RESULT_TTL_SECONDS
            expired = [t for t, r in results.items() if r.get("created_at", 0) < cutoff]
            for t in expired:
                results.pop(t, None)
        except Exception:
            pass  # never let cleanup crash stop the loop


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.post("/submissions")
async def submit(
    body: SubmissionRequest,
    x_api_key: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
):
    check_auth(x_api_key)
    user_id = x_user_id or "anonymous"

    if user_depth[user_id] >= MAX_QUEUE_PER_USER:
        raise HTTPException(
            status_code=429,
            detail=f"Too many concurrent submissions. Max {MAX_QUEUE_PER_USER} per user.",
        )

    token = str(uuid.uuid4())
    results[token] = {
        "status": {"id": 1, "description": "In Queue"},
        "stdout": None,
        "stderr": None,
        "time": None,
        "memory": None,
        "created_at": time.time(),
    }
    user_depth[user_id] += 1
    asyncio.create_task(process_submission(token, body.source_code, body.stdin, body.cpu_time_limit, user_id))
    return {"token": token}


@app.get("/submissions/{token}")
async def get_submission(
    token: str,
    x_api_key: str | None = Header(default=None),
):
    check_auth(x_api_key)
    result = results.get(token)
    if result is None:
        raise HTTPException(status_code=404, detail="Token not found")
    return result


@app.get("/health")
async def health():
    return {"ok": True, "slots_available": semaphore._value, "results_cached": len(results)}
