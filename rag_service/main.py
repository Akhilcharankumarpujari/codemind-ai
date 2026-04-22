"""
CodeMind RAG — FastAPI Microservice
Runs on http://localhost:8000

Endpoints:
  GET    /status             Health check + store stats
  POST   /retrieve           Retrieve top-k chunks for a query
  POST   /index              Index new document text
  POST   /index/file         Upload & index a PDF or TXT file
  GET    /documents          List all indexed documents
  DELETE /documents/{source} Remove a document from the store
  DELETE /clear              Wipe the entire vector store

The Node.js backend calls /retrieve before each Groq request,
then injects the returned context into the system prompt.
"""

import io
from contextlib import asynccontextmanager
from pathlib import Path

import pdfplumber
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag.pipeline import RAGPipeline

# ── Global pipeline instance ───────────────────────────────────────────────────
pipeline: RAGPipeline | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize pipeline and auto-index docs/ folder on startup."""
    global pipeline
    pipeline = RAGPipeline()

    docs_dir = Path("docs")
    if docs_dir.exists():
        print("\n[RAG] Auto-indexing docs/ folder...")
        for doc_file in sorted(docs_dir.glob("*.txt")):
            source = doc_file.stem
            if source in pipeline.store.indexed_sources():
                print(f"  >> '{source}' already indexed, skipping.")
                continue
            content = doc_file.read_text(encoding="utf-8")
            n = pipeline.index_document(content, source=source)
            print(f"  >> '{source}' -> {n} chunks indexed")

    print(f"\n[OK] RAG service ready - {pipeline.stats['total_chunks']} total chunks\n")
    yield  # server runs here


# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(title="CodeMind RAG Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5500", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ──────────────────────────────────────────────────
class RetrieveRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    top_k: int = Field(default=4, ge=1, le=10)


class IndexRequest(BaseModel):
    text: str = Field(..., min_length=10)
    source: str = Field(default="user_upload", max_length=100)


class RetrieveResult(BaseModel):
    text: str
    source: str
    chunk_id: int
    score: float


class RetrieveResponse(BaseModel):
    results: list[RetrieveResult]
    context: str          # formatted context string ready to inject into prompt
    total_chunks_searched: int


# ── Helpers ────────────────────────────────────────────────────────────────────

def extract_pdf_text(data: bytes) -> str:
    """Extract all text from a PDF byte stream using pdfplumber."""
    text_parts = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text.strip())
    return "\n\n".join(text_parts)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/status")
def status():
    """Health check — returns store stats."""
    return {"status": "ok", "rag": pipeline.stats}


@app.post("/retrieve", response_model=RetrieveResponse)
def retrieve(req: RetrieveRequest):
    """
    Core retrieval endpoint.

    Flow:
      1. Embed the query (all-MiniLM-L6-v2)
      2. Cosine similarity search in FAISS
      3. Return top-k chunks + pre-formatted context string

    Called by the Node.js backend before every Groq request.
    """
    if pipeline.store.total_chunks == 0:
        return RetrieveResponse(results=[], context="", total_chunks_searched=0)

    results = pipeline.retrieve(req.query, top_k=req.top_k)
    context = pipeline.build_context(req.query, top_k=req.top_k)

    return RetrieveResponse(
        results=[RetrieveResult(**r) for r in results],
        context=context,
        total_chunks_searched=pipeline.store.total_chunks,
    )


@app.post("/index")
def index_document(req: IndexRequest):
    """Index a new text document into the vector store."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    n = pipeline.index_document(req.text.strip(), source=req.source)
    return {
        "indexed_chunks": n,
        "source": req.source,
        "total_chunks": pipeline.stats["total_chunks"],
    }


@app.post("/index/file")
async def index_file(file: UploadFile = File(...)):
    """
    Upload and index a .txt or .pdf file.

    - TXT: decoded as UTF-8 and indexed directly.
    - PDF: text extracted with pdfplumber, then indexed.
    """
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()

    if ext not in (".txt", ".pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Only .txt and .pdf are accepted."
        )

    raw = await file.read()
    source = Path(filename).stem

    # ── Extract text ────────────────────────────────────────────────────────
    if ext == ".pdf":
        try:
            text = extract_pdf_text(raw)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"PDF extraction failed: {e}")
    else:
        text = raw.decode("utf-8", errors="ignore")

    if not text.strip():
        raise HTTPException(status_code=422, detail="No text could be extracted from the file.")

    n = pipeline.index_document(text, source=source)
    return {
        "indexed_chunks": n,
        "source": source,
        "file_type": ext.lstrip("."),
        "total_chunks": pipeline.stats["total_chunks"],
    }


@app.get("/documents")
def list_documents():
    """List all indexed documents with chunk counts."""
    docs = pipeline.store.documents_info()
    return {
        "documents": docs,
        "total_documents": len(docs),
        "total_chunks": pipeline.store.total_chunks,
    }


@app.delete("/documents/{source}")
def delete_document(source: str):
    """Remove all chunks for a given document source from the vector store."""
    removed = pipeline.store.remove_source(source)
    if removed == 0:
        raise HTTPException(
            status_code=404,
            detail=f"No document with source '{source}' found in the store."
        )
    return {
        "message": f"Removed '{source}' ({removed} chunks deleted).",
        "removed_chunks": removed,
        "total_chunks": pipeline.store.total_chunks,
    }


@app.delete("/clear")
def clear_store():
    """Wipe the entire vector store (in-memory + disk)."""
    pipeline.store.clear()
    import shutil
    if Path("faiss_store").exists():
        shutil.rmtree("faiss_store")
    return {"message": "Vector store cleared.", "total_chunks": 0}
