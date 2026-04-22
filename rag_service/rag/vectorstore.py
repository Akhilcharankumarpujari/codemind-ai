"""
CodeMind RAG — FAISS Vector Store
Stores embeddings + metadata, supports similarity search, persistence, and source removal.

Index type: IndexFlatIP (exact inner-product / cosine with normalized vectors)
"""

import json
import numpy as np
import faiss
from collections import Counter
from pathlib import Path


STORE_DIR  = Path("faiss_store")
INDEX_FILE = STORE_DIR / "index.faiss"
META_FILE  = STORE_DIR / "metadata.json"
EMBS_FILE  = STORE_DIR / "embeddings.npy"


class VectorStore:
    """
    FAISS-backed vector store with full persistence and per-source removal.

    metadata format per entry:
        {
          "text":     str,   # original chunk text
          "source":   str,   # document name / filename stem
          "chunk_id": int,   # index within that document
        }
    """

    def __init__(self, dimension: int):
        self.dimension = dimension
        self.metadata: list[dict] = []
        self._embeddings: list[list[float]] = []   # mirrors FAISS index rows
        self.index = faiss.IndexFlatIP(dimension)

        # Auto-load persisted store on start
        if INDEX_FILE.exists() and META_FILE.exists():
            self._load()

    # ── Write ──────────────────────────────────────────────────────────────────

    def add(self, embeddings: np.ndarray, metadata_list: list[dict]) -> None:
        """Add a batch of embeddings and their metadata."""
        if len(embeddings) == 0:
            return
        self.index.add(embeddings.astype(np.float32))
        self.metadata.extend(metadata_list)
        self._embeddings.extend(embeddings.tolist())

    def save(self) -> None:
        """Persist FAISS index, metadata, and raw embeddings to disk."""
        STORE_DIR.mkdir(exist_ok=True)
        faiss.write_index(self.index, str(INDEX_FILE))
        with open(META_FILE, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, indent=2, ensure_ascii=False)
        if self._embeddings:
            np.save(str(EMBS_FILE), np.array(self._embeddings, dtype=np.float32))
        print(f"[VectorStore] Saved — {self.index.ntotal} vectors in {STORE_DIR}/")

    def clear(self) -> None:
        """Reset the in-memory index and metadata."""
        self.index = faiss.IndexFlatIP(self.dimension)
        self.metadata = []
        self._embeddings = []

    def remove_source(self, source: str) -> int:
        """
        Remove all chunks belonging to `source`.
        Rebuilds the FAISS index from the remaining embeddings.
        Returns the number of chunks removed (0 if source not found).
        """
        keep = [i for i, m in enumerate(self.metadata) if m["source"] != source]
        removed = len(self.metadata) - len(keep)
        if removed == 0:
            return 0

        new_meta = [self.metadata[i] for i in keep]
        new_embs = [self._embeddings[i] for i in keep]

        # Rebuild FAISS index
        self.index = faiss.IndexFlatIP(self.dimension)
        self.metadata = new_meta
        self._embeddings = new_embs

        if new_embs:
            self.index.add(np.array(new_embs, dtype=np.float32))

        self.save()
        return removed

    # ── Read ───────────────────────────────────────────────────────────────────

    def search(self, query_embedding: np.ndarray, top_k: int = 4) -> list[dict]:
        """
        Return the top_k most similar chunks.

        Args:
            query_embedding: 1-D normalized float32 array of shape (dimension,)
            top_k:           Number of results to return

        Returns:
            List of dicts: {text, source, chunk_id, score}
            Sorted by score descending (1.0 = perfect match).
        """
        if self.index.ntotal == 0:
            return []

        k = min(top_k, self.index.ntotal)
        query = query_embedding.astype(np.float32).reshape(1, -1)
        scores, indices = self.index.search(query, k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if 0 <= idx < len(self.metadata):
                results.append({**self.metadata[idx], "score": float(score)})
        return results

    # ── Info ───────────────────────────────────────────────────────────────────

    def documents_info(self) -> list[dict]:
        """Return info about each indexed document: source name and chunk count."""
        counts = Counter(m["source"] for m in self.metadata)
        return [
            {"source": src, "chunks": cnt}
            for src, cnt in sorted(counts.items())
        ]

    # ── Persistence ────────────────────────────────────────────────────────────

    def _load(self) -> None:
        """Load persisted index + metadata + embeddings from disk."""
        self.index = faiss.read_index(str(INDEX_FILE))
        with open(META_FILE, encoding="utf-8") as f:
            self.metadata = json.load(f)
        if EMBS_FILE.exists():
            self._embeddings = np.load(str(EMBS_FILE)).tolist()
        else:
            # Legacy stores without embeddings file — remove_source won't work
            # until documents are re-indexed.
            self._embeddings = [[0.0] * self.dimension] * len(self.metadata)
        print(f"[VectorStore] Loaded — {self.index.ntotal} vectors from {STORE_DIR}/")

    @property
    def total_chunks(self) -> int:
        return self.index.ntotal

    def indexed_sources(self) -> list[str]:
        """Return unique document source names currently indexed."""
        return list({m["source"] for m in self.metadata})
