import React, { useState } from 'react';
import { api } from '../services/api';
import type { TranslationResult } from '../types';

interface TranslationWorkspaceProps {
  apiKey: string;
  provider: string;
}

export const TranslationWorkspace: React.FC<TranslationWorkspaceProps> = ({ apiKey, provider }) => {
  const [sourceText, setSourceText] = useState('');
  const [direction, setDirection] = useState('ko_to_lo_religious');
  const [mode, setMode] = useState('missionary'); // default to missionary mode as requested
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState('vocabulary');
  const [isListening, setIsListening] = useState(false);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsLoading(true);
    try {
      const transResult = await api.translate(sourceText, direction, mode, provider, apiKey);
      setResult(transResult);
    } catch (err: any) {
      alert(`번역 오류: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Speech Recognition (STT)
  const handleStartSTT = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해 주세요.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = direction.startsWith('ko') ? 'ko-KR' : 'lo-LA';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setSourceText(prev => prev + (prev ? ' ' : '') + speechToText);
    };

    recognition.onerror = (event: any) => {
      console.error('STT error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Text to Speech (TTS)
  const handlePlayTTS = () => {
    if (!result || !result.translation) return;
    const utterance = new SpeechSynthesisUtterance(result.translation);
    
    // Attempt to select Lao voice
    utterance.lang = direction.endsWith('ko') ? 'ko-KR' : 'lo-LA';
    
    // Try to find a fitting voice on the system
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(v => v.lang.includes(direction.endsWith('ko') ? 'ko' : 'lo'));
    if (targetVoice) {
      utterance.voice = targetVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  // Export helper
  const handleExport = async (format: string) => {
    if (!result) return;
    try {
      const blob = await api.exportTranslation(result, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LSLT_Report_${new Date().toISOString().slice(0, 10)}.${format === 'markdown' ? 'md' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('다운로드 실패');
    }
  };

  return (
    <div className="workspace">
      {/* Configuration Header */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div>
              <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>번역 방향</span>
              <select
                className="input-text"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                style={{ minWidth: '220px', padding: '8px 12px' }}
              >
                <option value="ko_to_lo_religious">한국어 → 라오스 종교어</option>
                <option value="lo_religious_to_ko">라오스 종교어 → 한국어</option>
                <option value="ko_to_lo_royal">한국어 → 왕실어 (Rahasap)</option>
                <option value="lo_royal_to_ko">왕실어 → 한국어</option>
                <option value="lo_common_to_religious">현대 라오어 → 종교 라오어</option>
                <option value="lo_religious_to_common">종교 라오어 → 현대 라오어</option>
                <option value="lo_royal_to_religious">왕실어 → 종교 라오어</option>
                <option value="lo_religious_to_royal">종교 라오어 → 왕실어</option>
              </select>
            </div>
            <div>
              <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>번역 모드</span>
              <select
                className="input-text"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={{ minWidth: '180px', padding: '8px 12px' }}
              >
                <option value="standard">일반 학술 모드</option>
                <option value="missionary">선교사 모드 (상황화 설명)</option>
                <option value="sermon">설교용 번역 모드</option>
                <option value="bible">성경 번역 보조 모드</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', textAlign: 'right' }}>선택 모델</span>
            <span className="badge badge-gold" style={{ fontSize: '0.85rem', padding: '8px 16px' }}>
              {provider.toUpperCase()} {apiKey ? '• 연결됨' : '• 오프라인 사전 모드'}
            </span>
          </div>
        </div>
      </div>

      {/* Editor Split Screen */}
      <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
        {/* Left Side: Source Text Input */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '380px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 700, fontFamily: 'var(--font-title)' }}>원문 입력</span>
            <button
              onClick={handleStartSTT}
              className={`btn btn-secondary ${isListening ? 'badge-ruby' : ''}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              {isListening ? '듣고 있음...' : '음성 입력 (STT)'}
            </button>
          </div>
          <textarea
            className="textarea-text"
            placeholder={direction.startsWith('ko') ? "여기에 번역할 한국어 문장을 입력하십시오. 예: '하나님의 은혜와 은총이 성도들과 함께합니다.'" : "여기에 번역할 라오어 종교어/왕실어 문장을 입력하십시오."}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', resize: 'none', padding: 0 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-indigo)' }}>
            <span className="text-muted">{sourceText.length} 자</span>
            <button
              className="btn"
              onClick={handleTranslate}
              disabled={isLoading || !sourceText.trim()}
              style={{ minWidth: '120px' }}
            >
              {isLoading ? '번역 엔진 가동 중...' : '전문 번역 실행'}
            </button>
          </div>
        </div>

        {/* Right Side: Translation Result Output */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '380px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-title)' }}>번역 결과</span>
              {result && (
                <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                  신뢰도 {result.confidence}%
                </span>
              )}
            </div>
            {result && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handlePlayTTS}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  title="음성 읽기"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  라오어 발음 (TTS)
                </button>
                <div style={{ display: 'flex', border: '1px solid var(--border-indigo)', borderRadius: '6px', overflow: 'hidden' }}>
                  <button onClick={() => handleExport('markdown')} style={{ background: 'var(--bg-input)', border: 'none', padding: '6px 8px', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Markdown 내보내기">MD</button>
                  <button onClick={() => handleExport('html')} style={{ background: 'var(--bg-input)', border: 'none', borderLeft: '1px solid var(--border-indigo)', padding: '6px 8px', color: 'var(--text-secondary)', cursor: 'pointer' }} title="HTML 내보내기">HTML</button>
                  <button onClick={() => handleExport('docx')} style={{ background: 'var(--bg-input)', border: 'none', borderLeft: '1px solid var(--border-indigo)', padding: '6px 8px', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Word DOCX 내보내기">DOCX</button>
                </div>
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '15px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--border-indigo)', borderTopColor: 'var(--color-gold)', animation: 'spin 1s linear infinite' }} />
                <span className="text-muted">RAG 문헌 탐색 및 상황화 번역 중...</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : result ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <p className="lao-text" style={{ fontSize: '1.25rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', borderLeft: '3px solid var(--color-gold)', paddingLeft: '12px' }}>
                  {result.translation}
                </p>
                
                {/* Secondary Styles */}
                <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border-indigo)' }}>
                  <div style={{ fontSize: '0.85rem' }}><strong style={{ color: 'var(--color-gold)' }}>직역(Literal):</strong> {result.literal}</div>
                  <div style={{ fontSize: '0.85rem' }}><strong style={{ color: 'var(--color-gold)' }}>의역(Contextual):</strong> {result.contextual}</div>
                  <div style={{ fontSize: '0.85rem' }}><strong style={{ color: 'var(--color-gold)' }}>설교체(Preaching):</strong> <span className="lao-text" style={{ fontSize: '0.95rem' }}>{result.preaching}</span></div>
                </div>
              </div>
            ) : (
              <p className="text-muted" style={{ textAlign: 'center', marginTop: '80px' }}>
                번역 실행 버튼을 누르시면 RAG기반 전문 용어 번역이 이곳에 표시됩니다.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Panel: Vocabulary, Warning, Commentary & Sources */}
      {result && (
        <div className="card">
          <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-indigo)', paddingBottom: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => setActiveBottomTab('vocabulary')}
              className={`btn ${activeBottomTab === 'vocabulary' ? '' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              매칭 용어 사전 ({result.vocabulary?.length || 0})
            </button>
            <button
              onClick={() => setActiveBottomTab('warnings')}
              className={`btn ${activeBottomTab === 'warnings' ? '' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              선교학 상황화 경고 (현지 분석)
            </button>
            <button
              onClick={() => setActiveBottomTab('commentary')}
              className={`btn ${activeBottomTab === 'commentary' ? '' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              문화 및 신학 해설
            </button>
            <button
              onClick={() => setActiveBottomTab('sources')}
              className={`btn ${activeBottomTab === 'sources' ? '' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              RAG 학습 출처
            </button>
          </div>

          <div style={{ minHeight: '150px' }}>
            {/* Tab: Vocabulary */}
            {activeBottomTab === 'vocabulary' && (
              <div>
                {result.vocabulary && result.vocabulary.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-indigo)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>단어</th>
                        <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>일반 라오어</th>
                        <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>종교 라오어</th>
                        <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>왕실어 (Rahasap)</th>
                        <th style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>설명</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.vocabulary.map((vocab, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 600 }}>{vocab.word}</td>
                          <td className="lao-text" style={{ padding: '12px 8px', color: '#B2C2D8' }}>{vocab.common || '-'}</td>
                          <td className="lao-text" style={{ padding: '12px 8px', color: 'var(--text-gold)', fontWeight: 600 }}>{vocab.religious || '-'}</td>
                          <td className="lao-text" style={{ padding: '12px 8px', color: '#FFA8A8' }}>{vocab.royal || '-'}</td>
                          <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{vocab.meaning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted">학습된 매칭 특수 사도/신학 용어가 발견되지 않았습니다.</p>
                )}
              </div>
            )}

            {/* Tab: Warnings */}
            {activeBottomTab === 'warnings' && (
              <div style={{ background: 'rgba(201, 42, 42, 0.05)', borderLeft: '4px solid var(--color-ruby)', padding: '16px', borderRadius: '4px' }}>
                <h4 style={{ color: 'var(--text-ruby)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  라오스 불교 문화권 오해 예방 정보 (Missionary contextual warnings)
                </h4>
                <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#FFA8A8', whiteSpace: 'pre-wrap' }}>
                  {result.cultural_warning || '주의할 점: 라오스는 강력한 불교 문화 국가로서, 서구의 죄(Sin)나 구원(Salvation), 은혜(Grace) 등의 개념을 일반어 단어로 직역할 경우 업보(Karma)나 공덕(Merit) 보상 사상으로 축소 왜곡해 받아들일 확률이 90% 이상입니다.'}
                </p>
              </div>
            )}

            {/* Tab: Commentary */}
            {activeBottomTab === 'commentary' && (
              <div style={{ lineHeight: '1.7', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                <h4 style={{ color: 'var(--text-gold)', fontWeight: 700, marginBottom: '8px' }}>신학적 & 교리 문화적 개념 대응 비교</h4>
                <p style={{ fontSize: '0.95rem' }}>{result.commentary}</p>
              </div>
            )}

            {/* Tab: Sources */}
            {activeBottomTab === 'sources' && (
              <div>
                <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>RAG 지식 검색 기반 문헌 출처</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {result.source.split(',').map((src, index) => (
                    <span key={index} className="badge badge-gold" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                      📖 {src.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default TranslationWorkspace;
