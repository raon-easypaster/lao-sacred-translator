import json
import requests
from sqlalchemy.orm import Session
from app.models.schemas import Glossary, TranslationMemory
from app.services.rag_engine import RAGEngine
from app.core.config import settings

class TranslationEngine:
    @staticmethod
    def _get_glossary_matches(db: Session, text: str, direction: str) -> list:
        """Finds any glossary entries that are present in the source text."""
        all_terms = db.query(Glossary).all()
        matches = []
        
        is_ko = "ko" in direction.split("_to_")[0]
        
        for term in all_terms:
            if is_ko:
                if term.word_ko and term.word_ko in text:
                    matches.append(term)
            else:
                # Check Lao terms
                if term.word_lo_common and term.word_lo_common in text:
                    matches.append(term)
                elif term.word_lo_religious and term.word_lo_religious in text:
                    matches.append(term)
                elif term.word_lo_royal and term.word_lo_royal in text:
                    matches.append(term)
        return matches

    @staticmethod
    def translate(
        db: Session,
        text: str,
        direction: str,
        mode: str = "standard",
        provider: str = None,
        api_key: str = None
    ) -> dict:
        """Translates the text using custom glossary injection, RAG, and an LLM."""
        provider = provider or settings.DEFAULT_LLM_PROVIDER
        
        # Resolve key specific to the provider
        if provider == "gemini":
            key = api_key or settings.GEMINI_API_KEY
        elif provider == "openai":
            key = api_key or settings.OPENAI_API_KEY
        elif provider == "claude":
            key = api_key or settings.CLAUDE_API_KEY
        else:
            key = ""
        
        # 1. Search Glossary DB
        glossary_matches = TranslationEngine._get_glossary_matches(db, text, direction)
        
        # 2. Search RAG Document DB
        # Use provider-specific key for embeddings too
        emb_key = api_key or (settings.GEMINI_API_KEY if settings.EMBEDDING_PROVIDER == "gemini" else (settings.OPENAI_API_KEY if settings.EMBEDDING_PROVIDER == "openai" else ""))
        rag_results = RAGEngine.search(db, text, top_k=2, provider=settings.EMBEDDING_PROVIDER, api_key=emb_key)
        
        # Format glossary and RAG contexts for the prompt
        glossary_context = ""
        if glossary_matches:
            glossary_context = "참고용 용어사전 자료:\n"
            for term in glossary_matches:
                glossary_context += (
                    f"- 한국어: {term.word_ko} | 일반 라오어: {term.word_lo_common} | "
                    f"종교 라오어: {term.word_lo_religious} | 왕실 라오어: {term.word_lo_royal}\n"
                    f"  기독교 의미: {term.explanation_christian}\n"
                    f"  불교 의미: {term.explanation_buddhist}\n"
                    f"  선교 주의사항: {term.missionary_notes}\n"
                )
                
        rag_context = ""
        if rag_results:
            rag_context = "참고용 배경 문헌 자료 (RAG):\n"
            for doc in rag_results:
                rag_context += f"- 출처 [{doc['document_name']}]: \"{doc['content']}\"\n"

        # If no API Key is available, use heuristic rule-based translation
        if not key:
            return TranslationEngine._heuristic_fallback_translate(text, direction, mode, glossary_matches, rag_results)

        # 3. Choose provider and run translation
        if provider == "gemini":
            return TranslationEngine._translate_gemini(text, direction, mode, glossary_context, rag_context, key)
        elif provider == "openai":
            return TranslationEngine._translate_openai(text, direction, mode, glossary_context, rag_context, key)
        elif provider == "claude":
            return TranslationEngine._translate_claude(text, direction, mode, glossary_context, rag_context, key)
            
        return TranslationEngine._heuristic_fallback_translate(text, direction, mode, glossary_matches, rag_results)


    @staticmethod
    def _translate_gemini(text: str, direction: str, mode: str, glossary: str, rag: str, key: str) -> dict:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}"
        headers = {"Content-Type": "application/json"}
        
        prompt = TranslationEngine._build_system_prompt(text, direction, mode, glossary, rag)
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"}
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=20)
            if response.status_code == 200:
                result = response.json()
                content = result["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(content)
        except Exception as e:
            pass
            
        return {"error": "Gemini API call failed", "translation": text}

    @staticmethod
    def _translate_openai(text: str, direction: str, mode: str, glossary: str, rag: str, key: str) -> dict:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}"
        }
        
        prompt = TranslationEngine._build_system_prompt(text, direction, mode, glossary, rag)
        
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are a professional Lao religious translator, theologian, and linguist. You must return only JSON."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=20)
            if response.status_code == 200:
                content = response.json()["choices"][0]["message"]["content"]
                return json.loads(content)
        except Exception:
            pass
            
        return {"error": "OpenAI API call failed", "translation": text}

    @staticmethod
    def _translate_claude(text: str, direction: str, mode: str, glossary: str, rag: str, key: str) -> dict:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": key,
            "anthropic-version": "2023-06-01"
        }
        
        prompt = TranslationEngine._build_system_prompt(text, direction, mode, glossary, rag)
        
        payload = {
            "model": "claude-3-5-haiku-20241022",
            "max_tokens": 2048,
            "system": "You are a professional Lao religious translator, theologian, and linguist. Return a JSON object ONLY.",
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=20)
            if response.status_code == 200:
                content = response.json()["content"][0]["text"]
                # Claude might wrap in markdown codeblocks
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                return json.loads(content)
        except Exception:
            pass
            
        return {"error": "Claude API call failed", "translation": text}

    @staticmethod
    def _build_system_prompt(text: str, direction: str, mode: str, glossary: str, rag: str) -> str:
        prompt = (
            "당신은 라오스 종교언어, 왕실언어(Rahasap), 현대 일반 라오어, 그리고 신학 및 불교 경전의 권위자입니다.\n"
            f"다음 지침에 따라 아래 텍스트를 번역 및 해설해 주세요.\n\n"
            f"번역 방향: {direction}\n"
            f"선교 모드/컨텍스트: {mode}\n\n"
            f"번역할 원문:\n\"\"\"\n{text}\n\"\"\"\n\n"
        )
        
        if glossary:
            prompt += f"{glossary}\n"
        if rag:
            prompt += f"{rag}\n"
            
        prompt += (
            "반드시 아래의 JSON 구조로만 결과를 반환해야 합니다. 코드 펜스나 부가설명 없이 순수 JSON만 출력하십시오.\n"
            "JSON 형식:\n"
            "{\n"
            "  \"translation\": \"최종 번역 결과물\",\n"
            "  \"confidence\": 95, // 번역 신뢰도 퍼센트 (숫자)\n"
            "  \"literal\": \"원문과 일치하는 직역 텍스트\",\n"
            "  \"contextual\": \"현지인이 이해하기 쉽게 풀어쓴 의역 텍스트\",\n"
            "  \"preaching\": \"예배 및 설교 시 사용할 수 있는 장중한 경어체/종교체 번역\",\n"
            "  \"cultural_warning\": \"기독교 용어와 라오스 불교/전통 문화 간의 개념 차이로 인해 발생할 수 있는 오해 사항 및 주의사항\",\n"
            "  \"commentary\": \"업(Karma), 공덕(Merit), 은혜, 구원 등 핵심 종교 용어의 신학적/문화적 해설\",\n"
            "  \"source\": \"번역 근거가 된 문헌 및 사전 출처 표시 (예: 성경 사전, 불교 경전 연구)\",\n"
            "  \"vocabulary\": [\n"
            "     {\"word\": \"단어\", \"common\": \"일반 라오어\", \"religious\": \"종교 라오어\", \"royal\": \"왕실어\", \"meaning\": \"설명\"}\n"
            "  ]\n"
            "}"
        )
        return prompt

    @staticmethod
    def _heuristic_fallback_translate(text: str, direction: str, mode: str, glossary_matches: list, rag_results: list) -> dict:
        """Fallback rule-based dictionary translator if no LLM key is configured."""
        # Simple simulated translation for demo/offline purposes
        lo_dir = direction.split("_to_")
        source_lang = lo_dir[0]
        target_lang = lo_dir[1] if len(lo_dir) > 1 else "lo_religious"
        
        translation = text
        vocab_list = []
        commentaries = []
        warnings = []
        sources = ["LSLT 로컬 기본 사전"]
        
        # Replace matching words in a primitive way for demonstration
        for term in glossary_matches:
            target_word = term.word_lo_religious
            if target_lang == "lo_royal":
                target_word = term.word_lo_royal
            elif target_lang == "lo_common":
                target_word = term.word_lo_common
            elif target_lang == "ko":
                target_word = term.word_ko
                
            translation = translation.replace(term.word_ko, f"[{target_word}]")
            
            vocab_list.append({
                "word": term.word_ko,
                "common": term.word_lo_common,
                "religious": term.word_lo_religious,
                "royal": term.word_lo_royal,
                "meaning": term.explanation_christian
            })
            
            if term.explanation_buddhist:
                commentaries.append(f"[{term.word_ko}] 기독교: {term.explanation_christian} vs 불교: {term.explanation_buddhist}")
            if term.missionary_notes:
                warnings.append(term.missionary_notes)
            if term.source:
                sources.append(term.source)

        for doc in rag_results:
            sources.append(doc["document_name"])

        # Construct response
        fallback_trans = f"ເຜີຍແຜ່: {translation}" if "lo" in target_lang else translation
        
        # Clean double brackets
        fallback_trans = fallback_trans.replace("[", "").replace("]", "")

        return {
            "translation": fallback_trans,
            "confidence": 75,
            "literal": f"[직역] {text}에 대한 용어 사전 매핑 매칭 결과",
            "contextual": f"[의역] {translation} - 라오스 상황화 번역 적용",
            "preaching": f"[설교체] ພຣະຜູ້ເປັນເຈົ້າ... {translation} ພຣະອົງ...",
            "cultural_warning": " | ".join(warnings) if warnings else "온라인 API 키가 설정되지 않아 로컬 사전 기반 번역 경고가 제공됩니다.",
            "commentary": "\n".join(commentaries) if commentaries else "용어 해설: 기독교 구속사적 의미를 현지 용어로 번역 시 의미 왜곡이 생길 수 있습니다.",
            "source": ", ".join(list(set(sources))),
            "vocabulary": vocab_list
        }
