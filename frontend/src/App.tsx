import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TranslationWorkspace from './components/TranslationWorkspace';
import SermonStudio from './components/SermonStudio';
import BibleStudy from './components/BibleStudy';
import GlossaryManager from './components/GlossaryManager';
import DocumentCenter from './components/DocumentCenter';
import { api } from './services/api';
import './styles/global.css';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Settings states
  const [provider, setProvider] = useState(() => localStorage.getItem('lslt_provider') || 'gemini');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('lslt_api_key') || '');
  const [embeddingProvider, setEmbeddingProvider] = useState(() => localStorage.getItem('lslt_embedding_provider') || 'local');
  const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem('lslt_gemini_model') || 'gemini-3.6-flash');
  const [claudeKey, setClaudeKey] = useState(() => localStorage.getItem('lslt_claude_key') || '');
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem('lslt_openai_key') || '');
  const [googleAuth, setGoogleAuth] = useState<{ authenticated: boolean; email: string; project: string }>({ authenticated: false, email: '', project: '' });
  const [oauthPolling, setOauthPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { localStorage.setItem('lslt_provider', provider); }, [provider]);
  useEffect(() => { localStorage.setItem('lslt_api_key', apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem('lslt_embedding_provider', embeddingProvider); }, [embeddingProvider]);
  useEffect(() => { localStorage.setItem('lslt_gemini_model', geminiModel); }, [geminiModel]);
  useEffect(() => { localStorage.setItem('lslt_claude_key', claudeKey); }, [claudeKey]);
  useEffect(() => { localStorage.setItem('lslt_openai_key', openaiKey); }, [openaiKey]);

  // 앱 시작 시 Google OAuth 상태 확인
  useEffect(() => {
    api.oauthStatus().then(setGoogleAuth).catch(() => {});
  }, []);

  const handleGoogleConnect = async () => {
    try {
      const { url } = await api.oauthStart();
      // Electron에서는 시스템 기본 브라우저(Chrome)로 열어야 Google 로그인 가능
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.openExternal) {
        electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
      setOauthPolling(true);
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        const status = await api.oauthStatus();
        if (status.authenticated || attempts > 150) {
          clearInterval(pollRef.current!);
          setOauthPolling(false);
          setGoogleAuth(status);
          if (status.authenticated) setProvider('gemini');
        }
      }, 2000);
    } catch (e) {
      alert('Google 연결 시작 실패: ' + String(e));
    }
  };

  const handleGoogleDisconnect = async () => {
    await api.oauthDisconnect();
    setGoogleAuth({ authenticated: false, email: '', project: '' });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    // Claude/OpenAI 키를 apiKey로도 전달 (provider에 따라)
    if (provider === 'claude' && claudeKey) setApiKey(claudeKey);
    if (provider === 'openai' && openaiKey) setApiKey(openaiKey);
    if (provider === 'gemini' && !googleAuth.authenticated) setApiKey(apiKey);
    alert('설정이 저장되었습니다.');
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
            {(apiKey || googleAuth.authenticated || claudeKey || openaiKey) ? (
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
            <TranslationWorkspace
              apiKey={provider === 'claude' ? (claudeKey || apiKey) : provider === 'openai' ? (openaiKey || apiKey) : apiKey}
              provider={provider}
              geminiModel={geminiModel}
            />
          )}

          {currentView === 'sermon' && (
            <SermonStudio
              apiKey={provider === 'claude' ? (claudeKey || apiKey) : provider === 'openai' ? (openaiKey || apiKey) : apiKey}
              provider={provider}
              geminiModel={geminiModel}
            />
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
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 800 }}>AI 번역 엔진 설정</h2>
                <p className="text-muted">구독 중인 생성형 AI 서비스를 연결하거나 API 키를 입력하여 번역 엔진을 구성합니다.</p>
              </div>

              {/* 공급자 선택 */}
              <div className="card" style={{ maxWidth: '640px', marginBottom: '18px' }}>
                <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 600 }}>기본 번역 공급자</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {(['gemini', 'claude', 'openai'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setProvider(p)}
                      style={{
                        padding: '8px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', border: '2px solid',
                        borderColor: provider === p ? '#d4af37' : 'var(--border-indigo)',
                        background: provider === p ? 'rgba(212,175,55,0.12)' : 'transparent',
                        color: provider === p ? '#d4af37' : 'var(--text-secondary)'
                      }}
                    >
                      {p === 'gemini' ? 'Google Gemini' : p === 'claude' ? 'Anthropic Claude' : 'OpenAI GPT'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Google Gemini */}
              <div className="card" style={{ maxWidth: '640px', marginBottom: '18px' }}>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.4rem' }}>G</span> Google Gemini
                  {googleAuth.authenticated && <span style={{ fontSize: '0.75rem', background: 'rgba(140,233,154,0.15)', color: '#8ce99a', padding: '2px 10px', borderRadius: '20px', marginLeft: 'auto' }}>● 연결됨</span>}
                </h3>

                {/* 구독 연동 */}
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--border-indigo)', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px' }}>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    Gemini Advanced 등 유료 구독 계정을 연동하면 <strong>API 키 없이</strong> 사용 가능합니다.
                  </p>
                  {googleAuth.authenticated ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#8ce99a' }}>✅ {googleAuth.email}</span>
                      <button onClick={handleGoogleDisconnect} style={{ padding: '5px 14px', borderRadius: '6px', border: '1px solid rgba(220,50,50,0.4)', background: 'rgba(220,50,50,0.1)', color: '#ff8080', cursor: 'pointer', fontSize: '0.8rem' }}>연결 해제</button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGoogleConnect}
                      disabled={oauthPolling}
                      style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--border-indigo)', background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', cursor: oauthPolling ? 'wait' : 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                    >
                      {oauthPolling ? '⏳ 로그인 대기 중...' : 'Google 계정 연결'}
                    </button>
                  )}
                </div>

                {/* API 키 (선택) */}
                <label className="text-muted" style={{ display: 'block', fontSize: '0.82rem', marginBottom: '5px', fontWeight: 600 }}>Gemini API Key (선택 — 구독 연동 시 불필요)</label>
                <input type="password" className="input-text" placeholder="AIza..." value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ marginBottom: '8px' }} />
                <label className="text-muted" style={{ display: 'block', fontSize: '0.82rem', marginBottom: '5px', fontWeight: 600 }}>모델명</label>
                <input type="text" className="input-text" placeholder="gemini-3.6-flash" value={geminiModel} onChange={e => setGeminiModel(e.target.value)} />
              </div>

              {/* Anthropic Claude */}
              <div className="card" style={{ maxWidth: '640px', marginBottom: '18px' }}>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>✦</span> Anthropic Claude
                </h3>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--border-indigo)', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px' }}>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '0' }}>
                    Claude는 API 키 인증 방식을 사용합니다. <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#d4af37' }}>console.anthropic.com</a>에서 키를 발급받으세요.
                  </p>
                </div>
                <label className="text-muted" style={{ display: 'block', fontSize: '0.82rem', marginBottom: '5px', fontWeight: 600 }}>Claude API Key</label>
                <input type="password" className="input-text" placeholder="sk-ant-..." value={claudeKey} onChange={e => { setClaudeKey(e.target.value); if (provider === 'claude') setApiKey(e.target.value); }} />
              </div>

              {/* OpenAI */}
              <div className="card" style={{ maxWidth: '640px', marginBottom: '18px' }}>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>⬡</span> OpenAI GPT
                </h3>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--border-indigo)', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px' }}>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '0' }}>
                    OpenAI는 API 키 인증 방식을 사용합니다. <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: '#d4af37' }}>platform.openai.com</a>에서 키를 발급받으세요.
                  </p>
                </div>
                <label className="text-muted" style={{ display: 'block', fontSize: '0.82rem', marginBottom: '5px', fontWeight: 600 }}>OpenAI API Key</label>
                <input type="password" className="input-text" placeholder="sk-..." value={openaiKey} onChange={e => { setOpenaiKey(e.target.value); if (provider === 'openai') setApiKey(e.target.value); }} />
              </div>

              {/* RAG 설정 */}
              <div className="card" style={{ maxWidth: '640px', marginBottom: '18px' }}>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', marginBottom: '14px' }}>RAG 벡터 임베딩</h3>
                <select className="input-text" value={embeddingProvider} onChange={e => setEmbeddingProvider(e.target.value)}>
                  <option value="local">로컬 TF-IDF (기본 · 오프라인 권장)</option>
                  <option value="gemini">Gemini text-embedding-004</option>
                  <option value="openai">OpenAI text-embedding-3-small</option>
                </select>
              </div>

              <button onClick={handleSaveSettings} className="btn" style={{ maxWidth: '640px', width: '100%' }}>
                💾 설정 저장
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default App;
