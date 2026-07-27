import os
import sys
import subprocess
from sqlalchemy.orm import Session

# Make sure we can import from backend root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.schemas import Document
from app.services.document_parser import DocumentParser
from app.services.rag_engine import RAGEngine

PDF_FILES = [
    {
        "name": "LaoBibleDictionary.pdf",
        "path": "/Users/galeb76/Downloads/laos/LaoBibleDictionary.pdf"
    },
    {
        "name": "성경용어사전v 15.04.27.pdf",
        "path": "/Users/galeb76/Downloads/laos/성경용어사전v 15.04.27.pdf"
    },
    {
        "name": "한라 사전.pdf",
        "path": "/Users/galeb76/Downloads/laos/한라 사전.pdf"
    }
]

def extract_text_from_pdf(pdf_path):
    print(f"  -> Extracting digital text via pdftotext from {pdf_path}...")
    try:
        cmd = ["/opt/homebrew/bin/pdftotext", pdf_path, "-"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout
    except Exception as e:
        print(f"  -> Error running pdftotext: {e}")
        return None

def process_pdfs():
    print("=== Bulk Digital PDF Importer & RAG Indexer ===")
    
    db = SessionLocal()
    try:
        for pdf_info in PDF_FILES:
            filename = pdf_info["name"]
            pdf_path = pdf_info["path"]
            
            if not os.path.exists(pdf_path):
                print(f"\n[Warning] File not found: {pdf_path}. Skipping.")
                continue
                
            print(f"\nProcessing: {filename} ({os.path.getsize(pdf_path) / 1024 / 1024:.2f} MB)")
            
            # Check if already processed
            existing_doc = db.query(Document).filter(Document.name == filename).first()
            if existing_doc:
                print(f"  -> Document '{filename}' already exists in database (ID: {existing_doc.id}). Skipping.")
                continue
                
            # Step 1: Extract Text
            text = extract_text_from_pdf(pdf_path)
            if not text or not text.strip():
                print(f"  -> Error: No text could be extracted from {filename}")
                continue
                
            print(f"  -> Text successfully extracted. Total characters: {len(text)}")
            
            # Step 2: Extract Theological Metadata
            print("  -> Generating theological metadata & summary...")
            # Use a safe subset of text to avoid overloading prompt tokens for metadata extraction
            metadata_sample = text[:50000] # Use first 50,000 characters for metadata summary
            metadata = DocumentParser.extract_theological_metadata(metadata_sample)
            
            # Step 3: Save Document Record
            db_doc = Document(
                name=filename,
                file_type="pdf",
                summary=metadata.get("summary", f"Digital text import of {filename}."),
                theological_meaning=metadata.get("theological_meaning", ""),
                key_concepts=metadata.get("key_concepts", ""),
                historical_context=metadata.get("historical_context", ""),
                people=metadata.get("people", ""),
                places=metadata.get("places", ""),
                file_path=pdf_path,
                db_status="completed"
            )
            db.add(db_doc)
            db.commit()
            db.refresh(db_doc)
            print(f"  -> Saved Document record (ID: {db_doc.id})")
            
            # Step 4: Chunk and Index into Vector DB
            print(f"  -> Slicing text and indexing chunks into Vector DB / RAG memory...")
            chunks = DocumentParser.chunk_text(text)
            RAGEngine.index_document(db, db_doc.id, chunks)
            print(f"  -> Successfully indexed {len(chunks)} chunks for {filename}!")
            
        print("\n=== BULK PDF IMPORT COMPLETED SUCCESSFULLY ===")
        
    except Exception as e:
        db.rollback()
        print(f"Error during bulk import: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    process_pdfs()
