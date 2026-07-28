import json
import os
import sys

# Make sure we can import from backend root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.schemas import Glossary

def main():
    seed_path = os.path.join(os.path.dirname(__file__), "..", "data", "seed_glossary.json")
    if not os.path.exists(seed_path):
        print(f"Error: seed_glossary.json not found at {seed_path}")
        return
        
    print(f"Loading seed glossary terms from {seed_path}...")
    with open(seed_path, "r", encoding="utf-8") as f:
        terms_data = json.load(f)
        
    db = SessionLocal()
    try:
        print("Clearing old glossary terms from database...")
        db.query(Glossary).delete(synchronize_session=False)
        
        print("Importing new seeded glossary terms...")
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
        print(f"\n=== Glossary Synchronization Completed ===")
        print(f"Successfully synchronized {len(terms_data)} glossary terms into 'lslt_database.db'!")
    except Exception as e:
        db.rollback()
        print(f"Error during import: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
