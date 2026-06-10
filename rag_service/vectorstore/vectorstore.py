import os
import json
import numpy as np
import faiss
from collections import Counter
from pathlib import Path
from abc import ABC, abstractmethod

STORE_DIR  = Path("faiss_store")
INDEX_FILE = STORE_DIR / "index.faiss"
META_FILE  = STORE_DIR / "metadata.json"
EMBS_FILE  = STORE_DIR / "embeddings.npy"

class VectorStoreAdapter(ABC):
    @abstractmethod
    def add(self, embeddings: np.ndarray, metadata_list: list[dict]) -> None:
        pass

    @abstractmethod
    def save(self) -> None:
        pass

    @abstractmethod
    def clear(self) -> None:
        pass

    @abstractmethod
    def remove_source(self, source: str) -> int:
        pass

    @abstractmethod
    def search(self, query_embedding: np.ndarray, top_k: int = 4) -> list[dict]:
        pass

    @abstractmethod
    def documents_info(self) -> list[dict]:
        pass

    @abstractmethod
    def indexed_sources(self) -> list[str]:
        pass

    @property
    @abstractmethod
    def total_chunks(self) -> int:
        pass


class FAISSVectorStore(VectorStoreAdapter):
    def __init__(self, dimension: int):
        self.dimension = dimension
        self.metadata: list[dict] = []
        self._embeddings: list[list[float]] = []
        self.index = faiss.IndexFlatIP(dimension)

        if INDEX_FILE.exists() and META_FILE.exists():
            self._load()

    def add(self, embeddings: np.ndarray, metadata_list: list[dict]) -> None:
        if len(embeddings) == 0:
            return
        self.index.add(embeddings.astype(np.float32))
        self.metadata.extend(metadata_list)
        self._embeddings.extend(embeddings.tolist())

    def save(self) -> None:
        STORE_DIR.mkdir(exist_ok=True)
        faiss.write_index(self.index, str(INDEX_FILE))
        with open(META_FILE, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, indent=2, ensure_ascii=False)
        if self._embeddings:
            np.save(str(EMBS_FILE), np.array(self._embeddings, dtype=np.float32))
        print(f"[FAISSVectorStore] Saved — {self.index.ntotal} vectors in {STORE_DIR}/")

    def clear(self) -> None:
        self.index = faiss.IndexFlatIP(self.dimension)
        self.metadata = []
        self._embeddings = []

    def remove_source(self, source: str) -> int:
        keep = [i for i, m in enumerate(self.metadata) if m["source"] != source]
        removed = len(self.metadata) - len(keep)
        if removed == 0:
            return 0

        new_meta = [self.metadata[i] for i in keep]
        new_embs = [self._embeddings[i] for i in keep]

        self.index = faiss.IndexFlatIP(self.dimension)
        self.metadata = new_meta
        self._embeddings = new_embs

        if new_embs:
            self.index.add(np.array(new_embs, dtype=np.float32))

        self.save()
        return removed

    def search(self, query_embedding: np.ndarray, top_k: int = 4) -> list[dict]:
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

    def documents_info(self) -> list[dict]:
        counts = Counter(m["source"] for m in self.metadata)
        return [
            {"source": src, "chunks": cnt}
            for src, cnt in sorted(counts.items())
        ]

    def _load(self) -> None:
        self.index = faiss.read_index(str(INDEX_FILE))
        with open(META_FILE, encoding="utf-8") as f:
            self.metadata = json.load(f)
        if EMBS_FILE.exists():
            self._embeddings = np.load(str(EMBS_FILE)).tolist()
        else:
            self._embeddings = [[0.0] * self.dimension] * len(self.metadata)
        print(f"[FAISSVectorStore] Loaded — {self.index.ntotal} vectors from {STORE_DIR}/")

    @property
    def total_chunks(self) -> int:
        return self.index.ntotal

    def indexed_sources(self) -> list[str]:
        return list({m["source"] for m in self.metadata})


class PineconeVectorStore(VectorStoreAdapter):
    def __init__(self, dimension: int):
        self.dimension = dimension
        self.api_key = os.environ.get("PINECONE_API_KEY")
        self.index_name = os.environ.get("PINECONE_INDEX_NAME", "codemind-knowledge")
        if not self.api_key:
            print("[PineconeVectorStore] WARNING: PINECONE_API_KEY is not defined. Cloud vector database won't initialize properly.")

    def add(self, embeddings: np.ndarray, metadata_list: list[dict]) -> None:
        raise NotImplementedError("Pinecone Cloud Upsert is not active. Please supply your Pinecone keys and configure connection settings.")

    def save(self) -> None:
        pass

    def clear(self) -> None:
        raise NotImplementedError("Pinecone Cloud DeleteAll is not active.")

    def remove_source(self, source: str) -> int:
        raise NotImplementedError("Pinecone Cloud DeleteBySource is not active.")

    def search(self, query_embedding: np.ndarray, top_k: int = 4) -> list[dict]:
        raise NotImplementedError("Pinecone Cloud Query is not active.")

    def documents_info(self) -> list[dict]:
        return []

    def indexed_sources(self) -> list[str]:
        return []

    @property
    def total_chunks(self) -> int:
        return 0


class VectorStore(VectorStoreAdapter):
    def __init__(self, dimension: int):
        self.store_type = os.environ.get("VECTOR_STORE_TYPE", "faiss").lower()
        if self.store_type == "pinecone":
            print(f"[VectorStore] Initializing Pinecone Cloud Vector Store (dimension: {dimension})")
            self._adapter = PineconeVectorStore(dimension)
        else:
            print(f"[VectorStore] Initializing Local FAISS Vector Store (dimension: {dimension})")
            self._adapter = FAISSVectorStore(dimension)

    def add(self, embeddings: np.ndarray, metadata_list: list[dict]) -> None:
        self._adapter.add(embeddings, metadata_list)

    def save(self) -> None:
        self._adapter.save()

    def clear(self) -> None:
        self._adapter.clear()

    def remove_source(self, source: str) -> int:
        return self._adapter.remove_source(source)

    def search(self, query_embedding: np.ndarray, top_k: int = 4) -> list[dict]:
        return self._adapter.search(query_embedding, top_k)

    def documents_info(self) -> list[dict]:
        return self._adapter.documents_info()

    def indexed_sources(self) -> list[str]:
        return self._adapter.indexed_sources()

    @property
    def total_chunks(self) -> int:
        return self._adapter.total_chunks
