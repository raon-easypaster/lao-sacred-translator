import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { TranslationResult, SermonReviewItem, SermonHistoryLog } from '../types';

interface SermonStudioProps {
  apiKey: string;
  provider: string;
}

export const SermonStudio: React.FC<SermonStudioProps> = ({ apiKey, provider }) => {
  // Mode toggle: 'translate' or 'review'
  const [activeTab, setActiveTab] = useState<'translate' | 'review'>('translate');

  // --- Translation Mode States ---
  const [sermonText, setSermonText] = useState('');
  const [direction, setDirection] = useState('ko_to_lo_religious');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState('preaching');

  // --- Review Mode States ---
  const [sermons, setSermons] = useState<SermonReviewItem[]>([]);
  const [selectedSermon, setSelectedSermon] = useState<SermonReviewItem | null>(null);
  const [isLoadingSermons, setIsLoadingSermons] = useState(false);

  // Editor states for selected sermon
  const [editTitle, setEditTitle] = useState('');
  const [editLiteral, setEditLiteral] = useState('');
  const [editPreaching, setEditPreaching] = useState('');
  const [editContextual, setEditContextual] = useState('');
  const [editSmallgroup, setEditSmallgroup] = useState('');
  const [reviewerStage, setReviewerStage] = useState<'ai' | 'local_reviewer' | 'missionary_reviewer' | 'approved'>('ai');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [historyLogs, setHistoryLogs] = useState<SermonHistoryLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Toggle register viewing in Review panel
  const [activeReviewRegister, setActiveReviewRegister] = useState<'preaching' | 'contextual' | 'literal' | 'smallgroup'>('preaching');

  const loadSermonList = async () => {
    setIsLoadingSermons(true);
    try {
      const data = await api.getSermons();
      setSermons(data);
    } catch (err) {
      console.error('Error fetching sermons:', err);
    } finally {
      setIsLoadingSermons(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'review') {
      loadSermonList();
    }
  }, [activeTab]);

  const handleTranslateSermon = async () => {
    if (!sermonText.trim()) return;
    setIsLoading(true);
    try {
      const transResult = await api.translate(sermonText, direction, 'sermon', provider, apiKey);
      setResult(transResult);
    } catch (err: any) {
      alert(`설교 번역 실패: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToReviewProjects = async () => {
    if (!result) return;
    const defaultTitle = `설교 - ${new Date().toISOString().slice(0, 10)}`;
    const title = window.prompt('설교 검수 프로젝트 제목을 입력하세요:', defaultTitle);
    if (title === null) return; // Cancelled
    
    try {
      const newSermon: SermonReviewItem = {
        title: title.trim() || defaultTitle,
        source_text: sermonText,
        trans_literal: result.literal || result.translation,
        trans_preaching: result.preaching || result.translation,
        trans_contextual: result.contextual || result.translation,
        trans_smallgroup: result.translation.replace('ພຣະອົງ', 'ພຣະເຍຊູ').replace('ພຣະຜູ້ເປັນເຈົ້າ', 'ພຣະເຈົ້າ'),
        reviewer_stage: 'ai',
        approved: false
      };
      
      await api.saveSermon(newSermon);
      alert('설교 검수 대시보드에 번역본이 등록되었습니다. [설교 검수 대시보드] 탭에서 확인하실 수 있습니다.');
    } catch (err: any) {
      alert(`저장 실패: ${err.message}`);
    }
  };

  const handleSelectSermon = (sermon: SermonReviewItem) => {
    setSelectedSermon(sermon);
    setEditTitle(sermon.title);
    setEditLiteral(sermon.trans_literal || '');
    setEditPreaching(sermon.trans_preaching || '');
    setEditContextual(sermon.trans_contextual || '');
    setEditSmallgroup(sermon.trans_smallgroup || '');
    setReviewerStage(sermon.reviewer_stage);
    setReviewerNotes('');
    setReviewerName('');
    
    let logs: SermonHistoryLog[] = [];
    if (sermon.history_json) {
      try {
        logs = JSON.parse(sermon.history_json);
      } catch (e) {
        logs = [];
      }
    }
    setHistoryLogs(logs);
  };

  const handleSaveSermonEdits = async () => {
    if (!selectedSermon || !selectedSermon.id) return;
    setIsSaving(true);
    try {
      const payload: Partial<SermonReviewItem> & { reviewer_name?: string } = {
        title: editTitle,
        trans_literal: editLiteral,
        trans_preaching: editPreaching,
        trans_contextual: editContextual,
        trans_smallgroup: editSmallgroup,
        reviewer_stage: reviewerStage,
        reviewer_notes: reviewerNotes,
        approved: reviewerStage === 'approved',
        reviewer_name: reviewerName.trim() || 'Anonymous Reviewer'
      };

      const updated = await api.updateSermon(selectedSermon.id, payload);
      setSelectedSermon(updated);
      setSermons(sermons.map(s => s.id === updated.id ? updated : s));
      
      let logs: SermonHistoryLog[] = [];
      if (updated.history_json) {
        try {
          logs = JSON.parse(updated.history_json);
        } catch (e) {
          logs = [];
        }
      }
      setHistoryLogs(logs);
      setReviewerNotes('');
      alert('검수 및 수정본이 저장되었습니다.');
    } catch (err: any) {
      alert(`수정 실패: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSermon = async (id: number) => {
    if (!window.confirm('이 설교 검수 프로젝트를 영구 삭제하시겠습니까?')) return;
    try {
      await api.deleteSermon(id);
      setSermons(sermons.filter(s => s.id !== id));
      if (selectedSermon?.id === id) {
        setSelectedSermon(null);
      }
      alert('삭제 완료');
    } catch (err: any) {
      alert(`삭제 실패: ${err.message}`);
    }
  };

  const handleExportText = (title: string, text: string) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s/g, '_')}_final.md`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const renderStageBadge = (stage: string) => {
    switch (stage) {
      case 'ai':
        return <span className="badge badge-ruby">1차 AI 번역</span>;
      case 'local_reviewer':
        return <span className="badge badge-blue">2차 현지인 검수</span>;
      case 'missionary_reviewer':
        return <span className="badge badge-gold">3차 선교사 검수</span>;
      case 'approved':
        return <span className="badge badge-green">4차 최종 승인</span>;
      default:
        return <span className="badge">{stage}</span>;
    }
  };

  return (
    <div className="workspace">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 800 }}>설교문 스튜디오 (Sermon Studio)</h2>
          <p className="text-muted">설교문 단락을 분석하고 다중 문체 상황화 번역 및 다단계 검수 워크플로우를 진행합니다.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('translate')}
            className={`btn ${activeTab === 'translate' ? '' : 'btn-secondary'}`}
          >
            ✍️ 설교문 번역 실행
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`btn ${activeTab === 'review' ? '' : 'btn-secondary'}`}
          >
            📋 설교 검수 대시보드
          </button>
        </div>
      </div>

      {activeTab === 'translate' ? (
        <>
          <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
            {/* Left Side: Sermon Text Ingestion */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '450px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-title)' }}>설교 원고 입력 (한국어/라오어)</span>
                <select
                  className="input-text"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  style={{ width: '200px', padding: '6px 12px' }}
                >
                  <option value="ko_to_lo_religious">한국어 → 라오어 종교체</option>
                  <option value="lo_religious_to_ko">라오어 종교체 → 한국어</option>
                </select>
              </div>
              <textarea
                className="textarea-text"
                placeholder="설교 한 단락을 입력하십시오. 예: '우리가 예수를 믿는 이유는 우리의 어떠한 선한 행동이나 고행 때문이 아니라, 오직 예수 그리스도의 십자가 대속의 은혜 때문입니다. 라오스 형제 자매 여러분, 공덕을 쌓아서 구원에 이르려는 마음을 내려놓고 주님의 은혜를 받아들이십시오.'"
                value={sermonText}
                onChange={(e) => setSermonText(e.target.value)}
                style={{ flex: 1, resize: 'none', background: 'transparent', border: 'none', padding: 0 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-indigo)' }}>
                <span className="text-muted">{sermonText.length} 자</span>
                <button
                  className="btn"
                  onClick={handleTranslateSermon}
                  disabled={isLoading || !sermonText.trim()}
                >
                  {isLoading ? '4개 스타일 번역 생성 중...' : '설교 상황화 번역 실행'}
                </button>
              </div>
            </div>

            {/* Right Side: Tabbed Multi-Version Outputs */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '450px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-indigo)', paddingBottom: '10px' }}>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-title)' }}>스타일별 번역 출력</span>
                {result && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="btn"
                      onClick={handleSaveToReviewProjects}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--text-gold)', border: '1px solid var(--border-gold)', boxShadow: 'none' }}
                    >
                      💾 검수 프로젝트로 저장
                    </button>
                    <div style={{ display: 'flex', border: '1px solid var(--border-indigo)', borderRadius: '6px', overflow: 'hidden' }}>
                      <button onClick={() => api.exportTranslation(result, 'markdown').then(b => handleExportText('Sermon', result.translation))} style={{ background: 'var(--bg-input)', border: 'none', padding: '4px 8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>MD</button>
                      <button onClick={() => api.exportTranslation(result, 'html').then(b => handleExportText('Sermon', result.translation))} style={{ background: 'var(--bg-input)', border: 'none', borderLeft: '1px solid var(--border-indigo)', padding: '4px 8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>HTML</button>
                    </div>
                  </div>
                )}
              </div>

              {result ? (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Output Tab Switches */}
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                    <button
                      onClick={() => setActiveOutputTab('preaching')}
                      className={`btn ${activeOutputTab === 'preaching' ? '' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                    >
                      B. 설교체 (경어/종교체)
                    </button>
                    <button
                      onClick={() => setActiveOutputTab('contextual')}
                      className={`btn ${activeOutputTab === 'contextual' ? '' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                    >
                      C. 현지인 친화형 (불교권)
                    </button>
                    <button
                      onClick={() => setActiveOutputTab('literal')}
                      className={`btn ${activeOutputTab === 'literal' ? '' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                    >
                      A. 직역본 (성경 구체)
                    </button>
                    <button
                      onClick={() => setActiveOutputTab('smallgroup')}
                      className={`btn ${activeOutputTab === 'smallgroup' ? '' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                    >
                      D. 소그룹/대화체
                    </button>
                  </div>

                  {/* Text display according to tab selection */}
                  <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-indigo)' }}>
                    {activeOutputTab === 'preaching' && (
                      <div>
                        <h5 style={{ color: 'var(--text-gold)', marginBottom: '8px', fontWeight: 600 }}>설교용 번역본 (예배 설교에 권장)</h5>
                        <p className="lao-text" style={{ fontSize: '1.15rem' }}>{result.preaching}</p>
                      </div>
                    )}
                    {activeOutputTab === 'contextual' && (
                      <div>
                        <h5 style={{ color: '#8CE99A', marginBottom: '8px', fontWeight: 600 }}>현지인 친화형 번역본 (불교 청중에 부드러운 설명)</h5>
                        <p className="lao-text" style={{ fontSize: '1.15rem' }}>{result.contextual}</p>
                      </div>
                    )}
                    {activeOutputTab === 'literal' && (
                      <div>
                        <h5 style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>직역본 (어순 및 원문 번역 대조)</h5>
                        <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{result.literal}</p>
                        <p className="lao-text" style={{ fontSize: '1.15rem', marginTop: '10px' }}>{result.translation}</p>
                      </div>
                    )}
                    {activeOutputTab === 'smallgroup' && (
                      <div>
                        <h5 style={{ color: '#A5D8FF', marginBottom: '8px', fontWeight: 600 }}>소그룹 성경공부 및 구어 번역체</h5>
                        <p className="lao-text" style={{ fontSize: '1.1rem' }}>
                          {result.translation.replace('ພຣະອົງ', 'ພຣະເຍຊູ').replace('ພຣະຜູ້ເປັນເຈົ້າ', 'ພຣະເຈົ້າ')} (소그룹 대화형 변환 적용)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--border-indigo)', borderTopColor: 'var(--color-gold)', animation: 'spin 1s linear infinite' }} />
                      <span>설교문 분석 및 스타일별 번역 생성 중...</span>
                    </div>
                  ) : (
                    <p>설교 원고를 입력하고 실행하십시오.<br />직역/설교체/현지인 상황화/소그룹교재 4버전이 동시 자동 생성됩니다.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Contextualization Checker (문화화 검사) */}
          {result && (
            <div className="card" style={{ borderLeft: '4px solid var(--color-gold)' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '15px', color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                  <line x1="12" y1="2" x2="12" y2="4" />
                  <line x1="12" y1="20" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="4" y2="12" />
                  <line x1="20" y1="12" x2="22" y2="12" />
                </svg>
                AI 설교 문화화(Contextualization) 및 종교 충돌 분석 결과
              </h3>

              <div className="grid-cols-3">
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-indigo)' }}>
                  <h5 style={{ color: 'var(--text-ruby)', fontWeight: 700, marginBottom: '8px' }}>⚠️ 문화/종교적 충돌 요소</h5>
                  <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                    {result.cultural_warning ? result.cultural_warning.split('|')[0] : '불교의 공덕 사상과 기독교의 전적인 은혜 구원은 개념적으로 강하게 충돌합니다.'}
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-indigo)' }}>
                  <h5 style={{ color: 'var(--text-gold)', fontWeight: 700, marginBottom: '8px' }}>🔍 오해하기 쉬운 표현 필터링</h5>
                  <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                    {result.cultural_warning && result.cultural_warning.split('|')[1] ? result.cultural_warning.split('|')[1] : "'바프'(ບາບ)를 남발할 시 전생에 지은 업을 연상하게 됩니다."}
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-indigo)' }}>
                  <h5 style={{ color: '#8CE99A', fontWeight: 700, marginBottom: '8px' }}>💡 현지 문화 은유 추천</h5>
                  <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                    라오스 전통 '바이씨'(Baci) 축복의 손목 실 매기 의식을 십자가의 묶어주는 축복에 은유하여 설명하세요.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* --- Sermon Review Dashboard View --- */
        <div style={{ display: 'grid', gridTemplateColumns: '30% 70%', gap: '24px' }}>
          {/* Left panel: List of sermons */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '650px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', borderBottom: '1px solid var(--border-indigo)', paddingBottom: '10px', marginBottom: '15px' }}>
              검수 프로젝트 목록
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
              {isLoadingSermons ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>목록 조회 중...</div>
              ) : sermons.length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '40px' }}>검수 대기 중인 설교가 없습니다.</p>
              ) : (
                sermons.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSermon(s)}
                    style={{
                      background: selectedSermon?.id === s.id ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: selectedSermon?.id === s.id ? '1px solid var(--color-gold)' : '1px solid var(--border-indigo)',
                      borderRadius: '10px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {s.timestamp ? new Date(s.timestamp).toLocaleDateString() : 'N/A'}
                      </span>
                      {renderStageBadge(s.reviewer_stage)}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.title}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel: Editor Workspace */}
          <div className="card" style={{ height: '650px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {selectedSermon ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', color: 'var(--text-gold)', fontWeight: 800 }}>
                    설교 검수 및 번역 교정
                  </h3>
                  <button
                    onClick={() => handleDeleteSermon(selectedSermon.id!)}
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    프로젝트 삭제
                  </button>
                </div>

                <div className="grid-cols-2">
                  <div>
                    <label className="text-muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>프로젝트 제목</label>
                    <input
                      type="text"
                      className="input-text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      disabled={reviewerStage === 'approved'}
                    />
                  </div>
                  <div>
                    <label className="text-muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>승인 및 잠금 상태</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px' }}>
                      {selectedSermon.approved ? (
                        <span className="badge badge-green">🔒 최종 승인 완료 (읽기 전용)</span>
                      ) : (
                        <span className="badge badge-ruby">🔓 검수 및 편집 진행 중</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>설교 원고 (원문)</label>
                  <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-indigo)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {selectedSermon.source_text}
                  </div>
                </div>

                {/* Registers tab selector */}
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>번역 문체별 편집 교정</label>
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                    <button onClick={() => setActiveReviewRegister('preaching')} className={`btn ${activeReviewRegister === 'preaching' ? '' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}>B. 설교용 번역</button>
                    <button onClick={() => setActiveReviewRegister('contextual')} className={`btn ${activeReviewRegister === 'contextual' ? '' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}>C. 현지인 친화형</button>
                    <button onClick={() => setActiveReviewRegister('literal')} className={`btn ${activeReviewRegister === 'literal' ? '' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}>A. 직역본</button>
                    <button onClick={() => setActiveReviewRegister('smallgroup')} className={`btn ${activeReviewRegister === 'smallgroup' ? '' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}>D. 소그룹교재용</button>
                  </div>

                  <div>
                    {activeReviewRegister === 'preaching' && (
                      <textarea
                        className="textarea-text lao-text"
                        value={editPreaching}
                        onChange={(e) => setEditPreaching(e.target.value)}
                        disabled={reviewerStage === 'approved'}
                        style={{ minHeight: '120px' }}
                      />
                    )}
                    {activeReviewRegister === 'contextual' && (
                      <textarea
                        className="textarea-text lao-text"
                        value={editContextual}
                        onChange={(e) => setEditContextual(e.target.value)}
                        disabled={reviewerStage === 'approved'}
                        style={{ minHeight: '120px' }}
                      />
                    )}
                    {activeReviewRegister === 'literal' && (
                      <textarea
                        className="textarea-text lao-text"
                        value={editLiteral}
                        onChange={(e) => setEditLiteral(e.target.value)}
                        disabled={reviewerStage === 'approved'}
                        style={{ minHeight: '120px' }}
                      />
                    )}
                    {activeReviewRegister === 'smallgroup' && (
                      <textarea
                        className="textarea-text lao-text"
                        value={editSmallgroup}
                        onChange={(e) => setEditSmallgroup(e.target.value)}
                        disabled={reviewerStage === 'approved'}
                        style={{ minHeight: '120px' }}
                      />
                    )}
                  </div>
                  {reviewerStage === 'approved' && (
                    <span className="text-ruby" style={{ fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                      ※ 최종 승인 단계에서는 텍스트 수정이 불가능합니다. 수정을 원하시면 단계를 낮춰주십시오.
                    </span>
                  )}
                </div>

                <hr style={{ border: '0', borderTop: '1px solid var(--border-indigo)', margin: '10px 0' }} />

                {/* Review Stage & Log inputs */}
                <div className="grid-cols-3">
                  <div>
                    <label className="text-muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>검수 단계</label>
                    <select
                      className="input-text"
                      value={reviewerStage}
                      onChange={(e) => setReviewerStage(e.target.value as any)}
                    >
                      <option value="ai">1차 AI 번역</option>
                      <option value="local_reviewer">2차 현지인 검수</option>
                      <option value="missionary_reviewer">3차 선교사 검수</option>
                      <option value="approved">4차 최종 승인 및 잠금</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>검수 주체 (이름)</label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="검수자 성명"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      disabled={reviewerStage === 'approved'}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      onClick={() => {
                        const curText = activeReviewRegister === 'preaching' ? editPreaching : (activeReviewRegister === 'contextual' ? editContextual : (activeReviewRegister === 'literal' ? editLiteral : editSmallgroup));
                        handleExportText(`${editTitle}_${activeReviewRegister}`, curText);
                      }}
                      className="btn btn-secondary"
                      style={{ width: '100%', height: '42px', padding: 0 }}
                    >
                      📄 현재 텍스트 다운로드
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>변경 피드백 및 검수 코멘트</label>
                  <textarea
                    className="textarea-text"
                    placeholder="수정한 문체 설명 및 신학적 조언 코멘트를 남기세요."
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    disabled={reviewerStage === 'approved'}
                    style={{ minHeight: '60px' }}
                  />
                </div>

                <div>
                  <button
                    onClick={handleSaveSermonEdits}
                    className="btn"
                    disabled={isSaving}
                    style={{ width: '100%', height: '46px' }}
                  >
                    {isSaving ? '수정 사항 반영 중...' : '💾 검수 및 변경 사항 저장'}
                  </button>
                </div>

                {/* History version logs */}
                {historyLogs.length > 0 && (
                  <div style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-indigo)', borderRadius: '8px', padding: '15px' }}>
                    <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-gold)', marginBottom: '10px' }}>
                      📋 변경 이력 로그 (Revision History Log)
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                      {historyLogs.map((log, idx) => (
                        <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ fontWeight: 600 }}>{log.reviewer}</span>
                            <span className="text-muted">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <div style={{ color: 'var(--text-gold)', marginBottom: '3px' }}>{log.changes}</div>
                          {log.notes && <div className="text-muted" style={{ fontStyle: 'italic' }}>Notes: {log.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)', textAlign: 'center' }}>
                <p>좌측 설교 프로젝트 목록에서 검수할 항목을 선택하십시오.<br />버전 히스토리, 변경 내용 코멘트 및 4가지 문체 개별 교정이 가능합니다.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default SermonStudio;
