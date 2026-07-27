import json
import os
from app.core.database import SessionLocal
from app.models.schemas import BibleVerse

def main():
    json_path = os.path.join(os.path.dirname(__file__), "..", "Lao_Gospels_Database.json")
    if not os.path.exists(json_path):
        print(f"Error: Scraped Bible JSON file not found at {json_path}")
        print("Please run the scraper script 'scrape_lao_bible.py' first.")
        return

    print(f"Loading scraped Bible data from {json_path}...")
    with open(json_path, "r", encoding="utf-8") as f:
        bible_data = json.load(f)

    # Map English book names to LSLT UI database format
    book_mapping = {
        "Matthew": "마태복음 (Matthew)",
        "Mark": "마가복음 (Mark)",
        "Luke": "누가복음 (Luke)",
        "John": "요한복음 (John)"
    }

    db = SessionLocal()
    try:
        total_inserted = 0
        for eng_book, chapters in bible_data.items():
            db_book_name = book_mapping.get(eng_book)
            if not db_book_name:
                print(f"Skipping unknown book: {eng_book}")
                continue

            print(f"Processing {db_book_name}...")
            
            # Extract chapter list to delete existing records to prevent duplicates
            scraped_chapters = [int(ch) for ch in chapters.keys()]
            
            # Clean existing records for this book and chapters
            deleted = db.query(BibleVerse).filter(
                BibleVerse.book == db_book_name,
                BibleVerse.chapter.in_(scraped_chapters)
            ).delete(synchronize_session=False)
            if deleted > 0:
                print(f"  Deleted {deleted} legacy records for {db_book_name} to avoid duplicates.")

            # Insert new verses
            for ch_str, verses in chapters.items():
                chapter_num = int(ch_str)
                for v in verses:
                    verse_num = int(v["verse"])
                    text_lao = v["text_lao"]
                    text_eng = v["text_eng"]

                    db_verse = BibleVerse(
                        book=db_book_name,
                        chapter=chapter_num,
                        verse=verse_num,
                        text_ko=f"[영어 번역 참조] {text_eng}",
                        text_lo_common=text_lao,
                        text_lo_religious=text_lao,
                        text_lo_royal=f"ພຣະອົງ... {text_lao}",  # Seed default royal form
                        comments=f"English Parallel Reference: {text_eng}"
                    )
                    db.add(db_verse)
                    total_inserted += 1

        db.commit()
        print(f"\n=== Database Synchronization Completed! ===")
        print(f"Successfully synchronized {total_inserted} Lao Bible verses into 'lslt_database.db'!")
        
    except Exception as e:
        db.rollback()
        print(f"Error during synchronization: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
