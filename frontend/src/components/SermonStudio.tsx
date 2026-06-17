import React, { useState } from 'react';
import { api } from '../services/api';
import type { TranslationResult } from '../types';

interface SermonStudioProps {
  apiKey: string;
  provider: string;
}

export const SermonStudio: React.FC<SermonStudioProps> = ({ apiKey, provider }) => {
  const [sermonText, setSermonText] = useState('');
  const [direction, setDirection] = useState('ko_to_lo_religious');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState('preaching');

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

  const handleExport = async (format: string) => {
    if (!result) return;
    try {
      const blob = await api.exportTranslation(result, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sermon_LSLT_Export_${new Date().toISOString().slice(0, 10)}.${format === 'markdown' ? 'md' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('내보내기 실패');
    }
  };

  return (
    <div className="workspace">
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 800 }}>설교문 전문 번역 엔진 (Sermon Studio)</h2>
        <p className="text-muted">설교문 단락을 분석하여 다각도 상황화 번역 및 문화적 충돌 검사를 실행합니다.</p>
      </div>

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
              <div style={{ display: 'flex', border: '1px solid var(--border-indigo)', borderRadius: '6px', overflow: 'hidden' }}>
                <button onClick={() => handleExport('markdown')} style={{ background: 'var(--bg-input)', border: 'none', padding: '4px 8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>MD</button>
                <button onClick={() => handleExport('html')} style={{ background: 'var(--bg-input)', border: 'none', borderLeft: '1px solid var(--border-indigo)', padding: '4px 8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>HTML</button>
                <button onClick={() => handleExport('docx')} style={{ background: 'var(--bg-input)', border: 'none', borderLeft: '1px solid var(--border-indigo)', padding: '4px 8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>DOCX</button>
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
            {/* Column 1: Conflict analysis */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-indigo)' }}>
              <h5 style={{ color: 'var(--text-ruby)', fontWeight: 700, marginBottom: '8px' }}>⚠️ 문화/종교적 충돌 요소</h5>
              <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                {result.cultural_warning ? result.cultural_warning.split('|')[0] : '불교의 공덕 사상(마치 은행 계좌에 저축하듯 선행을 보장받음)과 기독교의 전적인 은혜 구원은 개념적으로 강하게 충돌합니다. 신자들이 선행 자체를 무시하는 것처럼 가르쳐서는 안 됩니다.'}
              </p>
            </div>

            {/* Column 2: Confusing Terms */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-indigo)' }}>
              <h5 style={{ color: 'var(--text-gold)', fontWeight: 700, marginBottom: '8px' }}>🔍 오해하기 쉬운 표현 필터링</h5>
              <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                {result.cultural_warning && result.cultural_warning.split('|')[1] ? result.cultural_warning.split('|')[1] : "'바프'(ບາບ)를 남발할 시 신자들은 전생에 지은 나쁜 업으로 가난하게 태어난 사회적 신분을 연상하게 됩니다. 따라서 십자가를 통한 '대속적 해결'을 반드시 단어 뒤에 덧붙여 주십시오."}
              </p>
            </div>

            {/* Column 3: Alternative Metaphors */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-indigo)' }}>
              <h5 style={{ color: '#8CE99A', fontWeight: 700, marginBottom: '8px' }}>💡 현지 문화 은유 추천</h5>
              <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                라오스 전통 '바이씨'(Baci) 축복 의식에서 실을 묶어 액운을 쫓고 복을 빌어주는 문화적 행동을 빌려, 예수님이 성도들에게 진정한 하늘의 묶어줌과 축복을 주시는 분임을 시각적 비유로 사용하면 전달력이 배가됩니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SermonStudio;
