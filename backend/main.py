from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="BooksFlowAI Backend", version="0.1.0")

origins = [
    os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"]
    , allow_headers=["*"]
)


@app.get("/health")
def health():
    return {"status": "ok"}


