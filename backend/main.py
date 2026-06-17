import os
import json
import uuid
import shutil
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db, engine, Base
from app.models.schemas import Glossary, TranslationHistory, Document, DocumentChunk, TranslationMemory, BibleVerse
from app.services.document_parser import DocumentParser
from app.services.rag_engine import RAGEngine
from app.services.translation_engine import TranslationEngine
from app.services.export_service import ExportService

# Initialize database
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create folders
UPLOAD_DIR = "./uploads"
EXPORT_DIR = "./exports"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)

# Helper function to seed glossary if empty
def seed_database_if_empty():
    db = Session(bind=engine)
    try:
        if db.query(Glossary).count() == 0:
            seed_path = "./data/seed_glossary.json"
            if os.path.exists(seed_path):
                with open(seed_path, "r", encoding="utf-8") as f:
                    terms_data = json.load(f)
                    for item in terms_data:
                        term = Glossary(
                            word_ko=item["word_ko"],
                            word_lo_common=item.get("word_lo_common"),
                            word_lo_religious=item.get("word_lo_religious"),
                            word_lo_royal=item.get("word_lo_royal"),
                            explanation_christian=item.get("explanation_christian"),
                            explanation_buddhist=item.get("explanation_buddhist"),
                            missionary_notes=item.get("missionary_notes"),
                            frequency=item.get("frequency", "Medium"),
                            source=item.get("source"),
                            category=item.get("category", "General")
                        )
                        db.add(term)
                db.commit()
                print("Glossary seeded successfully.")
                
        if db.query(BibleVerse).count() == 0:
            # Seed a few parallel Bible verses for testing/demo
            verses = [
                {
                    "book": "요한복음 (John)",
                    "chapter": 3,
                    "verse": 16,
                    "text_ko": "하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라",
                    "text_lo_common": "ເພາະວ່າ ພຣະເຈົ້າ ຊົງຮັກ ໂລກ ຫຼາຍ ຈົນໄດ້ ປະທານ ພຣະບຸດ ອົງດຽວ ຂອງ ພຣະອົງ, ເພື່ອ ທຸກຄົນ ທີ່ ເຊື່ອ ໃນ ພຣະບຸດ ນັ້ນ ຈະບໍ່ ຈິບຫາຍ, ແຕ່ມີ ຊີວິດ ອັນຕະຫຼອດໄປເປັນນິດ.",
                    "text_lo_religious": "ດ້ວຍວ່າ ພຣະຜູ້ເປັນເຈົ້າ ຊົງຮັກ ມະນຸດສະໂລກ ຢ່າງລົ້ນເຫຼືອ ຈົນໄດ້ ຊົງປະທານ ພຣະບຸດ ອົງດຽວ ຂອງ ພຣະອົງ, ເພື່ອໃຫ້ ທຸກຄົນ ທີ່ ວາງໃຈ ໃນ ພຣະບຸດ ນັ້ນ ຈະບໍ່ ຈິບຫາຍ, ແຕ່ມີ ຊີວິດ ອັນຕະຫຼອດໄປເປັນນິດ.",
                    "text_lo_royal": "ດ້ວຍວ່າ ພຣະຜູ້ສ້າງສັບພະສິ່ງ ຊົງເມດຕາ ປະຊາໂລກ ເປັນລົ້ນພົ້ນ ຈົນໄດ້ ຊົງໂຜດຜ່າຍ ພຣະຣາຊໂອຣົດ ອົງດຽວ ຂອງ ພຣະອົງ, ເພື່ອໃຫ້ ປວງຊົນ ທີ່ ວາງໃຈ ໃນ ພຣະຣາຊໂອຣົດ ນັ້ນ ຈະບໍ່ ເຖິງແກ່ມໍຣະນະ, ແຕ່ມີ ຊີວິດຕະຫຼອດການລະນານິດ.",
                    "comments": "왕실어 버전(lo_royal)은 독생자를 'ພຣະຣາຊໂອຣົດ'(왕세자/왕의 아들)로, 멸망을 'ເຖິງແກ່ມໍຣະນະ'(서거/사망의 왕실어)로 번역하여 고도의 격식을 갖추었습니다."
                },
                {
                    "book": "창세기 (Genesis)",
                    "chapter": 1,
                    "verse": 1,
                    "text_ko": "태초에 하나님이 천지를 창조하시니라",
                    "text_lo_common": "ໃນເລີ່ມຕົ້ນນັ້ນ ພຣະເຈົ້າ ໄດ້ຊົງສ້າງ ຟ້າສະຫວັນ ແລະ ແຜ່ນດິນໂລກ.",
                    "text_lo_religious": "ໃນປຖົມມະການ ພຣะຜູ້ເປັນເຈົ້າ ໄດ້ຊົງສ້າງ ຟ້າສະຫວັນ ແລະ ແຜ່ນດິນໂລກ.",
                    "text_lo_royal": "ໃນປຖົມມະການ ພຣະຜູ້ສ້າງສັບພະສິ່ງ ໄດ້ຊົງເນລະມິດສ້າງ ພຣະວິມານ ແລະ ແຜ່ນດິນໂລກ.",
                    "comments": "창조를 뜻할 때 왕실어 버전은 'ເນລະມິດສ້າງ'(신비롭게 창조하심)을 사용하며, 하늘을 'ພຣະວິມານ'(왕궁/천상 궁전)으로 품격 있게 표현합니다."
                }
            ]
            for v in verses:
                db_verse = BibleVerse(**v)
                db.add(db_verse)
            db.commit()
            print("Bible verses seeded successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

seed_database_if_empty()

# --- Schemas for Requests/Responses ---
class TranslationRequest(BaseModel):
    text: str
    direction: str
    mode: str = "standard"
    provider: Optional[str] = None
    api_key: Optional[str] = None

class GlossarySchema(BaseModel):
    word_ko: str
    word_lo_common: Optional[str] = None
    word_lo_religious: Optional[str] = None
    word_lo_royal: Optional[str] = None
    explanation_christian: Optional[str] = None
    explanation_buddhist: Optional[str] = None
    missionary_notes: Optional[str] = None
    frequency: Optional[str] = "Medium"
    source: Optional[str] = None
    category: Optional[str] = "General"

class VerificationUpdateRequest(BaseModel):
    reviewer_stage: str  # local_reviewer, missionary_reviewer, approved
    reviewer_notes: Optional[str] = None
    translated_text: Optional[str] = None
    approved: Optional[bool] = None

class SettingsUpdateRequest(BaseModel):
    default_provider: str
    api_key: str
    embedding_provider: str

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Lao Sacred Language Translator (LSLT) Backend API is running."}

@app.post("/api/translate")
def translate_text(req: TranslationRequest, db: Session = Depends(get_db)):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Source text cannot be empty.")
        
    try:
        # 1. Translate via TranslationEngine
        result = TranslationEngine.translate(
            db=db,
            text=req.text,
            direction=req.direction,
            mode=req.mode,
            provider=req.provider,
            api_key=req.api_key
        )
        
        # 2. Add to translation history in background
        history_item = TranslationHistory(
            source_text=req.text,
            translated_text=result.get("translation", ""),
            source_lang=req.direction.split("_to_")[0],
            target_lang=req.direction.split("_to_")[1] if len(req.direction.split("_to_")) > 1 else "lo_religious",
            direction=req.direction,
            confidence=result.get("confidence", 90),
            reviewer_stage="ai",
            approved=False,
            category=req.mode
        )
        db.add(history_item)
        
        # 3. Add to translation memory (using simple source hash)
        source_hash = str(uuid.uuid5(uuid.NAMESPACE_DNS, req.text.strip()))
        tm_item = db.query(TranslationMemory).filter(TranslationMemory.source_hash == source_hash).first()
        if tm_item:
            tm_item.usage_count += 1
        else:
            tm_item = TranslationMemory(
                source_hash=source_hash,
                source_text=req.text,
                target_text=result.get("translation", ""),
                context=req.mode
            )
            db.add(tm_item)
            
        db.commit()
        
        # 4. Attach history ID to output
        result["history_id"] = history_item.id
        result["source_text"] = req.text
        result["direction"] = req.direction
        result["mode"] = req.mode
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation Error: {str(e)}")

# --- Verification & History ---
@app.get("/api/history")
def get_history(db: Session = Depends(get_db)):
    items = db.query(TranslationHistory).order_by(TranslationHistory.timestamp.desc()).all()
    return items

@app.put("/api/history/{id}")
def update_verification(id: int, req: VerificationUpdateRequest, db: Session = Depends(get_db)):
    item = db.query(TranslationHistory).filter(TranslationHistory.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Translation history record not found.")
        
    item.reviewer_stage = req.reviewer_stage
    if req.reviewer_notes is not None:
        item.reviewer_notes = req.reviewer_notes
    if req.translated_text is not None:
        item.translated_text = req.translated_text
    if req.approved is not None:
        item.approved = req.approved
        
    db.commit()
    db.refresh(item)
    return item

@app.delete("/api/history/{id}")
def delete_history_item(id: int, db: Session = Depends(get_db)):
    item = db.query(TranslationHistory).filter(TranslationHistory.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Translation history record not found.")
    db.delete(item)
    db.commit()
    return {"message": "History item deleted successfully."}

# --- Glossary API ---
@app.get("/api/glossary")
def get_glossary(search: Optional[str] = None, category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Glossary)
    if search:
        query = query.filter(
            (Glossary.word_ko.contains(search)) |
            (Glossary.word_lo_common.contains(search)) |
            (Glossary.word_lo_religious.contains(search)) |
            (Glossary.word_lo_royal.contains(search)) |
            (Glossary.explanation_christian.contains(search)) |
            (Glossary.explanation_buddhist.contains(search))
        )
    if category:
        query = query.filter(Glossary.category == category)
    return query.all()

@app.post("/api/glossary")
def add_glossary_term(term: GlossarySchema, db: Session = Depends(get_db)):
    # Check if duplicate
    existing = db.query(Glossary).filter(Glossary.word_ko == term.word_ko).first()
    if existing:
        raise HTTPException(status_code=400, detail="Glossary term already exists.")
        
    db_term = Glossary(**term.model_dump())
    db.add(db_term)
    db.commit()
    db.refresh(db_term)
    return db_term

@app.put("/api/glossary/{id}")
def update_glossary_term(id: int, term: GlossarySchema, db: Session = Depends(get_db)):
    db_term = db.query(Glossary).filter(Glossary.id == id).first()
    if not db_term:
        raise HTTPException(status_code=404, detail="Term not found.")
        
    for key, value in term.model_dump().items():
        setattr(db_term, key, value)
        
    db.commit()
    db.refresh(db_term)
    return db_term

@app.delete("/api/glossary/{id}")
def delete_glossary_term(id: int, db: Session = Depends(get_db)):
    db_term = db.query(Glossary).filter(Glossary.id == id).first()
    if not db_term:
        raise HTTPException(status_code=404, detail="Term not found.")
    db.delete(db_term)
    db.commit()
    return {"message": "Glossary term deleted successfully."}

# --- Document Upload & RAG ---
@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    embedding_provider: Optional[str] = Form("local"),
    db: Session = Depends(get_db)
):
    try:
        # Save file to directory
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 1. Parse text from document
        extracted_text = DocumentParser.parse_file(file_path, file_ext)
        if not extracted_text.strip():
            raise ValueError("Document appears to be empty or cannot be parsed.")
            
        # 2. Extract theological metadata / summary
        metadata = DocumentParser.extract_theological_metadata(extracted_text, api_key)
        
        # 3. Create document record
        db_doc = Document(
            name=file.filename,
            file_type=file_ext,
            summary=metadata.get("summary", ""),
            theological_meaning=metadata.get("theological_meaning", ""),
            key_concepts=metadata.get("key_concepts", ""),
            historical_context=metadata.get("historical_context", ""),
            people=metadata.get("people", ""),
            places=metadata.get("places", ""),
            file_path=file_path,
            db_status="processing"
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        
        # 4. Chunk text and index into Vector DB (chunks)
        chunks = DocumentParser.chunk_text(extracted_text)
        RAGEngine.index_document(db, db_doc.id, chunks, provider=embedding_provider, api_key=api_key)
        
        # Update status
        db_doc.db_status = "completed"
        db.commit()
        
        return db_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload & indexing failed: {str(e)}")

@app.get("/api/documents")
def get_documents(db: Session = Depends(get_db)):
    return db.query(Document).order_by(Document.upload_date.desc()).all()

@app.get("/api/documents/{id}")
def get_document_details(id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc

@app.delete("/api/documents/{id}")
def delete_document(id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    # Delete chunks
    db.query(DocumentChunk).filter(DocumentChunk.document_id == id).delete()
    
    # Delete physical file
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass
            
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully."}

# --- Bible Study Parallel Verses ---
@app.get("/api/bible")
def get_bible_verses(book: Optional[str] = None, chapter: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(BibleVerse)
    if book:
        query = query.filter(BibleVerse.book == book)
    if chapter:
        query = query.filter(BibleVerse.chapter == chapter)
    return query.all()

# --- Search (Semantic and Keyword) ---
@app.get("/api/search")
def search_knowledge_base(query: str, top_k: int = 5, db: Session = Depends(get_db)):
    if not query.strip():
        return []
    results = RAGEngine.search(db, query, top_k=top_k)
    return results

# --- Export Endpoint ---
@app.post("/api/export")
def export_translation(data: dict, format: str = Query("markdown")):
    format = format.lower()
    
    if format == "markdown":
        content = ExportService.to_markdown(data)
        file_name = f"LSLT_Export_{uuid.uuid4().hex[:8]}.md"
        file_path = os.path.join(EXPORT_DIR, file_name)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return FileResponse(file_path, media_type="text/markdown", filename=file_name)
        
    elif format == "html":
        content = ExportService.to_html(data)
        file_name = f"LSLT_Export_{uuid.uuid4().hex[:8]}.html"
        file_path = os.path.join(EXPORT_DIR, file_name)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return FileResponse(file_path, media_type="text/html", filename=file_name)
        
    elif format == "docx":
        file_name = f"LSLT_Export_{uuid.uuid4().hex[:8]}.docx"
        file_path = os.path.join(EXPORT_DIR, file_name)
        try:
            ExportService.to_docx(data, file_path)
            return FileResponse(file_path, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", filename=file_name)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DOCX export error: {str(e)}")
            
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}. Supported: markdown, html, docx")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
