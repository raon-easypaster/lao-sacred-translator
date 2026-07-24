// TypeScript Types and Interfaces for LSLT

export interface GlossaryTerm {
  id?: number;
  word_ko: string;
  word_lo_common: string;
  word_lo_religious: string;
  word_lo_royal: string;
  explanation_christian: string;
  explanation_buddhist: string;
  missionary_notes: string;
  frequency: string;
  source: string;
  category: string;
}

export interface VocabularyMatch {
  word: string;
  common: string;
  religious: string;
  royal: string;
  meaning: string;
}

export interface TranslationResult {
  translation: string;
  confidence: number;
  literal: string;
  contextual: string;
  preaching: string;
  cultural_warning: string;
  commentary: string;
  source: string;
  history_id?: number;
  source_text?: string;
  direction?: string;
  mode?: string;
  vocabulary?: VocabularyMatch[];
  error?: string;
}

export interface TranslationHistoryItem {
  id: number;
  source_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  direction: string;
  confidence: number;
  reviewer_stage: 'ai' | 'local_reviewer' | 'missionary_reviewer' | 'approved';
  reviewer_notes?: string;
  approved: boolean;
  timestamp: string;
  category: string;
}

export interface DocumentItem {
  id: number;
  name: string;
  file_type: string;
  upload_date: string;
  summary: string;
  theological_meaning: string;
  key_concepts: string;
  historical_context: string;
  people: string;
  places: string;
  db_status: 'processing' | 'completed' | 'error';
  file_path?: string;
}

export interface BibleVerseItem {
  id: number;
  book: string;
  chapter: number;
  verse: number;
  text_ko: string;
  text_lo_common: string;
  text_lo_religious: string;
  text_lo_royal: string;
  comments?: string;
}

export interface SearchResultItem {
  document_id: number;
  document_name: string;
  chunk_index: number;
  content: string;
  score: number;
}

export interface SermonReviewItem {
  id?: number;
  title: string;
  source_text: string;
  trans_literal: string;
  trans_preaching: string;
  trans_contextual: string;
  trans_smallgroup: string;
  reviewer_stage: 'ai' | 'local_reviewer' | 'missionary_reviewer' | 'approved';
  reviewer_notes?: string;
  approved: boolean;
  timestamp?: string;
  history_json?: string;
}

export interface SermonHistoryLog {
  timestamp: string;
  reviewer: string;
  changes: string;
  notes: string;
}

