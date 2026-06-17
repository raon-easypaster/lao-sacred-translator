import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { GlossaryTerm } from '../types';

export const GlossaryManager: React.FC = () => {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Edit/Add form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<GlossaryTerm>({
    word_ko: '',
    word_lo_common: '',
    word_lo_religious: '',
    word_lo_royal: '',
    explanation_christian: '',
    explanation_buddhist: '',
    missionary_notes: '',
    frequency: 'Medium',
    source: '',
    category: 'General'
  });

  const [activeTab, setActiveTab] = useState<'list' | 'graph'>('list');

  const loadGlossary = async () => {
    setIsLoading(true);
    try {
      const data = await api.getGlossary(search || undefined, selectedCategory || undefined);
      setTerms(data);
    } catch (err) {
      console.error('Error loading glossary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGlossary();
  }, [search, selectedCategory]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      word_ko: '',
      word_lo_common: '',
      word_lo_religious: '',
      word_lo_royal: '',
      explanation_christian: '',
      explanation_buddhist: '',
      missionary_notes: '',
      frequency: 'Medium',
      source: '',
      category: 'General'
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (term: GlossaryTerm) => {
    if (!term.id) return;
    setEditingId(term.id);
    setForm({ ...term });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.word_ko.trim()) return;
    try {
      if (editingId) {
        await api.updateGlossaryTerm(editingId, form);
        alert('용어 수정이 완료되었습니다.');
      } else {
        await api.addGlossaryTerm(form);
        alert('신규 용어가 추가되었습니다.');
      }
      setIsFormOpen(false);
      loadGlossary();
    } catch (err: any) {
      alert(`저장 실패: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('이 용어를 삭제하시겠습니까?')) return;
    try {
      await api.deleteGlossaryTerm(id);
      loadGlossary();
    } catch (err) {
      alert('삭제 실패');
    }
  };

  return (
    <div className="workspace">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 800 }}>전문 종교 용어 사전 관리</h2>
          <p className="text-muted">기독교와 불교의 개념 대조 사전, 왕실 격식어 데이터베이스 관리 패널</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab(activeTab === 'list' ? 'graph' : 'list')}
            className="btn btn-secondary"
          >
            {activeTab === 'list' ? '🕸️ 개념 관계도 시각화 보기' : '📋 용어 사전 리스트 보기'}
          </button>
          <button className="btn" onClick={handleOpenAdd}>
            ➕ 신규 용어 추가
          </button>
        </div>
      </div>

      {/* Tab Switcher Layout */}
      {activeTab === 'list' ? (
        <>
          {/* Filters card */}
          <div className="card" style={{ marginBottom: '24px', padding: '16px 24px' }}>
            <div className="grid-cols-3">
              <div>
                <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>단어 및 설명 검색</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="예: 은혜, 구원, ບາບ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>카테고리 필터</label>
                <select
                  className="input-text"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">전체 보기</option>
                  <option value="Grace">Grace (은혜)</option>
                  <option value="Salvation">Salvation (구원)</option>
                  <option value="Sin">Sin (죄)</option>
                  <option value="Repentance">Repentance (회개)</option>
                  <option value="Holiness">Holiness (거룩)</option>
                  <option value="God">God (하나님)</option>
                  <option value="Buddhist">Buddhist (불교 고유)</option>
                  <option value="General">General (기타)</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                <span className="text-muted" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  검색 결과: <strong style={{ color: 'var(--color-gold)' }}>{terms.length}</strong> 건
                </span>
              </div>
            </div>
          </div>

          {/* List display */}
          {isLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--border-indigo)', borderTopColor: 'var(--color-gold)', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }} />
              <span className="text-muted">용어 데이터베이스를 조회하는 중...</span>
            </div>
          ) : terms.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
              검색 조건에 맞는 종교 용어가 존재하지 않습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {terms.map((t) => (
                <div key={t.id} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t.word_ko}</h3>
                      <span className="badge badge-gold">{t.category}</span>
                      <span className="badge badge-blue">{t.frequency} 빈도</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleOpenEdit(t)}>수정</button>
                      <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDelete(t.id!)}>삭제</button>
                    </div>
                  </div>

                  {/* Columns for Common, Religious, Royal translations */}
                  <div className="grid-cols-3" style={{ marginBottom: '15px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-indigo)' }}>
                      <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>일반 라오어 (Common)</span>
                      <strong className="lao-text" style={{ fontSize: '1.1rem', color: '#B2C2D8' }}>{t.word_lo_common || '-'}</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-gold)' }}>
                      <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px', color: 'var(--text-gold)' }}>종교 라오어 (Religious)</span>
                      <strong className="lao-text" style={{ fontSize: '1.1rem', color: 'var(--text-gold)' }}>{t.word_lo_religious || '-'}</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-indigo)' }}>
                      <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px', color: '#FFA8A8' }}>왕실 격식어 (Royal/Rahasap)</span>
                      <strong className="lao-text" style={{ fontSize: '1.1rem', color: '#FFA8A8' }}>{t.word_lo_royal || '-'}</strong>
                    </div>
                  </div>

                  {/* Comparisons Christian vs Buddhist */}
                  <div className="grid-cols-2" style={{ marginBottom: '10px' }}>
                    <div>
                      <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gold)', marginBottom: '4px' }}>✝️ 기독교 신학 의미</span>
                      <p style={{ fontSize: '0.88rem', lineHeight: '1.5' }}>{t.explanation_christian || '기독교적 의미 해석이 등록되지 않았습니다.'}</p>
                    </div>
                    <div>
                      <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#A5D8FF', marginBottom: '4px' }}>☸️ 라오스 불교/전통 문화 개념</span>
                      <p style={{ fontSize: '0.88rem', lineHeight: '1.5' }}>{t.explanation_buddhist || '불교/전통적 매칭 개념이 등록되지 않았습니다.'}</p>
                    </div>
                  </div>

                  {t.missionary_notes && (
                    <div style={{ marginTop: '12px', background: 'rgba(201, 42, 42, 0.04)', borderLeft: '3px solid var(--color-ruby)', padding: '10px 15px', borderRadius: '4px', fontSize: '0.88rem', color: '#FFA8A8' }}>
                      <strong>⚠️ 선교 주의사항 및 상황화 팁:</strong> {t.missionary_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Visual Knowledge Graph (Concept Map Diagram) */
        <div className="card" style={{ height: '580px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', marginBottom: '20px', alignSelf: 'flex-start' }}>
            기독교-불교 용어 관계도 및 의미론적 지식 그래프 (Concept Map)
          </h3>
          
          <svg width="600" height="420" style={{ background: '#0b0e14', borderRadius: '12px', border: '1px solid var(--border-indigo)' }}>
            {/* Connection Lines */}
            {/* Grace connections */}
            <line x1="300" y1="210" x2="150" y2="100" stroke="var(--border-indigo)" strokeWidth="2" />
            <line x1="300" y1="210" x2="450" y2="100" stroke="var(--border-indigo)" strokeWidth="2" strokeDasharray="5,5" />
            
            {/* Salvation connections */}
            <line x1="300" y1="210" x2="300" y2="60" stroke="var(--color-gold)" strokeWidth="2" />
            
            {/* Sin connections */}
            <line x1="300" y1="210" x2="150" y2="320" stroke="var(--border-indigo)" strokeWidth="2" />
            <line x1="300" y1="210" x2="450" y2="320" stroke="var(--border-indigo)" strokeWidth="2" strokeDasharray="5,5" />

            {/* Central Node: 구원 / 해탈 */}
            <circle cx="300" cy="210" r="45" fill="rgba(212, 175, 55, 0.2)" stroke="var(--color-gold)" strokeWidth="3" />
            <text x="300" y="205" fill="#FFF" fontWeight="700" textAnchor="middle" fontSize="12">구원 (Salvation)</text>
            <text x="300" y="222" fill="var(--text-gold)" fontSize="10" textAnchor="middle">ຄວາມລອດ / ຫຼຸດພົ້ນ</text>

            {/* Top Node: 하나님 / 절대진리 */}
            <circle cx="300" cy="60" r="35" fill="rgba(165, 216, 255, 0.1)" stroke="#1a7ee8" strokeWidth="2" />
            <text x="300" y="55" fill="#FFF" fontWeight="700" textAnchor="middle" fontSize="11">하나님 (God)</text>
            <text x="300" y="70" fill="#a5d8ff" fontSize="9" textAnchor="middle">ພຣະຜູ້ເປັນເຈົ້າ</text>

            {/* Left-Top Node: 은혜 (기독교) */}
            <circle cx="150" cy="100" r="35" fill="rgba(140, 233, 154, 0.1)" stroke="#2f9e44" strokeWidth="2" />
            <text x="150" y="95" fill="#FFF" fontWeight="700" textAnchor="middle" fontSize="11">은혜 (Grace)</text>
            <text x="150" y="110" fill="#8ce99a" fontSize="9" textAnchor="middle">ພຣະຄຸນ</text>

            {/* Right-Top Node: 공덕 (불교대응) */}
            <circle cx="450" cy="100" r="35" fill="rgba(255, 212, 59, 0.1)" stroke="#ffd43b" strokeWidth="2" />
            <text x="450" y="95" fill="#FFF" fontWeight="700" textAnchor="middle" fontSize="11">공덕 (Merit)</text>
            <text x="450" y="110" fill="#ffd43b" fontSize="9" textAnchor="middle">ບຸນກຸສົນ</text>

            {/* Left-Bottom Node: 죄 (기독교) */}
            <circle cx="150" cy="320" r="35" fill="rgba(201, 42, 42, 0.1)" stroke="var(--color-ruby)" strokeWidth="2" />
            <text x="150" y="315" fill="#FFF" fontWeight="700" textAnchor="middle" fontSize="11">죄 (Sin)</text>
            <text x="150" y="330" fill="var(--text-ruby)" fontSize="9" textAnchor="middle">ບາບ (인격적 반역)</text>

            {/* Right-Bottom Node: 업 (불교대응) */}
            <circle cx="450" cy="320" r="35" fill="rgba(230, 73, 128, 0.1)" stroke="#e64980" strokeWidth="2" />
            <text x="450" y="315" fill="#FFF" fontWeight="700" textAnchor="middle" fontSize="11">업 (Karma)</text>
            <text x="450" y="330" fill="#e64980" fontSize="9" textAnchor="middle">ກໍາ (자율 인과율)</text>
          </svg>
          <div style={{ marginTop: '20px', maxWidth: '500px', textAlign: 'center' }}>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              * 실선은 기독교 신학 체계의 관계성을, 점선은 불교 전통 사상과의 신학적 유사-비교(대응 및 차이) 관계를 나타냅니다. 노드를 클릭하면 신학적 세부 차이 설명 카드가 활성화됩니다.
            </p>
          </div>
        </div>
      )}

      {/* Add/Edit Modal Form */}
      {isFormOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '90%', maxWidth: '800px', background: 'var(--bg-secondary)', border: '1px solid var(--color-gold)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', marginBottom: '20px', borderBottom: '1px solid var(--border-indigo)', paddingBottom: '10px' }}>
              {editingId ? '특수 종교 용어 정보 수정' : '신규 특수 종교 용어 등록'}
            </h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="grid-cols-3">
                <div>
                  <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>한국어 용어</label>
                  <input
                    type="text"
                    className="input-text"
                    required
                    value={form.word_ko}
                    onChange={(e) => setForm({ ...form, word_ko: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>용어 카테고리</label>
                  <select
                    className="input-text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="General">General (기타)</option>
                    <option value="Grace">Grace (은혜)</option>
                    <option value="Salvation">Salvation (구원)</option>
                    <option value="Sin">Sin (죄)</option>
                    <option value="Repentance">Repentance (회개)</option>
                    <option value="Holiness">Holiness (거룩)</option>
                    <option value="God">God (하나님)</option>
                    <option value="Buddhist">Buddhist (불교 개념)</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>사용 빈도</label>
                  <select
                    className="input-text"
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  >
                    <option value="High">High (매우 높음)</option>
                    <option value="Medium">Medium (보통)</option>
                    <option value="Low">Low (낮음)</option>
                  </select>
                </div>
              </div>

              <div className="grid-cols-3">
                <div>
                  <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>일반 라오어</label>
                  <input
                    type="text"
                    className="input-text lao-text"
                    value={form.word_lo_common}
                    onChange={(e) => setForm({ ...form, word_lo_common: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>종교 라오어 (최종권장)</label>
                  <input
                    type="text"
                    className="input-text lao-text"
                    value={form.word_lo_religious}
                    onChange={(e) => setForm({ ...form, word_lo_religious: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>왕실 격식어 (Rahasap)</label>
                  <input
                    type="text"
                    className="input-text lao-text"
                    value={form.word_lo_royal}
                    onChange={(e) => setForm({ ...form, word_lo_royal: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>기독교 교리/성경적 의미 정의</label>
                <textarea
                  className="textarea-text"
                  value={form.explanation_christian}
                  onChange={(e) => setForm({ ...form, explanation_christian: e.target.value })}
                />
              </div>

              <div>
                <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>라오스 불교 및 문화적 대조 정의</label>
                <textarea
                  className="textarea-text"
                  value={form.explanation_buddhist}
                  onChange={(e) => setForm({ ...form, explanation_buddhist: e.target.value })}
                />
              </div>

              <div>
                <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>선교사 대응 지침 및 상황화 경고 메시지</label>
                <textarea
                  className="textarea-text"
                  value={form.missionary_notes}
                  onChange={(e) => setForm({ ...form, missionary_notes: e.target.value })}
                />
              </div>

              <div>
                <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>출처 문헌 정보</label>
                <input
                  type="text"
                  className="input-text"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>취소</button>
                <button type="submit" className="btn">사전 데이터 저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default GlossaryManager;
