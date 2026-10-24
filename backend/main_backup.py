
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="DreamWeaver AI",
    description="Turn dream descriptions into creative dream experiences",
    version="1.0.0"
)

# Allow the local React frontend to connect later
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class DreamRequest(BaseModel):
    dream: str = Field(
        min_length=5,
        max_length=3000,
        description="Describe your dream"
    )


@app.get("/")
def home():
    return {
        "message": "Welcome to DreamWeaver AI!",
        "status": "running"
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


@app.post("/api/analyze-dream")
def analyze_dream(request: DreamRequest):
    dream = request.dream.strip()

    if not dream:
        raise HTTPException(
            status_code=400,
            detail="Please enter your dream description."
        )

    words = dream.split()

    emotions = {
        "happy": ["happy", "joy", "excited", "love", "laugh"],
        "fearful": ["fear", "scared", "afraid", "nightmare"],
        "peaceful": ["peaceful", "calm", "quiet", "relaxed"],
        "sad": ["sad", "cry", "lonely", "lost"]
    }

    detected_emotions = []

    for emotion, keywords in emotions.items():
        if any(word in dream.lower() for word in keywords):
            detected_emotions.append(emotion)

    if not detected_emotions:
        detected_emotions.append("unclear")

    return {
        "dream": dream,
        "word_count": len(words),
        "detected_emotions": detected_emotions,
        "story_summary": (
            "Your dream begins with: " + " ".join(words[:20])
        ),
        "note": (
            "This is a simple keyword-based demo, "
            "not a psychological interpretation."
        )
    }
