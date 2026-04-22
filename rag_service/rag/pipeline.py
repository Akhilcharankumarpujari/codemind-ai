"""
CodeMind RAG — Pipeline Orchestrator
Ties together chunking → embedding → storage → retrieval in one clean API.

Usage:
    pipeline = RAGPipeline()
    pipeline.index_document(text, source="javascript")
    results = pipeline.retrieve("how does async/await work?", top_k=4)
    context  = pipeline.build_context("how does async/await work?")
"""

from .chunker import chunk_text
from .embedder import Embedder
from .vectorstore import VectorStore


class RAGPipeline:
    """Full RAG pipeline: index documents → retrieve relevant chunks."""

    def __init__(self):
        self.embedder = Embedder()
        self.store = VectorStore(self.embedder.dimension)

    # ── Indexing ───────────────────────────────────────────────────────────────

    def index_document(self, text: str, source: str = "unknown") -> int:
        """
        Chunk, embed, and store a document.

        Flow:
          raw text
            → chunk_text()       # split into overlapping ~500-char chunks
            → embedder.embed()   # all-MiniLM-L6-v2 (384-dim, normalised)
            → store.add()        # FAISS IndexFlatIP
            → store.save()       # persist to disk

        Args:
            text:   Full document text content
            source: Friendly name used in retrieval results (e.g. "javascript")

        Returns:
            Number of chunks indexed
        """
        chunks = chunk_text(text)
        if not chunks:
            return 0

        embeddings = self.embedder.embed(chunks)
        metadata = [
            {"text": chunk, "source": source, "chunk_id": i}
            for i, chunk in enumerate(chunks)
        ]
        self.store.add(embeddings, metadata)
        self.store.save()
        return len(chunks)

    # ── Retrieval ──────────────────────────────────────────────────────────────

    def retrieve(self, query: str, top_k: int = 4) -> list[dict]:
        """
        Retrieve the most relevant document chunks for a query.

        Flow:
          query string
            → embedder.embed_one()   # embed the query
            → store.search()         # cosine similarity via FAISS inner-product
            → top_k results sorted by score descending

        Args:
            query: User's question / search string
            top_k: Maximum number of chunks to return

        Returns:
            List of {text, source, chunk_id, score} dicts
        """
        if self.store.total_chunks == 0:
            return []

        query_vec = self.embedder.embed_one(query)
        return self.store.search(query_vec, top_k=top_k)

    def build_context(self, query: str, top_k: int = 4) -> str:
        """
        Retrieve chunks and format them as a readable context block
        ready to be injected into the LLM system prompt.

        Example output:
            [Source: javascript | Score: 0.91]
            Use const/let not var. Prefer async/await...

            [Source: python | Score: 0.74]
            Follow PEP 8. Use type hints...
        """
        results = self.retrieve(query, top_k=top_k)
        if not results:
            return ""

        parts = []
        for r in results:
            parts.append(
                f"[Source: {r['source']} | Score: {r['score']:.2f}]\n{r['text']}"
            )
        return "\n\n".join(parts)

    # ── Info ───────────────────────────────────────────────────────────────────

    @property
    def stats(self) -> dict:
        return {
            "total_chunks": self.store.total_chunks,
            "indexed_sources": self.store.indexed_sources(),
            "embedding_model": "all-MiniLM-L6-v2",
            "embedding_dim": self.embedder.dimension,
        }
