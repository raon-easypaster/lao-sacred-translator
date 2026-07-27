import json
import os
import sys
import re
import unicodedata

# Make sure we can import from backend root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.schemas import BibleVerse, Document
from app.services.document_parser import DocumentParser
from app.services.rag_engine import RAGEngine

LAOS_DIR = "/Users/galeb76/Downloads/laos"

def find_korean_bible_file():
    for f in os.listdir(LAOS_DIR):
        normalized = unicodedata.normalize('NFC', f)
        if "개역개정" in normalized and f.endswith(".json"):
            return os.path.join(LAOS_DIR, f)
    return None

def main():
    json_path = find_korean_bible_file()
    if not json_path or not os.path.exists(json_path):
        print(f"Error: Korean Bible JSON file containing '개역개정' not found in {LAOS_DIR}")
        return

    print(f"=== Importing Korean Revised Version Bible ({os.path.getsize(json_path)/1024/1024:.2f} MB) ===")
    print(f"File path: {json_path}")
    
    with open(json_path, "r", encoding="utf-8") as f:
        bible_data = json.load(f)

    # Korean Bible abbreviation mapping to standard database book names
    abbr_mapping = {
        "창": "창세기 (Genesis)",
        "출": "출애굽기 (Exodus)",
        "레": "레위기 (Leviticus)",
        "민": "민수기 (Numbers)",
        "신": "신명기 (Deuteronomy)",
        "수": "여호수아 (Joshua)",
        "삿": "사사기 (Judges)",
        "룻": "룻기 (Ruth)",
        "삼상": "사무엘상 (1 Samuel)",
        "삼하": "사무엘하 (2 Samuel)",
        "왕상": "열왕기상 (1 Kings)",
        "왕하": "열왕기하 (2 Kings)",
        "대상": "역대기상 (1 Chronicles)",
        "대하": "역대기하 (2 Chronicles)",
        "스": "에스라 (Ezra)",
        "느": "느헤미야 (Nehemiah)",
        "에": "에스더 (Esther)",
        "욥": "욥기 (Job)",
        "시": "시편 (Psalms)",
        "잠": "잠언 (Proverbs)",
        "전": "전도서 (Ecclesiastes)",
        "아": "아가 (Song of Solomon)",
        "사": "이사야 (Isaiah)",
        "렘": "예레미야 (Jeremiah)",
        "애": "예레미야 애가 (Lamentations)",
        "겔": "에스겔 (Ezekiel)",
        "단": "다니엘 (Daniel)",
        "호": "호세아 (Hosea)",
        "욜": "요엘 (Joel)",
        "암": "아모스 (Amos)",
        "옵": "오바디아 (Obadiah)",
        "욘": "요나 (Jonah)",
        "미": "미가 (Micah)",
        "나": "나훔 (Nahum)",
        "합": "하박국 (Habakkuk)",
        "습": "스바냐 (Zephaniah)",
        "학": "학개 (Haggai)",
        "슥": "스가랴 (Zechariah)",
        "말": "말라기 (Malachi)",
        "마": "마태복음 (Matthew)",
        "막": "마가복음 (Mark)",
        "눅": "누가복음 (Luke)",
        "요": "요한복음 (John)",
        "행": "사도행전 (Acts)",
        "롬": "로마서 (Romans)",
        "고전": "고린도전서 (1 Corinthians)",
        "고후": "고린도후서 (2 Corinthians)",
        "갈": "갈라디아서 (Galatians)",
        "엡": "에베소서 (Ephesians)",
        "빌": "빌립보서 (Philippians)",
        "골": "골로새서 (Colossians)",
        "살전": "데살로니가전서 (1 Thessalonians)",
        "살후": "데살로니가후서 (2 Thessalonians)",
        "딤전": "디모데전서 (1 Timothy)",
        "딤후": "디모데후서 (2 Timothy)",
        "딛": "디도서 (Titus)",
        "몬": "빌레몬서 (Philemon)",
        "히": "히브리서 (Hebrews)",
        "약": "야고보서 (James)",
        "벧전": "베드로전서 (1 Peter)",
        "벧후": "베드로후서 (2 Peter)",
        "요일": "요한일서 (1 John)",
        "요이": "요한이서 (2 John)",
        "요삼": "요한삼서 (3 John)",
        "유": "유다서 (Jude)",
        "계": "요한계시록 (Revelation)"
    }

    db = SessionLocal()
    try:
        print("Integrating Korean translations into existing database verses...")
        
        # We will parse keys like "창1:1", "삼상15:3", "고후13:13"
        key_pattern = re.compile(r'^([^\d]+)(\d+):(\d+)$')
        
        total_updated = 0
        total_inserted = 0
        
        # Accumulators to group Korean text by chapter for RAG indexing
        rag_chapters = {} # Key: (full_book_name, chapter_num), Value: List of "verse절: text"
        
        for key, text_ko in bible_data.items():
            text_ko = text_ko.strip()
            match = key_pattern.match(key)
            if not match:
                continue
                
            abbr = match.group(1)
            ch_num = int(match.group(2))
            v_num = int(match.group(3))
            
            full_book_name = abbr_mapping.get(abbr)
            if not full_book_name:
                print(f"Warning: Unknown abbreviation '{abbr}' in key '{key}'")
                continue
                
            # Query existing verse row
            db_verse = db.query(BibleVerse).filter(
                BibleVerse.book == full_book_name,
                BibleVerse.chapter == ch_num,
                BibleVerse.verse == v_num
            ).first()
            
            if db_verse:
                db_verse.text_ko = text_ko
                total_updated += 1
            else:
                # If verse row doesn't exist in Lao Bible (unlikely, but safe backup), insert a new row
                db_verse = BibleVerse(
                    book=full_book_name,
                    chapter=ch_num,
                    verse=v_num,
                    text_ko=text_ko,
                    text_lo_common="",
                    text_lo_religious="",
                    text_lo_royal="",
                    comments="Korean Bible Only"
                )
                db.add(db_verse)
                total_inserted += 1
                
            # Accumulate for RAG chapter chunk
            chapter_key = (full_book_name, ch_num)
            if chapter_key not in rag_chapters:
                rag_chapters[chapter_key] = []
            rag_chapters[chapter_key].append((v_num, text_ko))

        db.commit()
        print(f"Database integration complete: updated {total_updated} parallel records, created {total_inserted} Korean-only records.")

        # --- Step 2: RAG Indexing ---
        print("\n=== Generating RAG Indexing for Korean Revised Version Bible ===")
        # Save Document Record first
        existing_doc = db.query(Document).filter(Document.name == "개역개정성경.json").first()
        if existing_doc:
            db.delete(existing_doc)
            db.commit()
            
        db_doc = Document(
            name="개역개정성경.json",
            file_type="json",
            summary="Korean Revised Version Bible (개역개정). Complete 66 books reference.",
            theological_meaning="Holy Bible scriptures in Korean language.",
            key_concepts="Christian theology, Korean Bible verses context.",
            historical_context="Korean Protestant Church standard bible translation (개역개정).",
            people="",
            places="",
            file_path=json_path,
            db_status="completed"
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        print(f"Created Document record for Korean RAG (ID: {db_doc.id})")
        
        # Build 1,189 chapter chunks
        chunks = []
        for (book, ch), verses in sorted(rag_chapters.items(), key=lambda x: (x[0][0], x[0][1])):
            # Sort verses by verse number
            verses.sort(key=lambda v: v[0])
            verse_lines = [f"{v_num}절: {txt}" for v_num, txt in verses]
            chapter_text = f"[{book} {ch}장]\n" + "\n".join(verse_lines)
            chunks.append(chapter_text)
            
        print(f"Indexing {len(chunks)} chapter-level chunks into RAG database...")
        RAGEngine.index_document(db, db_doc.id, chunks, provider="local")
        print(f"RAG Indexing successfully completed for all {len(chunks)} Korean chapters!")
        
        print("\n=== KOREAN BIBLE IMPORT & RAG SYNC SUCCESSFUL ===")
        
    except Exception as e:
        db.rollback()
        print(f"Error during import: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
