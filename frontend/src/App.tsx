import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TranslationWorkspace from './components/TranslationWorkspace';
import SermonStudio from './components/SermonStudio';
import BibleStudy from './components/BibleStudy';
import GlossaryManager from './components/GlossaryManager';
import DocumentCenter from './components/DocumentCenter';
import './styles/global.css';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Settings states
  const [provider, setProvider] = useState(() => localStorage.getItem('lslt_provider') || 'gemini');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('lslt_api_key') || '');
  const [embeddingProvider, setEmbeddingProvider] = useState(() => localStorage.getItem('lslt_embedding_provider') || 'local');
  const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem('lslt_gemini_model') || 'gemini-3.6-flash');

  useEffect(() => {
    localStorage.setItem('lslt_provider', provider);
  }, [provider]);

  useEffect(() => {
    localStorage.setItem('lslt_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('lslt_embedding_provider', embeddingProvider);
  }, [embeddingProvider]);

  useEffect(() => {
    localStorage.setItem('lslt_gemini_model', geminiModel);
  }, [geminiModel]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    alert('AI 번역 모델 설정이 브라우저 로컬 저장소에 저장되었습니다.');
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'LSLT 통합 제어 대시보드';
      case 'translate': return '전문 종교언어 번역 스튜디오';
      case 'sermon': return '설교문 상황화 번역 및 문화화 분석기';
      case 'bible': return '평행 성경 연구 & 원어 주석 대조';
      case 'glossary': return '기독교-불교 개념 대조 및 왕실어 전문 사전';
      case 'documents': return 'RAG 벡터 학습 문헌 라이브러리';
      case 'settings': return 'LSLT AI 번역 엔진 설정';
      default: return 'Lao Sacred Language Translator';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main Panel */}
      <div className="main-content">
        {/* Header bar */}
        <header className="app-header">
          <div className="header-title">
            <h1>{getViewTitle()}</h1>
          </div>
          <div className="header-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8ce99a', boxShadow: '0 0 8px #8ce99a' }} />
              <span className="text-muted">서버 연결 상태: <strong>정상 (Active)</strong></span>
            </div>
            {apiKey ? (
              <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>온라인 LLM 모드</span>
            ) : (
              <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>로컬 데이터베이스 모드</span>
            )}
          </div>
        </header>

        {/* Content routing */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {currentView === 'dashboard' && (
            <Dashboard onNavigate={setCurrentView} apiKey={apiKey} />
          )}

          {currentView === 'translate' && (
            <TranslationWorkspace apiKey={apiKey} provider={provider} geminiModel={geminiModel} />
          )}

          {currentView === 'sermon' && (
            <SermonStudio apiKey={apiKey} provider={provider} geminiModel={geminiModel} />
          )}

          {currentView === 'bible' && (
            <BibleStudy />
          )}

          {currentView === 'glossary' && (
            <GlossaryManager />
          )}

          {currentView === 'documents' && (
            <DocumentCenter apiKey={apiKey} />
          )}

          {currentView === 'settings' && (
            <div className="workspace">
              <div style={{ marginBottom: '25px' }}>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 800 }}>AI 번역 프롬프트 엔진 및 RAG 설정</h2>
                <p className="text-muted">실시간 다국어 번역과 벡터 임베딩을 구성하는 모델 서비스의 계정을 조율합니다.</p>
              </div>

              <div className="card" style={{ maxWidth: '600px' }}>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', marginBottom: '20px', borderBottom: '1px solid var(--border-indigo)', paddingBottom: '8px' }}>
                  엔진 커넥터 설정
                </h3>
                <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>기본 LLM 서비스 공급자</label>
                    <select
                      className="input-text"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                    >
                      <option value="gemini">Google Gemini (추천)</option>
                      <option value="openai">OpenAI GPT</option>
                      <option value="claude">Anthropic Claude</option>
                    </select>
                  </div>

                  {provider === 'gemini' && (
                    <div>
                      <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Gemini 모델명</label>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="예: gemini-3.6-flash"
                        value={geminiModel}
                        onChange={(e) => setGeminiModel(e.target.value)}
                      />
                      <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                        * Google AI Studio의 활성화된 모델명을 입력하십시오. (기본값: gemini-3.6-flash)
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>API 인증 키 (API Key)</label>
                    <input
                      type="password"
                      className="input-text"
                      placeholder="API 인증 키를 입력하십시오."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                      * API 키가 입력되지 않으면 로컬 데이터베이스의 규칙 사전 매핑을 활용해 오프라인 번역 모드로 구동됩니다.
                    </span>
                  </div>

                  <div>
                    <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>RAG 벡터 임베딩 모델</label>
                    <select
                      className="input-text"
                      value={embeddingProvider}
                      onChange={(e) => setEmbeddingProvider(e.target.value)}
                    >
                      <option value="local">로컬 TF-IDF 하이브리드 인덱싱 (기본 및 오프라인 권장)</option>
                      <option value="gemini">Gemini text-embedding-004 API</option>
                      <option value="openai">OpenAI text-embedding-3-small API</option>
                    </select>
                  </div>

                  <div style={{ background: 'rgba(212, 175, 55, 0.05)', border: '1px solid var(--border-gold)', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                    <h5 style={{ color: 'var(--text-gold)', fontWeight: 700, marginBottom: '6px' }}>📶 오프라인 모드 및 동기화</h5>
                    <p style={{ fontSize: '0.82rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                      라오스 현지 등 인터넷이 불안정한 선교지 환경을 지원하기 위해 로컬 SQLite 캐시와 사전 데이터 동기화 기능이 활성화되어 있습니다. 온라인 연결 시 로컬 변경사항이 마스터 DB로 병합됩니다.
                    </p>
                  </div>

                  <button type="submit" className="btn" style={{ marginTop: '10px' }}>
                    💾 설정 값 브라우저 저장
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default App;
