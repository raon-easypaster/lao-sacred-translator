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
            
        # 4. Test Sermon Review Database operations
        print("4. Testing Sermon Review database model operations...")
        from app.models.schemas import SermonReview
        import json
        
        # Clean up any past test data
        db.query(SermonReview).filter(SermonReview.title == "Test Sermon Review Project").delete()
        db.commit()
        
        test_sermon = SermonReview(
            title="Test Sermon Review Project",
            source_text="하나님의 은혜가 넘치기를 원합니다.",
            trans_literal="ພຣະຄຸນຂອງພຣະຜູ້ເປັນເຈົ້າ",
            trans_preaching="ພຣະຄຸນຂອງພຣະເຈົ້າ",
            trans_contextual="ພຣະຄຸນຂອງພຣະເຈົ້າ",
            trans_smallgroup="ພຣະຄຸນຂອງພຣະເຈົ້າ",
            reviewer_stage="ai",
            approved=False
        )
        db.add(test_sermon)
        db.commit()
        db.refresh(test_sermon)
        print(f"SUCCESS: Created test Sermon Review project ID: {test_sermon.id}")
        
        # Simulate an edit and log version history
        history = []
        change_desc = ["Preaching translation updated"]
        history.append({
            "timestamp": "2026-07-24T00:00:00",
            "reviewer": "Test Missionary",
            "changes": ", ".join(change_desc),
            "notes": "번역을 상황화에 맞게 다듬었습니다."
        })
        
        test_sermon.trans_preaching = "ພຣະຄຸນອັນຍິ່ງໃຫຍ່"
        test_sermon.reviewer_stage = "missionary_reviewer"
        test_sermon.history_json = json.dumps(history)
        db.commit()
        db.refresh(test_sermon)
        
        # Verify history logs can be read back
        updated_sermon = db.query(SermonReview).filter(SermonReview.id == test_sermon.id).first()
        history_list = json.loads(updated_sermon.history_json)
        print(f"SUCCESS: Verification log parsed. Changes: {history_list[0]['changes']} by {history_list[0]['reviewer']}")
        
        # Clean up test database records
        db.delete(updated_sermon)
        db.commit()
        print("SUCCESS: Sermon Review database integration test completed successfully.")
            
    except Exception as e:
        print(f"CRITICAL TEST ERROR: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    run_test()
