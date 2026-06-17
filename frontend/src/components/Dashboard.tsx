import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { TranslationHistoryItem } from '../types';

interface DashboardProps {
  onNavigate: (view: string) => void;
  apiKey: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, apiKey }) => {
  const [stats, setStats] = useState({
    translationsCount: 0,
    documentsCount: 0,
    glossaryCount: 0,
    approvedCount: 0
  });
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<TranslationHistoryItem | null>(null);
  const [editTranslation, setEditTranslation] = useState('');
  const [reviewerStage, setReviewerStage] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadDashboardData = async () => {
    try {
      const historyList = await api.getHistory();
      setHistory(historyList);
      
      const docList = await api.getDocuments();
      const glossList = await api.getGlossary();
      
      const approved = historyList.filter(h => h.approved).length;
      
      setStats({
        translationsCount: historyList.length,
        documentsCount: docList.length,
        glossaryCount: glossList.length,
        approvedCount: approved
      });
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSelectHistoryItem = (item: TranslationHistoryItem) => {
    setSelectedItem(item);
    setEditTranslation(item.translated_text);
    setReviewerStage(item.reviewer_stage);
    setReviewerNotes(item.reviewer_notes || '');
  };

  const handleSaveVerification = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      const approved = reviewerStage === 'approved';
      const updated = await api.updateVerification(
        selectedItem.id,
        reviewerStage,
        reviewerNotes,
        editTranslation,
        approved
      );
      
      setHistory(history.map(h => h.id === updated.id ? updated : h));
      setSelectedItem(updated);
      
      // Recalculate stats
      const approvedCount = history.map(h => h.id === updated.id ? updated : h).filter(h => h.approved).length;
      setStats(prev => ({ ...prev, approvedCount }));
      
      alert('검수 정보가 업데이트되었습니다.');
    } catch (err) {
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHistory = async (id: number) => {
    if (!window.confirm('이 번역 이력을 삭제하시겠습니까?')) return;
    try {
      await api.deleteHistoryItem(id);
      setHistory(history.filter(h => h.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
      loadDashboardData();
    } catch (err) {
      alert('삭제에 실패했습니다.');
    }
  };

  // Helper for rendering workflow state badges
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
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 800 }}>플랫폼 대시보드</h2>
        <p className="text-muted">라오스 종교 및 왕실 언어 번역 엔진 작업 현황 통계</p>
      </div>

      {/* Stats Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '30px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span className="text-muted" style={{ fontWeight: 600 }}>총 번역 건수</span>
          <span style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-gold)' }}>
            {stats.translationsCount}
          </span>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>AI 및 검수 진행 데이터 포함</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span className="text-muted" style={{ fontWeight: 600 }}>학습 문헌 수</span>
          <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#A5D8FF' }}>
            {stats.documentsCount}
          </span>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>PDF, DOCX, EPUB RAG 자료</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span className="text-muted" style={{ fontWeight: 600 }}>누적 용어집 단어</span>
          <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#FFD43B' }}>
            {stats.glossaryCount}
          </span>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>일반/종교/왕실 대조 어휘</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span className="text-muted" style={{ fontWeight: 600 }}>최종 승인 완료율</span>
          <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#8CE99A' }}>
            {stats.translationsCount > 0 
              ? `${Math.round((stats.approvedCount / stats.translationsCount) * 100)}%` 
              : '0%'}
          </span>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>{stats.approvedCount} / {stats.translationsCount} 승인 완료</span>
        </div>
      </div>

      {/* Main Grid: Translation History & Verification Panel */}
      <div className="grid-cols-2">
        {/* Left Side: Recent Translation List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', borderBottom: '1px solid var(--border-indigo)', paddingBottom: '10px' }}>
            최근 번역 이력 및 검수 상태
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto', paddingRight: '5px' }}>
            {history.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '40px' }}>기록된 번역 작업이 없습니다.</p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectHistoryItem(item)}
                  style={{
                    background: selectedItem?.id === item.id ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: selectedItem?.id === item.id ? '1px solid var(--color-gold)' : '1px solid var(--border-indigo)',
                    borderRadius: '10px',
                    padding: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {renderStageBadge(item.reviewer_stage)}
                      <span className="badge badge-gold">AI {item.confidence}%</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <strong>원문:</strong> {item.source_text}
                  </p>
                  <p className="lao-text" style={{ fontSize: '1rem', color: '#B2C2D8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <strong>번역:</strong> {item.translated_text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Verification Details Form */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', borderBottom: '1px solid var(--border-indigo)', paddingBottom: '10px', marginBottom: '20px' }}>
            번역 검수 워크플로우 제어판
          </h3>
          
          {selectedItem ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="text-muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>원문 (한국어/라오어)</label>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid var(--border-indigo)', fontSize: '0.95rem' }}>
                  {selectedItem.source_text}
                </div>
              </div>

              <div>
                <label className="text-muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>최종 번역 텍스트 수정</label>
                <textarea
                  className="textarea-text lao-text"
                  value={editTranslation}
                  onChange={(e) => setEditTranslation(e.target.value)}
                  style={{ minHeight: '100px' }}
                />
              </div>

              <div className="grid-cols-2">
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>검수 단계 설정</label>
                  <select
                    className="input-text"
                    value={reviewerStage}
                    onChange={(e) => setReviewerStage(e.target.value)}
                    style={{ background: 'var(--bg-input)' }}
                  >
                    <option value="ai">1차 AI 번역 완료</option>
                    <option value="local_reviewer">2차 현지인(Language) 검수</option>
                    <option value="missionary_reviewer">3차 선교사(Mission) 검수</option>
                    <option value="approved">4차 최종 승인 및 잠금</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>작업 카테고리</label>
                  <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid var(--border-indigo)' }}>
                    {selectedItem.category.toUpperCase()}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>검수자 코멘트 및 변경 이력</label>
                <textarea
                  className="textarea-text"
                  placeholder="오역 수정 이유, 뉘앙스 차이, 문화적 해설 등을 기록하세요."
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  className="btn"
                  onClick={handleSaveVerification}
                  disabled={isSaving}
                  style={{ flex: 1 }}
                >
                  {isSaving ? '저장 중...' : '검수 상태 저장'}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteHistory(selectedItem.id)}
                  style={{ padding: '12px' }}
                  title="기록 삭제"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '15px', color: 'var(--border-indigo)' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p>좌측 번역 목록에서 항목을 선택하여<br />리뷰 단계 관리 및 번역 텍스트를 교정하십시오.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
