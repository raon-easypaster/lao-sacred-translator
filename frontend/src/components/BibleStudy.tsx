import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { BibleVerseItem } from '../types';

const BIBLE_BOOKS = [
  "창세기 (Genesis)", "출애굽기 (Exodus)", "레위기 (Leviticus)", "민수기 (Numbers)", "신명기 (Deuteronomy)",
  "여호수아 (Joshua)", "사사기 (Judges)", "룻기 (Ruth)", "사무엘상 (1 Samuel)", "사무엘하 (2 Samuel)",
  "열왕기상 (1 Kings)", "열왕기하 (2 Kings)", "역대기상 (1 Chronicles)", "역대기하 (2 Chronicles)",
  "에스라 (Ezra)", "느헤미야 (Nehemiah)", "에스더 (Esther)", "욥기 (Job)", "시편 (Psalms)",
  "잠언 (Proverbs)", "전도서 (Ecclesiastes)", "아가 (Song of Solomon)", "이사야 (Isaiah)",
  "예레미야 (Jeremiah)", "예레미야 애가 (Lamentations)", "에스겔 (Ezekiel)", "다니엘 (Daniel)",
  "호세아 (Hosea)", "요엘 (Joel)", "아모스 (Amos)", "오바디아 (Obadiah)", "요나 (Jonah)",
  "미가 (Micah)", "나훔 (Nahum)", "하박국 (Habakkuk)", "스바냐 (Zephaniah)", "학개 (Haggai)",
  "스가랴 (Zechariah)", "말라기 (Malachi)",
  "마태복음 (Matthew)", "마가복음 (Mark)", "누가복음 (Luke)", "요한복음 (John)", "사도행전 (Acts)",
  "로마서 (Romans)", "고린도전서 (1 Corinthians)", "고린도후서 (2 Corinthians)", "갈라디아서 (Galatians)",
  "에베소서 (Ephesians)", "빌립보서 (Philippians)", "골로새서 (Colossians)", "데살로니가전서 (1 Thessalonians)",
  "데살로니가후서 (2 Thessalonians)", "디모데전서 (1 Timothy)", "디모데후서 (2 Timothy)", "디도서 (Titus)",
  "빌레몬서 (Philemon)", "히브리서 (Hebrews)", "야고보서 (James)", "베드로전서 (1 Peter)",
  "베드로후서 (2 Peter)", "요한일서 (1 John)", "요한이서 (2 John)", "요한삼서 (3 John)",
  "유다서 (Jude)", "요한계시록 (Revelation)"
];

const getChapterCount = (bookName: string): number => {
  if (bookName.includes("창세기") || bookName.includes("Genesis")) return 50;
  if (bookName.includes("출애굽기") || bookName.includes("Exodus")) return 40;
  if (bookName.includes("레위기") || bookName.includes("Leviticus")) return 27;
  if (bookName.includes("민수기") || bookName.includes("Numbers")) return 36;
  if (bookName.includes("신명기") || bookName.includes("Deuteronomy")) return 34;
  if (bookName.includes("여호수아") || bookName.includes("Joshua")) return 24;
  if (bookName.includes("사사기") || bookName.includes("Judges")) return 21;
  if (bookName.includes("룻기") || bookName.includes("Ruth")) return 4;
  if (bookName.includes("사무엘상") || bookName.includes("1 Samuel")) return 31;
  if (bookName.includes("사무엘하") || bookName.includes("2 Samuel")) return 24;
  if (bookName.includes("열왕기상") || bookName.includes("1 Kings")) return 22;
  if (bookName.includes("열왕기하") || bookName.includes("2 Kings")) return 25;
  if (bookName.includes("역대기상") || bookName.includes("1 Chronicles")) return 29;
  if (bookName.includes("역대기하") || bookName.includes("2 Chronicles")) return 36;
  if (bookName.includes("에스라") || bookName.includes("Ezra")) return 10;
  if (bookName.includes("느헤미야") || bookName.includes("Nehemiah")) return 13;
  if (bookName.includes("에스더") || bookName.includes("Esther")) return 10;
  if (bookName.includes("욥기") || bookName.includes("Job")) return 42;
  if (bookName.includes("시편") || bookName.includes("Psalms")) return 150;
  if (bookName.includes("잠언") || bookName.includes("Proverbs")) return 31;
  if (bookName.includes("전도서") || bookName.includes("Ecclesiastes")) return 12;
  if (bookName.includes("아가") || bookName.includes("Song of Solomon")) return 8;
  if (bookName.includes("이사야") || bookName.includes("Isaiah")) return 66;
  if (bookName.includes("예레미야") || bookName.includes("Jeremiah")) return 52;
  if (bookName.includes("예레미야 애가") || bookName.includes("Lamentations")) return 5;
  if (bookName.includes("에스겔") || bookName.includes("Ezekiel")) return 48;
  if (bookName.includes("다니엘") || bookName.includes("Daniel")) return 12;
  if (bookName.includes("호세아") || bookName.includes("Hosea")) return 14;
  if (bookName.includes("요엘") || bookName.includes("Joel")) return 3;
  if (bookName.includes("아모스") || bookName.includes("Amos")) return 9;
  if (bookName.includes("오바디아") || bookName.includes("Obadiah")) return 1;
  if (bookName.includes("요나") || bookName.includes("Jonah")) return 4;
  if (bookName.includes("미가") || bookName.includes("Micah")) return 7;
  if (bookName.includes("나훔") || bookName.includes("Nahum")) return 3;
  if (bookName.includes("하박국") || bookName.includes("Habakkuk")) return 3;
  if (bookName.includes("스바냐") || bookName.includes("Zephaniah")) return 3;
  if (bookName.includes("학개") || bookName.includes("Haggai")) return 2;
  if (bookName.includes("스가랴") || bookName.includes("Zechariah")) return 14;
  if (bookName.includes("말라기") || bookName.includes("Malachi")) return 4;
  if (bookName.includes("마태복음") || bookName.includes("Matthew")) return 28;
  if (bookName.includes("마가복음") || bookName.includes("Mark")) return 16;
  if (bookName.includes("누가복음") || bookName.includes("Luke")) return 24;
  if (bookName.includes("요한복음") || bookName.includes("John")) return 21;
  if (bookName.includes("사도행전") || bookName.includes("Acts")) return 28;
  if (bookName.includes("로마서") || bookName.includes("Romans")) return 16;
  if (bookName.includes("고린도전서") || bookName.includes("1 Corinthians")) return 16;
  if (bookName.includes("고린도후서") || bookName.includes("2 Corinthians")) return 13;
  if (bookName.includes("갈라디아서") || bookName.includes("Galatians")) return 6;
  if (bookName.includes("에베소서") || bookName.includes("Ephesians")) return 6;
  if (bookName.includes("빌립보서") || bookName.includes("Philippians")) return 4;
  if (bookName.includes("골로새서") || bookName.includes("Colossians")) return 4;
  if (bookName.includes("데살로니가전서") || bookName.includes("1 Thessalonians")) return 5;
  if (bookName.includes("데살로니가후서") || bookName.includes("2 Thessalonians")) return 3;
  if (bookName.includes("디모데전서") || bookName.includes("1 Timothy")) return 6;
  if (bookName.includes("디모데후서") || bookName.includes("2 Timothy")) return 4;
  if (bookName.includes("디도서") || bookName.includes("Titus")) return 3;
  if (bookName.includes("빌레몬서") || bookName.includes("Philemon")) return 1;
  if (bookName.includes("히브리서") || bookName.includes("Hebrews")) return 13;
  if (bookName.includes("야고보서") || bookName.includes("James")) return 5;
  if (bookName.includes("베드로전서") || bookName.includes("1 Peter")) return 5;
  if (bookName.includes("베드로후서") || bookName.includes("2 Peter")) return 3;
  if (bookName.includes("요한일서") || bookName.includes("1 John")) return 5;
  if (bookName.includes("요한이서") || bookName.includes("2 John")) return 1;
  if (bookName.includes("요한삼서") || bookName.includes("3 John")) return 1;
  if (bookName.includes("유다서") || bookName.includes("Jude")) return 1;
  if (bookName.includes("요한계시록") || bookName.includes("Revelation")) return 22;
  return 50;
};

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
    const maxCh = getChapterCount(selectedBook);
    if (selectedChapter > maxCh) {
      setSelectedChapter(1);
    }
  }, [selectedBook]);

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

  const handleExportBibleJson = async () => {
    try {
      const blob = await api.exportBibleJson();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LSLT_Lao_Bible_Database.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      alert('성경 데이터베이스가 JSON 파일로 내보내기 되었습니다.');
    } catch (err: any) {
      alert(`성경 JSON 내보내기 실패: ${err.message}`);
    }
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn"
            onClick={handleExportBibleStudy}
            disabled={verses.length === 0}
          >
            📖 연구 보고서 출력 (Markdown)
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleExportBibleJson}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📥 성경 DB JSON 백업
          </button>
        </div>
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
              {BIBLE_BOOKS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
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
              {Array.from({ length: getChapterCount(selectedBook) }, (_, i) => i + 1).map(ch => (
                <option key={ch} value={ch}>{ch}장</option>
              ))}
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
