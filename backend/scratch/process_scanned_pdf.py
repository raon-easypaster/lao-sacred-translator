import os
import sys
import subprocess
import glob
import json
import shutil

# Make sure we can import from backend root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.schemas import Document, DocumentChunk
from app.services.document_parser import DocumentParser
from app.services.rag_engine import RAGEngine

PDF_PATH = "/Users/galeb76/Downloads/laos/Scan Feb 4 2022 1057.pdf"
TMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tmp_ocr")

def run_ocr():
    print("=== LSLT Scanned PDF OCR & Database Import ===")
    if not os.path.exists(PDF_PATH):
        print(f"Error: Target PDF not found at {PDF_PATH}")
        sys.exit(1)
        
    print(f"Target PDF file size: {os.path.getsize(PDF_PATH) / 1024 / 1024:.2f} MB")
    
    # Create temp directory
    os.makedirs(TMP_DIR, exist_ok=True)
    print(f"Temporary workspace created at: {TMP_DIR}")
    
    try:
        # Step 1: Convert PDF to PNG images
        print("\n[Step 1/3] Converting PDF to page images via pdftoppm...")
        # Use low-medium resolution (150 DPI) for fast processing and good OCR readability
        cmd_ppm = [
            "/opt/homebrew/bin/pdftoppm",
            "-png",
            "-r", "150",
            PDF_PATH,
            os.path.join(TMP_DIR, "page")
        ]
        print(f"Running command: {' '.join(cmd_ppm)}")
        subprocess.run(cmd_ppm, check=True)
        
        # Get sorted list of images
        images = sorted(glob.glob(os.path.join(TMP_DIR, "page-*.png")))
        num_pages = len(images)
        print(f"PDF successfully converted. Total pages extracted: {num_pages}")
        
        if num_pages == 0:
            print("Error: No images were extracted from the PDF.")
            sys.exit(1)
            
        # Step 2: Run Tesseract OCR on each page image
        print("\n[Step 2/3] Performing OCR on page images using Tesseract (Korean + English + Lao)...")
        combined_text_list = []
        
        for idx, img_path in enumerate(images):
            page_num = idx + 1
            print(f" -> Processing page {page_num}/{num_pages} ({os.path.basename(img_path)})...")
            
            cmd_tess = [
                "/opt/homebrew/bin/tesseract",
                img_path,
                "stdout",
                "-l", "kor+eng+lao",
                "--oem", "1",
                "--psm", "3"
            ]
            
            result = subprocess.run(cmd_tess, capture_output=True, text=True, check=True)
            page_text = result.stdout.strip()
            
            if page_text:
                combined_text_list.append(f"--- PAGE {page_num} ---\n{page_text}")
            else:
                print(f"    (Warning: Page {page_num} appears to contain no readable text)")
                
        combined_text = "\n\n".join(combined_text_list)
        print(f"\nOCR Complete. Total characters recognized: {len(combined_text)}")
        
        if not combined_text.strip():
            print("Error: OCR did not recognize any text from the document.")
            sys.exit(1)
            
        # Step 3: Parse and index into Database
        print("\n[Step 3/3] Generating theological metadata and indexing into database...")
        db = SessionLocal()
        try:
            # Generate metadata
            print(" -> Extracting theological metadata aspects...")
            metadata = DocumentParser.extract_theological_metadata(combined_text)
            
            # Save Document Record
            db_doc = Document(
                name="Scan Feb 4 2022 1057.pdf",
                file_type="pdf",
                summary=metadata.get("summary", ""),
                theological_meaning=metadata.get("theological_meaning", ""),
                key_concepts=metadata.get("key_concepts", ""),
                historical_context=metadata.get("historical_context", ""),
                people=metadata.get("people", ""),
                places=metadata.get("places", ""),
                file_path=PDF_PATH,
                db_status="completed"
            )
            db.add(db_doc)
            db.commit()
            db.refresh(db_doc)
            print(f" -> Created Document record ID: {db_doc.id}")
            
            # Chunk and Index chunks
            print(" -> Chunking text and indexing into Vector DB / TF-IDF structures...")
            chunks = DocumentParser.chunk_text(combined_text)
            RAGEngine.index_document(db, db_doc.id, chunks)
            print(f" -> Successfully indexed {len(chunks)} chunks for Document ID {db_doc.id}!")
            
        except Exception as db_err:
            db.rollback()
            print(f"Database insertion failed: {db_err}")
            sys.exit(1)
        finally:
            db.close()
            
        print("\n=== OCR & DATABASE IMPORT SUCCESSFUL ===")
        
    finally:
        # Cleanup temp files
        print(f"Cleaning up temporary OCR folder...")
        if os.path.exists(TMP_DIR):
            shutil.rmtree(TMP_DIR)
        print("Cleanup done.")

if __name__ == "__main__":
    run_ocr()
