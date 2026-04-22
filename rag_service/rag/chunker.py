"""
CodeMind RAG — Document Chunker
Splits large documents into overlapping chunks for embedding.
"""


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 80) -> list[str]:
    """
    Split text into overlapping chunks of ~chunk_size characters.

    Strategy:
      1. Split into words
      2. Accumulate words until chunk_size is reached
      3. Step back `overlap` characters worth of words for the next chunk
         so adjacent chunks share context

    Args:
        text:       Raw document text
        chunk_size: Target characters per chunk (default 500)
        overlap:    Overlap characters between consecutive chunks (default 80)

    Returns:
        List of non-empty string chunks
    """
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    start = 0

    while start < len(words):
        end = start
        current_len = 0

        # Accumulate words until we reach chunk_size
        while end < len(words) and current_len + len(words[end]) + 1 <= chunk_size:
            current_len += len(words[end]) + 1
            end += 1

        # If no words were added (single word longer than chunk_size), take one word
        if end == start:
            end = start + 1

        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)

        # Compute how many words equal `overlap` characters
        # then step back that many words so chunks share context
        overlap_words = 0
        overlap_chars = 0
        for w in reversed(words[start:end]):
            if overlap_chars + len(w) + 1 > overlap:
                break
            overlap_chars += len(w) + 1
            overlap_words += 1

        next_start = end - overlap_words
        # Guard against infinite loop: always advance at least 1 word
        start = next_start if next_start > start else end

    return chunks
