
import uuid
import logging
import sqlite3
from pathlib import Path
from functools import lru_cache
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from transformers import pipeline
from gradio_client import Client


# --------------------------------------------------
# Configuration
# --------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dreamweaver")

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent
IMAGE_DIR = PROJECT_DIR / "generated_images"
JOURNAL_DB = BACKEND_DIR / "dream_journal.db"

IMAGE_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv(BACKEND_DIR / ".env")

# Update this URL whenever your Colab session restarts.
COLAB_GRADIO_URL = "https://bba70f9035a5a3fb32.gradio.live"


# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="DreamWeaver AI",
    description=(
        "Generate dream images, analyze dream emotions, "
        "and maintain a personal dream journal."
    ),
    version="2.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/generated-images",
    StaticFiles(directory=str(IMAGE_DIR)),
    name="generated-images",
)


# --------------------------------------------------
# Request models
# --------------------------------------------------

class DreamRequest(BaseModel):
    dream: str = Field(
        min_length=5,
        max_length=3000,
        description="Describe your dream",
    )


class JournalRequest(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=150,
        description="Title of your dream",
    )
    dream: str = Field(
        min_length=5,
        max_length=3000,
        description="Dream description",
    )
    image_url: str = Field(
        default="",
        max_length=500,
        description="Generated image path returned by this API",
    )


# --------------------------------------------------
# Dream Journal database
# --------------------------------------------------

def get_journal_connection():
    connection = sqlite3.connect(str(JOURNAL_DB))
    connection.row_factory = sqlite3.Row
    return connection


def initialize_journal():
    with get_journal_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS dream_journal (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                dream TEXT NOT NULL,
                image_url TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            )
            """
        )

    logger.info("Dream Journal database initialized: %s", JOURNAL_DB)


initialize_journal()


# --------------------------------------------------
# Emotion analysis model
# --------------------------------------------------

@lru_cache(maxsize=1)
def get_emotion_model():
    logger.info("Loading pretrained emotion analysis model")

    return pipeline(
        "text-classification",
        model="j-hartmann/emotion-english-distilroberta-base",
        device=-1,
    )


# --------------------------------------------------
# Google Colab image-generation client
# --------------------------------------------------

@lru_cache(maxsize=1)
def get_colab_client():
    if (
        not COLAB_GRADIO_URL
        or ".gradio.live" not in COLAB_GRADIO_URL
    ):
        raise RuntimeError(
            "Please configure a valid Google Colab Gradio URL."
        )

    logger.info(
        "Connecting to Colab Gradio: %s",
        COLAB_GRADIO_URL,
    )

    return Client(COLAB_GRADIO_URL)


# --------------------------------------------------
# Home
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to DreamWeaver AI!",
        "status": "running",
        "version": "2.3.0",
        "features": [
            "Dream emotion analysis",
            "AI dream image generation",
            "Dream Journal",
        ],
    }


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "emotion_analysis": "available",
        "image_generation": "Google Colab Stable Diffusion Turbo",
        "dream_journal": "SQLite",
    }


# --------------------------------------------------
# Analyze dream emotions
# --------------------------------------------------

@app.post("/api/analyze-dream")
def analyze_dream(request: DreamRequest):
    dream = request.dream.strip()

    if len(dream) < 5:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please enter a dream description "
                "of at least 5 characters."
            ),
        )

    try:
        predictions = get_emotion_model()(dream, top_k=3)

        if predictions and isinstance(predictions[0], list):
            predictions = predictions[0]

    except Exception as exc:
        logger.exception("Dream emotion analysis failed")

        raise HTTPException(
            status_code=503,
            detail=(
                "The emotion model could not run. "
                "Please try again."
            ),
        ) from exc

    words = dream.split()

    return {
        "dream": dream,
        "word_count": len(words),
        "detected_emotions": [
            item["label"] for item in predictions
        ],
        "emotion_scores": [
            {
                "emotion": item["label"],
                "score": round(float(item["score"]), 4),
            }
            for item in predictions
        ],
        "story_summary": (
            "Your dream begins with: "
            + " ".join(words[:20])
        ),
        "note": (
            "Emotions are estimated by a pretrained NLP model. "
            "These predictions are creative analysis, "
            "not a psychological diagnosis."
        ),
    }


# --------------------------------------------------
# Generate dream scene using Colab Stable Diffusion
# --------------------------------------------------

@app.post("/api/generate-scene")
def generate_dream_scene(request: DreamRequest):
    dream = request.dream.strip()

    if len(dream) < 5:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please enter a dream description "
                "of at least 5 characters."
            ),
        )

    try:
        logger.info("Sending dream description to Colab")

        result = get_colab_client().predict(
            dream,
            api_name="/generate",
        )

        # Handle common Gradio image-output formats.
        if isinstance(result, (list, tuple)):
            result = result[0] if result else None

        if isinstance(result, dict):
            result = result.get("path") or result.get("name")

        if not isinstance(result, (str, Path)):
            raise ValueError(
                "Gradio did not return an image file path. "
                f"Received: {type(result).__name__}"
            )

        source_path = Path(result)

        if not source_path.is_file():
            raise FileNotFoundError(
                "The generated image file is not accessible. "
                "Check the Colab Gradio response."
            )

        from PIL import Image

        filename = f"dream_{uuid.uuid4().hex[:12]}.png"
        image_path = IMAGE_DIR / filename

        with Image.open(source_path) as generated_image:
            generated_image.convert("RGB").save(
                image_path,
                format="PNG",
            )

        logger.info("Dream image saved: %s", filename)

        return {
            "success": True,
            "dream": dream,
            "image_url": f"/generated-images/{filename}",
            "message": (
                "Your dream scene was generated successfully."
            ),
        }

    except Exception as exc:
        logger.exception("Colab dream image generation failed")

        raise HTTPException(
            status_code=503,
            detail=(
                "Dream image generation failed. Check that your "
                "Colab session and Gradio URL are active. "
                f"Error: {type(exc).__name__}: {exc}"
            ),
        ) from exc


# --------------------------------------------------
# Dream Journal: save an entry
# --------------------------------------------------

@app.post("/api/journal")
def save_journal_entry(entry: JournalRequest):
    title = entry.title.strip()
    dream = entry.dream.strip()
    image_url = entry.image_url.strip()

    if not title:
        raise HTTPException(
            status_code=400,
            detail="Please provide a dream title.",
        )

    if len(dream) < 5:
        raise HTTPException(
            status_code=400,
            detail="Dream description must be at least 5 characters.",
        )

    # Prevent arbitrary external URLs or filesystem paths.
    if image_url:
        prefix = "/generated-images/"

        if not image_url.startswith(prefix):
            raise HTTPException(
                status_code=400,
                detail="Invalid generated image path.",
            )

        filename = image_url[len(prefix):]

        # Accept only a simple filename, not nested paths.
        if (
            not filename
            or Path(filename).name != filename
            or filename in {".", ".."}
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid image filename.",
            )

        image_path = IMAGE_DIR / filename

        if not image_path.is_file():
            raise HTTPException(
                status_code=400,
                detail="The generated image file does not exist.",
            )

    created_at = datetime.now(timezone.utc).isoformat()

    try:
        with get_journal_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO dream_journal
                    (title, dream, image_url, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (title, dream, image_url, created_at),
            )

            entry_id = cursor.lastrowid

    except sqlite3.Error as exc:
        logger.exception("Could not save journal entry")

        raise HTTPException(
            status_code=500,
            detail="Could not save the dream to your journal.",
        ) from exc

    return {
        "success": True,
        "message": "Dream saved to your journal.",
        "entry": {
            "id": entry_id,
            "title": title,
            "dream": dream,
            "image_url": image_url,
            "created_at": created_at,
        },
    }


# --------------------------------------------------
# Dream Journal: list saved entries
# --------------------------------------------------

@app.get("/api/journal")
def list_journal_entries():
    try:
        with get_journal_connection() as connection:
            rows = connection.execute(
                """
                SELECT id, title, dream, image_url, created_at
                FROM dream_journal
                ORDER BY id DESC
                """
            ).fetchall()

    except sqlite3.Error as exc:
        logger.exception("Could not load journal entries")

        raise HTTPException(
            status_code=500,
            detail="Could not load the dream journal.",
        ) from exc

    return {
        "success": True,
        "count": len(rows),
        "dreams": [dict(row) for row in rows],
    }


# --------------------------------------------------
# Dream Journal: delete an entry
# --------------------------------------------------

@app.delete("/api/journal/{entry_id}")
def remove_journal_entry(entry_id: int):
    if entry_id < 1:
        raise HTTPException(
            status_code=400,
            detail="Invalid journal entry ID.",
        )

    try:
        with get_journal_connection() as connection:
            cursor = connection.execute(
                "DELETE FROM dream_journal WHERE id = ?",
                (entry_id,),
            )

            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Journal entry not found.",
                )

    except sqlite3.Error as exc:
        logger.exception("Could not delete journal entry")

        raise HTTPException(
            status_code=500,
            detail="Could not delete the journal entry.",
        ) from exc

    return {
        "success": True,
        "message": "Dream deleted from your journal.",
        "id": entry_id,
    }
