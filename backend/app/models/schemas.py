from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float
from datetime import datetime
from app.core.database import Base

class Glossary(Base):
    __tablename__ = "glossary"

    id = Column(Integer, primary_key=True, index=True)
    word_ko = Column(String, index=True, nullable=False)
    word_lo_common = Column(String, nullable=True)
    word_lo_religious = Column(String, nullable=True)
    word_lo_royal = Column(String, nullable=True)
    explanation_christian = Column(Text, nullable=True)
    explanation_buddhist = Column(Text, nullable=True)
    missionary_notes = Column(Text, nullable=True)
    frequency = Column(String, default="Medium")  # High, Medium, Low
    source = Column(String, nullable=True)
    category = Column(String, default="General")  # e.g., Grace, Salvation, Sin, Karma

class TranslationHistory(Base):
    __tablename__ = "translation_history"

    id = Column(Integer, primary_key=True, index=True)
    source_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=False)
    source_lang = Column(String, nullable=False)  # ko, lo, lo_religious, lo_royal, etc.
    target_lang = Column(String, nullable=False)
    direction = Column(String, nullable=False) # e.g., "ko_to_lo_religious"
    confidence = Column(Integer, default=90) # percentage
    reviewer_stage = Column(String, default="ai")  # ai, local_reviewer, missionary_reviewer, approved
    reviewer_notes = Column(Text, nullable=True)
    approved = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    category = Column(String, default="General") # general, sermon, bible

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    summary = Column(Text, nullable=True)
    theological_meaning = Column(Text, nullable=True)
    key_concepts = Column(Text, nullable=True)
    historical_context = Column(Text, nullable=True)
    people = Column(Text, nullable=True)
    places = Column(Text, nullable=True)
    db_status = Column(String, default="processing")  # processing, completed, error
    file_path = Column(String, nullable=True)

class TranslationMemory(Base):
    __tablename__ = "translation_memory"

    id = Column(Integer, primary_key=True, index=True)
    source_hash = Column(String, index=True, nullable=False)
    source_text = Column(Text, nullable=False)
    target_text = Column(Text, nullable=False)
    context = Column(String, nullable=True) # e.g. "sermon", "bible"
    usage_count = Column(Integer, default=1)

class BibleVerse(Base):
    __tablename__ = "bible_verses"

    id = Column(Integer, primary_key=True, index=True)
    book = Column(String, index=True, nullable=False)
    chapter = Column(Integer, nullable=False)
    verse = Column(Integer, nullable=False)
    text_ko = Column(Text, nullable=False)
    text_lo_common = Column(Text, nullable=True)
    text_lo_religious = Column(Text, nullable=True)
    text_lo_royal = Column(Text, nullable=True)
    comments = Column(Text, nullable=True)

# Document Chunk table for local RAG indexing
class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, index=True, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    vector_json = Column(Text, nullable=True) # JSON representation of the embedding array if local

class SermonReview(Base):
    __tablename__ = "sermon_reviews"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, default="Untitled Sermon")
    source_text = Column(Text, nullable=False)
    trans_literal = Column(Text, nullable=True)
    trans_preaching = Column(Text, nullable=True)
    trans_contextual = Column(Text, nullable=True)
    trans_smallgroup = Column(Text, nullable=True)
    reviewer_stage = Column(String, default="ai")  # ai, local_reviewer, missionary_reviewer, approved
    reviewer_notes = Column(Text, nullable=True)
    approved = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    history_json = Column(Text, nullable=True)  # Version log: [{"timestamp": "...", "reviewer": "...", "notes": "..."}]

