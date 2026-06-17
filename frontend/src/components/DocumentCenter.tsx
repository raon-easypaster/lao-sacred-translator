import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { DocumentItem, SearchResultItem } from '../types';

interface DocumentCenterProps {
  apiKey: string;
}

export const DocumentCenter: React.FC<DocumentCenterProps> = ({ apiKey }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const loadDocuments = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setIsUploading(true);
    try {
      const doc = await api.uploadDocument(uploadFile, apiKey || undefined, 'local');
      alert(`문헌 '${doc.name}' 업로드 및 RAG 벡터 DB 인덱싱이 완료되었습니다.`);
      setUploadFile(null);
      
      // Clear file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      loadDocuments();
    } catch (err: any) {
      alert(`업로드 실패: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (id: number) => {
    if (!window.confirm('이 문헌을 삭제하고 모든 RAG 벡터 인덱스를 파기하시겠습니까?')) return;
    try {
      await api.deleteDocument(id);
      setDocuments(documents.filter(d => d.id !== id));
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
      alert('문헌 삭제 완료');
    } catch (err) {
      alert('삭제 실패');
    }
  };

  const handleSearchRAG = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await api.searchKnowledgeBase(searchQuery, 4);
      setSearchResults(results);
    } catch (err) {
      alert('RAG 검색 실패');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="workspace">
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 800 }}>학습 문헌 센터 & RAG 시스템</h2>
        <p className="text-muted">번역 사전 및 컨텍스트 보강을 위해 신학 서적, 사전, 교재 자료를 벡터화하여 적재합니다.</p>
      </div>

      {/* RAG Knowledge base search engine */}
      <div className="card" style={{ marginBottom: '30px', border: '1px solid var(--color-gold)' }}>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '15px', color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          지식 베이스 의미론적 검색 (RAG Vector Search)
        </h3>
        <form onSubmit={handleSearchRAG} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input
            type="text"
            className="input-text"
            placeholder="업로드된 도서 전체에서 개념이나 문장을 입력하여 검색하세요. 예: '은혜의 정의', 'Karma vs Grace'"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn" disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? '지식 탐색 중...' : 'RAG 검색'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-gold)', fontWeight: 600 }}>매칭 구절 검색 결과 ({searchResults.length})</h4>
            {searchResults.map((res, index) => (
              <div key={index} style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-indigo)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-gold)', fontWeight: 600 }}>📖 출처: {res.document_name}</span>
                  <span className="badge badge-green">유사도: {Math.round(res.score * 100)}%</span>
                </div>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>{res.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid-cols-2">
        {/* Left: Document List & Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Upload card */}
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', marginBottom: '15px', borderBottom: '1px solid var(--border-indigo)', paddingBottom: '8px' }}>
              신규 참고 문헌 업로드
            </h3>
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label className="text-muted" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px' }}>지원 포맷: PDF, DOCX, TXT, EPUB, HTML</label>
                <input
                  id="file-input"
                  type="file"
                  className="input-text"
                  required
                  accept=".pdf,.docx,.txt,.md,.epub,.html,.htm"
                  onChange={handleFileChange}
                />
              </div>
              <button type="submit" className="btn" disabled={isUploading || !uploadFile}>
                {isUploading ? '문헌 OCR 및 RAG 벡터 인덱싱 중...' : '📤 문헌 업로드 및 데이터 학습'}
              </button>
            </form>
          </div>

          {/* Document list */}
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', marginBottom: '15px', borderBottom: '1px solid var(--border-indigo)', paddingBottom: '8px' }}>
              학습 완료 문헌 데이터베이스
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
              {documents.length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '30px' }}>학습된 문헌이 없습니다.</p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    style={{
                      padding: '12px 15px',
                      background: selectedDoc?.id === doc.id ? 'rgba(212, 175, 55, 0.06)' : 'rgba(255,255,255,0.01)',
                      border: selectedDoc?.id === doc.id ? '1px solid var(--color-gold)' : '1px solid var(--border-indigo)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>{doc.name}</div>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {doc.file_type.toUpperCase()} • {new Date(doc.upload_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="badge badge-green">{doc.db_status}</span>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 8px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDoc(doc.id);
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Document Profile Metadata */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', marginBottom: '20px', borderBottom: '1px solid var(--border-indigo)', paddingBottom: '10px' }}>
            AI 문헌 종교적 정밀 분석 프로필
          </h3>
          {selectedDoc ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>도서 및 문서명</span>
                <strong style={{ fontSize: '1.1rem' }}>{selectedDoc.name}</strong>
              </div>

              <div>
                <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>1. 요약 (Summary)</span>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.5', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px' }}>
                  {selectedDoc.summary}
                </p>
              </div>

              <div>
                <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>2. 신학적/교리적 의의 (Theological Significance)</span>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.5' }}>{selectedDoc.theological_meaning}</p>
              </div>

              <div>
                <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>3. 주요 개념어 (Key Concepts)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {selectedDoc.key_concepts.split(',').map((concept, idx) => (
                    <span key={idx} className="badge badge-gold">{concept.trim()}</span>
                  ))}
                </div>
              </div>

              <div className="grid-cols-2">
                <div>
                  <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>4. 언급 인물</span>
                  <span style={{ fontSize: '0.88rem' }}>{selectedDoc.people || '없음'}</span>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>5. 관련 장소</span>
                  <span style={{ fontSize: '0.88rem' }}>{selectedDoc.places || '없음'}</span>
                </div>
              </div>

              <div>
                <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>6. 역사적/문화적 배경 설명</span>
                <p style={{ fontSize: '0.88rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                  {selectedDoc.historical_context}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-secondary)' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '15px', color: 'var(--border-indigo)' }}>
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
              <p>좌측 도서 데이터베이스에서 문헌을 선택하시면<br />AI가 사전 처리한 신학 분석 프로필을 확인할 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default DocumentCenter;
