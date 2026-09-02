import json
import re
import numpy as np
from typing import List, Dict, Any, Tuple
import requests
from sqlalchemy.orm import Session
from app.models.schemas import DocumentChunk, Document
from app.core.config import settings

class RAGEngine:
    # Class-level cache for high-performance local TF-IDF search
    _cache_chunks = None
    _cache_vocab = None
    _cache_tfidf = None
    _cache_idf = None
    _cache_chunk_norms = None

    @staticmethod
    def get_embedding(text: str, provider: str = None, api_key: str = None) -> List[float]:
        """Calculates vector embedding for the text using API or returns empty if local."""
        provider = provider or settings.EMBEDDING_PROVIDER
        key = api_key or settings.GEMINI_API_KEY or settings.OPENAI_API_KEY
        
        if provider == "gemini" and key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={key}"
                headers = {"Content-Type": "application/json"}
                payload = {
                    "model": "models/text-embedding-004",
                    "content": {"parts": [{"text": text}]}
                }
                response = requests.post(url, headers=headers, json=payload, timeout=10)
                if response.status_code == 200:
                    return response.json()["embedding"]["values"]
            except Exception:
                pass
                
        elif provider == "openai" and key:
            try:
                url = "https://api.openai.com/v1/embeddings"
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {key}"
                }
                payload = {
                    "input": text,
                    "model": "text-embedding-3-small"
                }
                response = requests.post(url, headers=headers, json=payload, timeout=10)
                if response.status_code == 200:
                    return response.json()["data"][0]["embedding"]
            except Exception:
                pass
                
        # Return empty list if local TF-IDF is used
        return []

    @staticmethod
    def index_document(db: Session, document_id: int, text_chunks: List[str], provider: str = None, api_key: str = None):
        """Indexes text chunks of a document into the database."""
        for idx, chunk in enumerate(text_chunks):
            vector = RAGEngine.get_embedding(chunk, provider, api_key)
            vector_json = json.dumps(vector) if vector else None
            
            db_chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=idx,
                content=chunk,
                vector_json=vector_json
            )
            db.add(db_chunk)
        db.commit()

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Simple tokenizer for TF-IDF."""
        # Convert to lowercase and find words
        text = text.lower()
        # Handle Korean/Lao/English characters basic split
        words = re.findall(r'[a-zA-Z0-9\uac00-\ud7a3\u0e80-\u0eff]+', text)
        return words

    @staticmethod
    def _tf_idf_similarity(query: str, chunks: List[DocumentChunk], top_k: int = 3) -> List[Tuple[dict, float]]:
        """Calculates TF-IDF similarity. Caches plain dicts (not ORM objects) to avoid detached-session errors."""
        if not chunks:
            return []

        query_words = RAGEngine._tokenize(query)

        # Snapshot ORM objects into plain dicts immediately (session-safe)
        chunk_dicts = [
            {"id": c.id, "content": c.content,
             "document_id": c.document_id, "chunk_index": c.chunk_index}
            for c in chunks
        ]

        if not query_words:
            return [(d, 0.0) for d in chunk_dicts[:top_k]]

        N = len(chunk_dicts)

        # Cache validity check using plain dict data
        if (RAGEngine._cache_chunks is None or
                len(RAGEngine._cache_chunks) != N or
                RAGEngine._cache_chunks[0]["id"] != chunk_dicts[0]["id"] or
                RAGEngine._cache_chunks[-1]["id"] != chunk_dicts[-1]["id"]):

            print(f"[RAGEngine] Rebuilding TF-IDF cache for {N} chunks...")
            vocab: dict = {}
            chunk_tokens_list = []

            for d in chunk_dicts:
                tokens = RAGEngine._tokenize(d["content"])
                chunk_tokens_list.append(tokens)
                for t in tokens:
                    if t not in vocab:
                        vocab[t] = len(vocab)

            vocab_size = len(vocab)
            tf = np.zeros((N, vocab_size))
            for i, tokens in enumerate(chunk_tokens_list):
                for t in tokens:
                    tf[i, vocab[t]] += 1

            df = np.sum(tf > 0, axis=0)
            idf = np.log((N + 1) / (df + 1)) + 1
            tfidf = tf * idf
            chunk_norms = np.linalg.norm(tfidf, axis=1)

            # Cache plain dicts — never ORM objects
            RAGEngine._cache_chunks = chunk_dicts
            RAGEngine._cache_vocab = vocab
            RAGEngine._cache_tfidf = tfidf
            RAGEngine._cache_idf = idf
            RAGEngine._cache_chunk_norms = chunk_norms
            print(f"[RAGEngine] TF-IDF cache rebuilt. Vocab size: {vocab_size}")

        vocab = RAGEngine._cache_vocab
        tfidf = RAGEngine._cache_tfidf
        idf = RAGEngine._cache_idf
        chunk_norms = RAGEngine._cache_chunk_norms
        vocab_size = len(vocab)

        query_tf = np.zeros(vocab_size)
        for t in query_words:
            if t in vocab:
                query_tf[vocab[t]] += 1
        query_vector = query_tf * idf

        query_norm = np.linalg.norm(query_vector)
        if query_norm == 0:
            return [(d, 0.0) for d in RAGEngine._cache_chunks[:top_k]]

        similarities_scores = np.dot(tfidf, query_vector) / (chunk_norms * query_norm + 1e-9)

        results = [(RAGEngine._cache_chunks[i], float(similarities_scores[i])) for i in range(N)]
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    @staticmethod
    def search(db: Session, query: str, top_k: int = 3, provider: str = None, api_key: str = None) -> List[Dict[str, Any]]:
        """Searches documents using Vector Cosine Similarity or TF-IDF fallback."""
        provider = provider or settings.EMBEDDING_PROVIDER
        key = api_key or settings.GEMINI_API_KEY or settings.OPENAI_API_KEY
        
        query_vector = RAGEngine.get_embedding(query, provider, api_key)
        
        # Load all chunks
        all_chunks = db.query(DocumentChunk).all()
        if not all_chunks:
            return []
            
        results = []
        
        # If query vector is computed and database has vector mappings, do Vector Search
        if query_vector and all_chunks and all_chunks[0].vector_json:
            try:
                q_vec = np.array(query_vector)
                q_norm = np.linalg.norm(q_vec)
                
                similarities = []
                for chunk in all_chunks:
                    if not chunk.vector_json:
                        continue
                    c_vec = np.array(json.loads(chunk.vector_json))
                    if len(c_vec) != len(q_vec):
                        continue
                    c_norm = np.linalg.norm(c_vec)
                    
                    if c_norm == 0 or q_norm == 0:
                        sim = 0.0
                    else:
                        sim = np.dot(c_vec, q_vec) / (c_norm * q_norm)
                        
                    similarities.append((chunk, float(sim)))
                    
                similarities.sort(key=lambda x: x[1], reverse=True)
                top_chunks = similarities[:top_k]
                
                for chunk, sim in top_chunks:
                    doc = db.query(Document).filter(Document.id == chunk.document_id).first()
                    results.append({
                        "document_id": chunk.document_id,
                        "document_name": doc.name if doc else "Unknown",
                        "chunk_index": chunk.chunk_index,
                        "content": chunk.content,
                        "score": round(sim, 4)
                    })
                return results
            except Exception:
                # Fallback to TF-IDF if vector comparison fails
                pass
                
        # TF-IDF Search fallback — top_chunks is List[Tuple[dict, float]]
        top_chunks = RAGEngine._tf_idf_similarity(query, all_chunks, top_k)
        for chunk_dict, sim in top_chunks:
            doc = db.query(Document).filter(Document.id == chunk_dict["document_id"]).first()
            results.append({
                "document_id": chunk_dict["document_id"],
                "document_name": doc.name if doc else "Unknown",
                "chunk_index": chunk_dict["chunk_index"],
                "content": chunk_dict["content"],
                "score": round(sim, 4)
            })
            
        return results
