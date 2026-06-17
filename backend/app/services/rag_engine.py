import json
import re
import numpy as np
from typing import List, Dict, Any, Tuple
import requests
from sqlalchemy.orm import Session
from app.models.schemas import DocumentChunk, Document
from app.core.config import settings

class RAGEngine:
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
    def _tf_idf_similarity(query: str, chunks: List[DocumentChunk], top_k: int = 3) -> List[Tuple[DocumentChunk, float]]:
        """Calculates TF-IDF similarity between query and chunks in pure Python/Numpy."""
        if not chunks:
            return []
            
        query_words = RAGEngine._tokenize(query)
        if not query_words:
            return [(c, 0.0) for c in chunks[:top_k]]
            
        # Build vocabulary of chunks
        vocab = {}
        chunk_tokens_list = []
        
        for c in chunks:
            tokens = RAGEngine._tokenize(c.content)
            chunk_tokens_list.append(tokens)
            for t in tokens:
                if t not in vocab:
                    vocab[t] = len(vocab)
                    
        # Add query tokens to vocab if not present
        for t in query_words:
            if t not in vocab:
                vocab[t] = len(vocab)
                
        vocab_size = len(vocab)
        N = len(chunks)
        
        # Calculate term frequencies
        tf = np.zeros((N, vocab_size))
        for i, tokens in enumerate(chunk_tokens_list):
            for t in tokens:
                tf[i, vocab[t]] += 1
                
        # Calculate document frequencies
        df = np.zeros(vocab_size)
        for t in vocab:
            df[vocab[t]] = sum(1 for tokens in chunk_tokens_list if t in tokens)
            
        # Calculate IDF (with smoothing)
        idf = np.log((N + 1) / (df + 1)) + 1
        
        # TF-IDF matrix
        tfidf = tf * idf
        
        # Query vector
        query_tf = np.zeros(vocab_size)
        for t in query_words:
            query_tf[vocab[t]] += 1
        query_vector = query_tf * idf
        
        # Cosine similarity
        query_norm = np.linalg.norm(query_vector)
        if query_norm == 0:
            return [(c, 0.0) for c in chunks[:top_k]]
            
        chunk_norms = np.linalg.norm(tfidf, axis=1)
        similarities = []
        
        for i in range(N):
            norm = chunk_norms[i]
            if norm == 0:
                similarity = 0.0
            else:
                similarity = np.dot(tfidf[i], query_vector) / (norm * query_norm)
            similarities.append((chunks[i], float(similarity)))
            
        # Sort and return top_k
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]

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
                
        # TF-IDF Search fallback
        top_chunks = RAGEngine._tf_idf_similarity(query, all_chunks, top_k)
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
