import sys
import os

# Adjust path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models.schemas import Glossary
from app.services.translation_engine import TranslationEngine
import main


def run_test():
    print("=== LSLT Backend Integration Test ===")
    
    # 1. Initialize DB and verify table creation
    print("1. Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables verified.")

    # 2. Check seeding
    print("2. Verifying database seeding...")
    db = SessionLocal()
    try:
        # Check if terms exist
        count = db.query(Glossary).count()
        print(f"Glossary term count: {count}")
        if count == 0:
            print("ERROR: Glossary is empty. Seeding was not triggered.")
            sys.exit(1)
        
        # Pull a specific term
        grace_term = db.query(Glossary).filter(Glossary.word_ko == "은혜").first()
        if grace_term:
            print(f"SUCCESS: Found seeded term '{grace_term.word_ko}' -> Common: {grace_term.word_lo_common}, Religious: {grace_term.word_lo_religious}")
        else:
            print("ERROR: Seeding did not create the '은혜' term.")
            sys.exit(1)
            
        # 3. Test Translation Engine Fallback
        print("3. Testing offline translation fallback engine...")
        test_text = "하나님의 은혜와 은총을 통한 구원"
        result = TranslationEngine.translate(
            db=db,
            text=test_text,
            direction="ko_to_lo_religious",
            mode="missionary"
        )
        
        print("\n--- Test Translation Result ---")
        print(f"Source: {test_text}")
        print(f"Translation: {result.get('translation')}")
        print(f"Confidence: {result.get('confidence')}%")
        print(f"Literal: {result.get('literal')}")
        print(f"Vocabulary matched: {[v['word'] for v in result.get('vocabulary', [])]}")
        print("--------------------------------\n")
        
        if len(result.get('vocabulary', [])) > 0:
            print("SUCCESS: Translation fallback and dictionary parsing works out-of-the-box!")
        else:
            print("WARNING: No terms matched, check source text or seeding.")
            
    except Exception as e:
        print(f"CRITICAL TEST ERROR: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
