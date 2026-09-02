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
        api_key: str = None,
        model: str = None
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
        rag_results = RAGEngine.search(db, text, top_k=5, provider=settings.EMBEDDING_PROVIDER, api_key=emb_key)
        
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
            result = TranslationEngine._heuristic_fallback_translate(text, direction, mode, glossary_matches, rag_results)
            return TranslationEngine._sanitize_result_dict(result)
 
        # 3. Choose provider and run translation
        if provider == "gemini":
            result = TranslationEngine._translate_gemini(text, direction, mode, glossary_context, rag_context, key, model)
        elif provider == "openai":
            result = TranslationEngine._translate_openai(text, direction, mode, glossary_context, rag_context, key, model)
        elif provider == "claude":
            result = TranslationEngine._translate_claude(text, direction, mode, glossary_context, rag_context, key, model)
        else:
            result = TranslationEngine._heuristic_fallback_translate(text, direction, mode, glossary_matches, rag_results)
            
        return TranslationEngine._sanitize_result_dict(result)
 
 
    @staticmethod
    def _translate_gemini(text: str, direction: str, mode: str, glossary: str, rag: str, key: str, model: str = None) -> dict:
        # Use gemini-3.6-flash as default, which is the 2026 GA stable model
        model_name = model or "gemini-3.6-flash"
        if model_name.startswith("models/"):
            model_name = model_name[7:]
            
        # Call Google GenAI stable v1 API instead of v1beta
        url = f"https://generativelanguage.googleapis.com/v1/models/{model_name}:generateContent?key={key}"
        headers = {"Content-Type": "application/json"}
        
        prompt = TranslationEngine._build_system_prompt(text, direction, mode, glossary, rag)
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"}
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=90)
            if response.status_code == 200:
                result = response.json()
                content = result["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(content)
            elif response.status_code == 429:
                try:
                    detail = response.json().get("error", {})
                    status = detail.get("status", "")
                except Exception:
                    status = ""
                if "RESOURCE_EXHAUSTED" in status or "RESOURCE_EXHAUSTED" in response.text:
                    err_msg = (
                        "Gemini API 크레딧이 소진되었습니다.\n"
                        "해결 방법:\n"
                        "① 앱 설정에서 제공자를 'Claude' 또는 'OpenAI'로 변경 후 해당 API 키를 입력하세요.\n"
                        "② 또는 https://ai.studio/projects 에서 Gemini 크레딧을 충전하세요."
                    )
                else:
                    err_msg = f"Gemini API 요청 한도 초과 (429). 잠시 후 다시 시도하거나 설정에서 다른 제공자로 전환하세요."
                print(err_msg)
                return {"error": err_msg, "translation": text}
            else:
                err_msg = f"Gemini API Error (status {response.status_code}): {response.text}"
                print(err_msg)
                return {"error": err_msg, "translation": text}
        except Exception as e:
            err_msg = f"Gemini API Exception: {str(e)}"
            print(err_msg)
            return {"error": err_msg, "translation": text}
 
    @staticmethod
    def _translate_openai(text: str, direction: str, mode: str, glossary: str, rag: str, key: str, model: str = None) -> dict:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}"
        }
        
        prompt = TranslationEngine._build_system_prompt(text, direction, mode, glossary, rag)
        
        payload = {
            "model": model or "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are a professional Lao religious translator, theologian, and linguist. You must return only JSON."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=90)
            if response.status_code == 200:
                content = response.json()["choices"][0]["message"]["content"]
                return json.loads(content)
            else:
                err_msg = f"OpenAI API Error (status {response.status_code}): {response.text}"
                print(err_msg)
                return {"error": err_msg, "translation": text}
        except Exception as e:
            err_msg = f"OpenAI API Exception: {str(e)}"
            print(err_msg)
            return {"error": err_msg, "translation": text}
 
    @staticmethod
    def _translate_claude(text: str, direction: str, mode: str, glossary: str, rag: str, key: str, model: str = None) -> dict:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": key,
            "anthropic-version": "2023-06-01"
        }
        
        prompt = TranslationEngine._build_system_prompt(text, direction, mode, glossary, rag)
        
        payload = {
            "model": model or settings.DEFAULT_CLAUDE_MODEL,
            "max_tokens": 2048,
            "system": "You are a professional Lao religious translator, theologian, and linguist. Return a JSON object ONLY.",
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=90)
            if response.status_code == 200:
                content = response.json()["content"][0]["text"]
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                return json.loads(content)
            else:
                err_msg = f"Claude API Error (status {response.status_code}): {response.text}"
                print(err_msg)
                return {"error": err_msg, "translation": text}
        except Exception as e:
            err_msg = f"Claude API Exception: {str(e)}"
            print(err_msg)
            return {"error": err_msg, "translation": text}


    @staticmethod
    def _build_system_prompt(text: str, direction: str, mode: str, glossary: str, rag: str) -> str:
        prompt = (
            "당신은 라오스 종교언어, 왕실언어(Rahasap), 현대 일반 라오어, 그리고 신학 및 불교 경전의 권위자입니다.\n"
            "[CRITICAL CONSTRAINT: STRICT EXCLUSION OF THAI LANGUAGE]\n"
            "- 태국어(Thai language) 어휘, 태국식 어투, 태국어 자모(Unicode block U+0E00 ~ U+0E7F)가 번역 결과에 절대 섞이지 않게 하십시오. \n"
            "- 태국식 조사(ครับ, ค่ะ 등) 및 태국식 감사 표현(ขอบคุณ) 등 모든 태국어 요소를 전면 배제해야 합니다. \n"
            "- 오직 표준 라오스어 자모(Unicode block U+0E80 ~ U+0EFF)와 순수 라오스어 어휘(예: ขอบใจ 등)만을 사용하여 철저히 라오스어로만 번역해 주세요.\n\n"
            "[RAG REFERENCE ADHERENCE REQUIREMENT (CRITICAL)]\n"
            "- 아래 제공된 '참고용 배경 문헌 자료 (RAG)'를 가장 우선시되는 절대적 번역 표준으로 적용하십시오.\n"
            "- 원문에 등장하는 성경 구절이나 신학 단어가 RAG 자료(Lao Bible Popular 2015 Version, 평행 성경 구절, 사전 문헌 등)에 포함되어 있는 경우, 임의로 라오스어 번역을 직접 창작(유추)하지 마십시오.\n"
            "- 반드시 RAG 자료에 명시된 라오어 공식 성경 구절과 번역 어휘를 그대로 가져와 번역 결과(translation, literal, preaching, contextual 필드 모두)에 정확히 반영하십시오. RAG 자료의 성경 텍스트와 철자를 100% 철저하게 보존하여 인용해야 합니다.\n\n"
            "[BIBLE REFERENCE AUTHORITY: laobible.net]\n"
            "- 번역 시 기독교 신학 용어 및 성경 구절 인용은 laobible.net(Lao Bible Popular 2015 Version 및 Spoken Lao NT)에 기재된 라오어 성경의 공식 정서법 및 어휘 선택을 최우선적으로 참조하여 번역을 구성하십시오. 임의의 라오어 조합보다 실제 현지 공식 성경 표현을 존중해야 합니다.\n\n"
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

    @staticmethod
    def _sanitize_text(text: str) -> str:
        if not text or not isinstance(text, str):
            return text
        
        # Mapping for explicit Thai to Lao consonants and vowels
        thai_to_lao_map = {
            'ก': 'ກ', 'ข': 'ຂ', 'ค': 'ຄ', 'ง': 'ງ', 'จ': 'ຈ', 'ฉ': 'ສ', 'ช': 'ຊ', 'ซ': 'ຊ',
            'ญ': 'ຍ', 'ด': 'ດ', 'ต': 'ຕ', 'ถ': 'ຖ', 'ท': 'ທ', 'ธ': 'ທ', 'น': 'ນ', 'บ': 'ບ',
            'ป': 'ປ', 'ผ': 'ຜ', 'ฝ': 'ຝ', 'พ': 'ພ', 'ฟ': 'ຟ', 'ภ': 'ພ', 'ม': 'ມ', 'ย': 'ຢ',
            'ร': 'ຣ', 'ฤ': 'ຣ', 'ล': 'ລ', 'ฃ': 'ຂ', 'ฅ': 'ຄ', 'ฆ': 'ຄ', 'ฌ': 'ຊ', 'ฑ': 'ທ',
            'ฒ': 'ທ', 'ณ': 'ນ', 'ศ': 'ສ', 'ษ': 'ສ', 'ส': 'ສ', 'ห': 'ຫ', 'ฬ': 'ລ', 'อ': 'ອ',
            'ฮ': 'ຮ',
            # Vowels & diacritics
            'ะ': 'ະ', 'ั': 'ັ', 'า': 'າ', 'ำ': 'ຳ', 'ิ': 'ິ', 'ี': 'ີ', 'ึ': 'ຶ', 'ື': 'ື',
            'ุ': 'ຸ', 'ู': 'ູ', 'เ': 'ເ', 'แ': 'ແ', 'โ': 'ໂ', 'ใ': 'ໃ', 'ไ': 'ໄ', '็': 'ັ',
            '่': '່', '้': '້', '๊': '໊', '໋': '໋', '์': '໌'
        }
        
        chars = []
        for char in text:
            if char in thai_to_lao_map:
                chars.append(thai_to_lao_map[char])
            elif '\u0e00' <= char <= '\u0e7f':
                # Generic Unicode offset shift (+0x80) from Thai block to Lao block
                lao_char_code = ord(char) + 0x80
                if 0x0e80 <= lao_char_code <= 0x0eff:
                    chars.append(chr(lao_char_code))
                else:
                    chars.append(char)
            else:
                chars.append(char)
        return "".join(chars)

    @staticmethod
    def _sanitize_result_dict(result: any) -> any:
        if isinstance(result, dict):
            return {k: TranslationEngine._sanitize_result_dict(v) for k, v in result.items()}
        elif isinstance(result, list):
            return [TranslationEngine._sanitize_result_dict(v) for v in result]
        elif isinstance(result, str):
            return TranslationEngine._sanitize_text(result)
        return result
