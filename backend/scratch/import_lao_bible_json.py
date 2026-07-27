import json
import os
import sys
import re

# Make sure we can import from backend root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.schemas import BibleVerse, Document
from app.services.document_parser import DocumentParser
from app.services.rag_engine import RAGEngine

JSON_PATH = "/Users/galeb76/Downloads/laos/LaoBible.json"

def normalize_name(name):
    return re.sub(r'\s+', '', name).lower()

def main():
    if not os.path.exists(JSON_PATH):
        print(f"Error: LaoBible.json not found at {JSON_PATH}")
        return

    print(f"=== Importing Lao Bible JSON ({os.path.getsize(JSON_PATH)/1024/1024:.2f} MB) ===")
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    books_list = data.get("books", [])
    print(f"Parsed {len(books_list)} books from JSON metadata.")

    # 66 Bible Books English-to-Korean mapping
    raw_mapping = {
        "Genesis": "창세기 (Genesis)",
        "Exodus": "출애굽기 (Exodus)",
        "Leviticus": "레위기 (Leviticus)",
        "Numbers": "민수기 (Numbers)",
        "Deuteronomy": "신명기 (Deuteronomy)",
        "Joshua": "여호수아 (Joshua)",
        "Judges": "사사기 (Judges)",
        "Ruth": "룻기 (Ruth)",
        "1 Samuel": "사무엘상 (1 Samuel)",
        "2 Samuel": "사무엘하 (2 Samuel)",
        "1 Kings": "열왕기상 (1 Kings)",
        "2 Kings": "열왕기하 (2 Kings)",
        "1 Chronicles": "역대기상 (1 Chronicles)",
        "2 Chronicles": "역대기하 (2 Chronicles)",
        "Ezra": "에스라 (Ezra)",
        "Nehemiah": "느헤미야 (Nehemiah)",
        "Esther": "에스더 (Esther)",
        "Job": "욥기 (Job)",
        "Psalms": "시편 (Psalms)",
        "Proverbs": "잠언 (Proverbs)",
        "Ecclesiastes": "전도서 (Ecclesiastes)",
        "Song of Solomon": "아가 (Song of Solomon)",
        "Isaiah": "이사야 (Isaiah)",
        "Jeremiah": "예레미야 (Jeremiah)",
        "Lamentations": "예레미야 애가 (Lamentations)",
        "Ezekiel": "에스겔 (Ezekiel)",
        "Daniel": "다니엘 (Daniel)",
        "Hosea": "호세아 (Hosea)",
        "Joel": "요엘 (Joel)",
        "Amos": "아모스 (Amos)",
        "Obadiah": "오바디아 (Obadiah)",
        "Jonah": "요나 (Jonah)",
        "Micah": "미가 (Micah)",
        "Nahum": "나훔 (Nahum)",
        "Habakkuk": "하박국 (Habakkuk)",
        "Zephaniah": "스바냐 (Zephaniah)",
        "Haggai": "학개 (Haggai)",
        "Zechariah": "스가랴 (Zechariah)",
        "Malachi": "말라기 (Malachi)",
        "Matthew": "마태복음 (Matthew)",
        "Mark": "마가복음 (Mark)",
        "Luke": "누가복음 (Luke)",
        "John": "요한복음 (John)",
        "Acts": "사도행전 (Acts)",
        "Romans": "로마서 (Romans)",
        "1 Corinthians": "고린도전서 (1 Corinthians)",
        "2 Corinthians": "고린도후서 (2 Corinthians)",
        "Galatians": "갈라디아서 (Galatians)",
        "Ephesians": "에베소서 (Ephesians)",
        "Philippians": "빌립보서 (Philippians)",
        "Colossians": "골로새서 (Colossians)",
        "1 Thessalonians": "데살로니가전서 (1 Thessalonians)",
        "2 Thessalonians": "데살로니가후서 (2 Thessalonians)",
        "1 Timothy": "디모데전서 (1 Timothy)",
        "2 Timothy": "디모데후서 (2 Timothy)",
        "Titus": "디도서 (Titus)",
        "Philemon": "빌레몬서 (Philemon)",
        "Hebrews": "히브리서 (Hebrews)",
        "James": "야고보서 (James)",
        "1 Peter": "베드로전서 (1 Peter)",
        "2 Peter": "베드로후서 (2 Peter)",
        "1 John": "요한일서 (1 John)",
        "2 John": "요한이서 (2 John)",
        "3 John": "요한삼서 (3 John)",
        "Jude": "유다서 (Jude)",
        "Revelation": "요한계시록 (Revelation)"
    }
    
    # Map normalized english keys to target Korean book strings
    book_mapping = {normalize_name(k): v for k, v in raw_mapping.items()}

    db = SessionLocal()
    try:
        # Clear existing records in bible_verses table to do a clean synchronisation
        print("Cleaning old Bible verses database...")
        db.query(BibleVerse).delete(synchronize_session=False)
        db.commit()

        print("Importing verses into bible_verses table...")
        total_verses = 0
        rag_chunks = [] # Grouped by chapter: each element is "Book Chapter: Text"
        
        for book_data in books_list:
            eng_name = book_data.get("name_en", "")
            lao_name = book_data.get("name_lao", "")
            chapters = book_data.get("chapters", {})
            
            db_book_name = book_mapping.get(normalize_name(eng_name))
            if not db_book_name:
                # Fallback mapping
                db_book_name = f"{lao_name} ({eng_name})"
                
            print(f"  -> Processing {db_book_name} ({len(chapters)} chapters)...")
            
            for ch_str, verses_dict in chapters.items():
                chapter_num = int(ch_str)
                chapter_text_list = []
                
                for v_str, text_lao in verses_dict.items():
                    verse_match = re.search(r'\d+', v_str)
                    if not verse_match:
                        continue
                    verse_num = int(verse_match.group(0))
                    
                    db_verse = BibleVerse(
                        book=db_book_name,
                        chapter=chapter_num,
                        verse=verse_num,
                        text_ko=f"[라오어 구절 참조]",
                        text_lo_common=text_lao,
                        text_lo_religious=text_lao,
                        text_lo_royal=f"ພຣະອົງ... {text_lao}",
                        comments=f"Lao Bible Online Reference"
                    )
                    db.add(db_verse)
                    total_verses += 1
                    
                    # Accumulate text for RAG chapter chunk
                    chapter_text_list.append(f"{verse_num}절: {text_lao}")
                
                # Combine chapter verses into one RAG chunk
                chapter_text = f"[{db_book_name} {chapter_num}장]\n" + "\n".join(chapter_text_list)
                rag_chunks.append(chapter_text)
                
        db.commit()
        print(f"Successfully imported {total_verses} verses into bible_verses table.")

        # --- Step 2: RAG Indexing ---
        print("\n=== Generating RAG Indexing for Complete Lao Bible ===")
        # Save Document Record first
        existing_doc = db.query(Document).filter(Document.name == "LaoBible.json").first()
        if existing_doc:
            db.delete(existing_doc)
            db.commit()
            
        db_doc = Document(
            name="LaoBible.json",
            file_type="json",
            summary="Lao Bible 2015 Popular Edition (Genesis to Revelation). Complete 66 books reference.",
            theological_meaning="Holy Bible scriptures in Lao language.",
            key_concepts="Christian theology, Bible verses context.",
            historical_context="United Bible Societies 1979 translation updated in 2015.",
            people="",
            places="",
            file_path=JSON_PATH,
            db_status="completed"
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        print(f"Created Document record for RAG (ID: {db_doc.id})")
        
        # Chunking: since our chunks are chapter-level (1,189 chapters), index them directly!
        print(f"Indexing {len(rag_chunks)} chapter-level chunks into RAG database...")
        # Use provider="local" to force fast, offline, free TF-IDF indexing
        RAGEngine.index_document(db, db_doc.id, rag_chunks, provider="local")
        print(f"RAG Indexing successfully completed for all {len(rag_chunks)} chapters!")
        
        print("\n=== COMPLETE BIBLE IMPORT & RAG SYNC SUCCESSFUL ===")
        
    except Exception as e:
        db.rollback()
        print(f"Error during import: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
