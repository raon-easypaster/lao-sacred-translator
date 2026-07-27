import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { BibleVerseItem } from '../types';

export const BibleStudy: React.FC = () => {
  const [verses, setVerses] = useState<BibleVerseItem[]>([]);
  const [selectedBook, setSelectedBook] = useState('요한복음 (John)');
  const [selectedChapter, setSelectedChapter] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<BibleVerseItem | null>(null);

  const loadVerses = async () => {
    setIsLoading(true);
    try {
      const list = await api.getBibleVerses(selectedBook, selectedChapter);
      setVerses(list);
      if (list.length > 0) {
        setSelectedVerse(list[0]);
      }
    } catch (err) {
      console.error('Error fetching Bible verses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVerses();
  }, [selectedBook, selectedChapter]);

  // Export report
  const handleExportBibleStudy = () => {
    if (verses.length === 0) return;
    
    let report = `# 성경 본문 연구 보고서: ${selectedBook} ${selectedChapter}장\n\n`;
    verses.forEach(v => {
      report += `## ${selectedBook} ${v.chapter}:${v.verse}\n\n`;
      report += `| 언어/스타일 | 구절 본문 |\n`;
      report += `|---|---|\n`;
      report += `| **한국어** | ${v.text_ko} |\n`;
      report += `| **일반 라오어** | ${v.text_lo_common || '-'} |\n`;
      report += `| **종교 라오어** | ${v.text_lo_religious || '-'} |\n`;
      report += `| **왕실 라오어** | ${v.text_lo_royal || '-'} |\n\n`;
      if (v.comments) {
        report += `**언어학적 및 신학적 주해:**\n${v.comments}\n\n`;
      }
      report += `---\n\n`;
    });

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BibleStudy_LSLT_${selectedBook.replace(/\s/g, '')}_Ch${selectedChapter}.md`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="workspace">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 800 }}>성경 본문 연구 모드</h2>
          <p className="text-muted">다양한 라오어 문체(일반/종교/왕실) 구절 대조 및 주해 분석 시스템</p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-gold)', background: 'rgba(212,175,55,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-gold)', fontWeight: 600 }}>📚 참조 레퍼런스 공식 권위처</span>
            <a href="https://laobible.net/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--text-link)', textDecoration: 'underline', fontWeight: 600 }}>laobible.net (라오 성경 온라인) 바로가기 ↗</a>
          </div>
        </div>
        <button
          className="btn"
          onClick={handleExportBibleStudy}
          disabled={verses.length === 0}
        >
          📖 연구 보고서 출력 (Markdown)
        </button>
      </div>

      {/* Selectors Panel */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div>
            <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>성경 선택</label>
            <select
              className="input-text"
              value={selectedBook}
              onChange={(e) => setSelectedBook(e.target.value)}
              style={{ minWidth: '180px', padding: '8px 12px' }}
            >
              <option value="요한복음 (John)">요한복음 (John)</option>
              <option value="창세기 (Genesis)">창세기 (Genesis)</option>
            </select>
          </div>
          <div>
            <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>장(Chapter)</label>
            <select
              className="input-text"
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(Number(e.target.value))}
              style={{ minWidth: '100px', padding: '8px 12px' }}
            >
              <option value="1">1장</option>
              <option value="3">3장</option>
            </select>
          </div>
        </div>
      </div>

      {/* Parallel Bible Viewer Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {isLoading ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--border-indigo)', borderTopColor: 'var(--color-gold)', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }} />
            <span className="text-muted">성경 본문 및 평행 번역 데이터를 불러오는 중...</span>
          </div>
        ) : verses.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
            선택한 장의 평행 성경 구절이 데이터베이스에 등록되어 있지 않습니다.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '24px' }}>
            {/* Left Column: Side-by-Side Verse Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {verses.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVerse(v)}
                  style={{
                    background: selectedVerse?.id === v.id ? 'rgba(212, 175, 55, 0.05)' : 'var(--bg-card)',
                    border: selectedVerse?.id === v.id ? '1px solid var(--color-gold)' : '1px solid var(--border-indigo)',
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--color-gold)', fontSize: '1.1rem' }}>
                      {v.verse}절
                    </span>
                    <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>Parallel View</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                    <div>
                      <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>한국어 개역개정</span>
                      <p style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>{v.text_ko}</p>
                    </div>
                    <div>
                      <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600, color: '#A5D8FF' }}>현대 일반 라오어</span>
                      <p className="lao-text" style={{ fontSize: '1rem', color: '#B2C2D8' }}>{v.text_lo_common}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                    <div>
                      <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600, color: 'var(--text-gold)' }}>공식/종교어 번역</span>
                      <p className="lao-text" style={{ fontSize: '1.05rem', color: 'var(--text-gold)' }}>{v.text_lo_religious}</p>
                    </div>
                    <div>
                      <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600, color: '#FFA8A8' }}>왕실 격식어 (Rahasap)</span>
                      <p className="lao-text" style={{ fontSize: '1.05rem', color: '#FFA8A8' }}>{v.text_lo_royal}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Linguistic & Theological Commentary Drawer */}
            <div className="card" style={{ height: 'fit-content', position: 'sticky', top: '90px' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', borderBottom: '1px solid var(--border-indigo)', paddingBottom: '10px', marginBottom: '15px' }}>
                구절별 어휘 주해 및 언어 분석
              </h3>
              {selectedVerse ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h5 style={{ color: 'var(--color-gold)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>구절 식별</h5>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {selectedBook} {selectedVerse.chapter}장 {selectedVerse.verse}절
                    </span>
                  </div>

                  <div>
                    <h5 style={{ color: 'var(--color-gold)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>주요 어휘 분석</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-indigo)' }}>
                      {selectedVerse.verse === 16 ? (
                        <>
                          <div>• <strong>하나님</strong> → ພຣະຜູ້ເປັນເຈົ້າ (종교체) / ພຣະຜູ້ສ້າງສັບພະສິ່ງ (창조주를 강조하는 왕실어)</div>
                          <div>• <strong>독생자</strong> → ພຣະບຸດ (일반 종교체) / ພຣະຣາຊໂອຣົດ (왕실어)</div>
                          <div>• <strong>멸망</strong> → ຈິບຫາຍ (소멸/파멸) / ເຖິງແກ່ມໍຣະນະ (왕실어 격식 서거)</div>
                        </>
                      ) : (
                        <>
                          <div>• <strong>태초에</strong> → ໃນເລີ່ມຕົ້ນ (시작 시) / ໃນປຖົມມະການ (창세기 고유 종교어)</div>
                          <div>• <strong>창조</strong> → ຊົງສ້າງ (행위자 존칭형) / ເນລະມິດສ້າງ (신비한 무에서의 창조 왕실어)</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 style={{ color: 'var(--color-gold)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>번역 주석 및 선교 상황화 노트</h5>
                    <p style={{ fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {selectedVerse.comments || '주해 해설이 없습니다.'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted">좌측 구절 목록에서 항목을 클릭하시면 상세 언어 구조 분석이 로드됩니다.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default BibleStudy;
