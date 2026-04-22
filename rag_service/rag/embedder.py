"""
CodeMind RAG — Embedding Generator
Uses sentence-transformers/all-MiniLM-L6-v2:
  - 384-dimensional vectors
  - Fast (CPU-friendly)
  - Excellent for semantic similarity search
"""

import numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"


class Embedder:
    """Singleton-style embedding wrapper around SentenceTransformer."""

    def __init__(self):
        print(f"[Embedder] Loading model: {MODEL_NAME} ...")
        self.model = SentenceTransformer(MODEL_NAME)
        print(f"[Embedder] Ready — dim={self.dimension}")

    def embed(self, texts: list[str]) -> np.ndarray:
        """
        Generate L2-normalized embeddings for a batch of texts.

        Normalization is required so that inner-product == cosine similarity,
        which is what FAISS IndexFlatIP computes.

        Returns:
            np.ndarray of shape (len(texts), 384), dtype float32
        """
        return self.model.encode(
            texts,
            normalize_embeddings=True,  # L2 normalize → cosine via dot product
            batch_size=32,
            show_progress_bar=False,
            convert_to_numpy=True,
        ).astype(np.float32)

    def embed_one(self, text: str) -> np.ndarray:
        """Generate a single normalized embedding vector."""
        return self.embed([text])[0]

    @property
    def dimension(self) -> int:
        """Dimensionality of the embedding vectors (384 for MiniLM-L6)."""
        return self.model.get_sentence_embedding_dimension()
