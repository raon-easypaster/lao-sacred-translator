import os
import re
from typing import Dict, Any, List
from pypdf import PdfReader
from docx import Document as DocxDocument
from bs4 import BeautifulSoup
import requests
from app.core.config import settings

class DocumentParser:
    @staticmethod
    def parse_file(file_path: str, file_type: str) -> str:
        """Parses document file to extract plain text."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        file_type = file_type.lower().strip(".")
        
        if file_type == "pdf":
            return DocumentParser._parse_pdf(file_path)
        elif file_type == "docx":
            return DocumentParser._parse_docx(file_path)
        elif file_type in ["html", "htm"]:
            return DocumentParser._parse_html(file_path)
        elif file_type == "epub":
            return DocumentParser._parse_epub(file_path)
        elif file_type in ["txt", "md"]:
            return DocumentParser._parse_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    @staticmethod
    def _parse_pdf(file_path: str) -> str:
        reader = PdfReader(file_path)
        text = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text.append(page_text)
        return "\n\n".join(text)

    @staticmethod
    def _parse_docx(file_path: str) -> str:
        doc = DocxDocument(file_path)
        text = [paragraph.text for paragraph in doc.paragraphs]
        return "\n".join(text)

    @staticmethod
    def _parse_html(file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            soup = BeautifulSoup(f.read(), "html.parser")
            return soup.get_text(separator="\n")

    @staticmethod
    def _parse_epub(file_path: str) -> str:
        # Simple fallback parsing for EPUB, treating as HTML if needed,
        # or extracting raw text. Ebooks are zip archives containing XHTML.
        # We can extract text chunks easily.
        import zipfile
        text = []
        try:
            with zipfile.ZipFile(file_path, 'r') as epub:
                for file_name in epub.namelist():
                    if file_name.endswith(('.xhtml', '.html', '.htm')):
                        with epub.open(file_name) as f:
                            soup = BeautifulSoup(f.read(), "html.parser")
                            text.append(soup.get_text(separator="\n"))
        except Exception as e:
            # Basic fallback
            return f"EPUB parsing error: {str(e)}"
        return "\n\n".join(text)

    @staticmethod
    def _parse_txt(file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    @staticmethod
    def chunk_text(text: str, max_chunk_size: int = 1000) -> List[str]:
        """Splits text into paragraphs or logical chunks."""
        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = ""
        
        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            if len(current_chunk) + len(p) + 2 <= max_chunk_size:
                current_chunk += ("\n\n" + p if current_chunk else p)
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                if len(p) > max_chunk_size:
                    # Force split long paragraph
                    words = p.split()
                    temp_chunk = ""
                    for word in words:
                        if len(temp_chunk) + len(word) + 1 <= max_chunk_size:
                            temp_chunk += (" " + word if temp_chunk else word)
                        else:
                            chunks.append(temp_chunk)
                            temp_chunk = word
                    current_chunk = temp_chunk
                else:
                    current_chunk = p
                    
        if current_chunk:
            chunks.append(current_chunk)
            
        return chunks

    @staticmethod
    def extract_theological_metadata(text: str, api_key: str = None) -> Dict[str, str]:
        """Extracts key theological aspects, summaries, and concepts from text."""
        preview = text[:4000]
        
        # If API key is available, use Gemini or OpenAI to get premium extraction
        if api_key or settings.GEMINI_API_KEY:
            key = api_key or settings.GEMINI_API_KEY
            try:
                prompt = (
                    "종교 문헌 텍스트의 일부를 분석하여 아래 JSON 형식으로 요약해 주세요. "
                    "반드시 JSON 형태로만 답변해 주세요. 다른 텍스트는 생략해 주세요.\n"
                    "출력 형식:\n"
                    "{\n"
                    "  \"summary\": \"문헌의 전체 요약\",\n"
                    "  \"theological_meaning\": \"신학적/교리적 의의\",\n"
                    "  \"key_concepts\": \"핵심 개념 및 용어들 (쉼표로 구분)\",\n"
                    "  \"historical_context\": \"역사적/문화적 배경 설명\",\n"
                    "  \"people\": \"언급된 인물들 (쉼표로 구분)\",\n"
                    "  \"places\": \"언급된 장소들 (쉼표로 구분)\"\n"
                    "}\n\n"
                    f"분석할 텍스트:\n{preview}"
                )
                
                headers = {"Content-Type": "application/json"}
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"responseMimeType": "application/json"}
                }
                
                response = requests.post(url, headers=headers, json=payload, timeout=15)
                if response.status_code == 200:
                    import json
                    result = response.json()
                    content = result["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(content)
            except Exception as e:
                # If error, fallback to heuristics
                pass

        # Heuristic fallback
        summary = "이 문헌은 라오어 종교언어 및 용어 연구를 위한 학습 데이터입니다."
        if len(text) > 200:
            summary = text[:150] + "..."
            
        # Extract simple concepts
        concepts = ["기독교", "불교", "은혜", "구원", "신앙", "선교", "교회", "라오스"]
        found_concepts = [c for c in concepts if c in text]
        if not found_concepts:
            found_concepts = ["라오어", "신학", "용어"]
            
        return {
            "summary": summary,
            "theological_meaning": "그리스도의 사랑과 복음의 현지 문화적 소통 및 종교적 뉘앙스 탐구.",
            "key_concepts": ", ".join(found_concepts),
            "historical_context": "현대 라오스 불교 사회와 기독교 선교 초기의 언어 장벽 극복 과정.",
            "people": "선교사, 성경 번역자, 현지 교사",
            "places": "비엔티안, 루앙프라방, 라오스"
        }
