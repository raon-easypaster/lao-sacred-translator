import type { 
  GlossaryTerm, 
  TranslationResult, 
  TranslationHistoryItem, 
  DocumentItem, 
  BibleVerseItem, 
  SearchResultItem,
  SermonReviewItem
} from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const api = {
  // Translation
  async translate(
    text: string,
    direction: string,
    mode: string = 'standard',
    provider?: string,
    apiKey?: string,
    model?: string
  ): Promise<TranslationResult> {
    const response = await fetch(`${API_BASE_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        direction,
        mode,
        provider: provider || null,
        api_key: apiKey || null,
        model: model || null,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Translation failed');
    }
    return response.json();
  },

  // Verification Pipeline & History
  async getHistory(): Promise<TranslationHistoryItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/history`);
    if (!response.ok) throw new Error('Failed to fetch history');
    return response.json();
  },

  async updateVerification(
    id: number,
    reviewerStage: string,
    reviewerNotes?: string,
    translatedText?: string,
    approved?: boolean
  ): Promise<TranslationHistoryItem> {
    const response = await fetch(`${API_BASE_URL}/api/history/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reviewer_stage: reviewerStage,
        reviewer_notes: reviewerNotes,
        translated_text: translatedText,
        approved: approved,
      }),
    });
    if (!response.ok) throw new Error('Failed to update verification');
    return response.json();
  },

  async deleteHistoryItem(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/history/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete history item');
    return response.json();
  },

  // Glossary
  async getGlossary(search?: string, category?: string): Promise<GlossaryTerm[]> {
    let url = `${API_BASE_URL}/api/glossary`;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch glossary');
    return response.json();
  },

  async addGlossaryTerm(term: GlossaryTerm): Promise<GlossaryTerm> {
    const response = await fetch(`${API_BASE_URL}/api/glossary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(term),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to add term');
    }
    return response.json();
  },

  async updateGlossaryTerm(id: number, term: GlossaryTerm): Promise<GlossaryTerm> {
    const response = await fetch(`${API_BASE_URL}/api/glossary/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(term),
    });
    if (!response.ok) throw new Error('Failed to update term');
    return response.json();
  },

  async deleteGlossaryTerm(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/glossary/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete term');
    return response.json();
  },

  // Document Center & RAG
  async uploadDocument(
    file: File,
    apiKey?: string,
    embeddingProvider: string = 'local'
  ): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (apiKey) formData.append('api_key', apiKey);
    formData.append('embedding_provider', embeddingProvider);

    const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Upload failed');
    }
    return response.json();
  },

  async getDocuments(): Promise<DocumentItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/documents`);
    if (!response.ok) throw new Error('Failed to fetch documents');
    return response.json();
  },

  async getDocumentDetails(id: number): Promise<DocumentItem> {
    const response = await fetch(`${API_BASE_URL}/api/documents/${id}`);
    if (!response.ok) throw new Error('Failed to fetch document details');
    return response.json();
  },

  async deleteDocument(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete document');
    return response.json();
  },

  // Bible Parallel Verses
  async getBibleVerses(book?: string, chapter?: number): Promise<BibleVerseItem[]> {
    let url = `${API_BASE_URL}/api/bible`;
    const params = new URLSearchParams();
    if (book) params.append('book', book);
    if (chapter) params.append('chapter', chapter.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch Bible verses');
    return response.json();
  },

  // Search RAG Index
  async searchKnowledgeBase(query: string, topK: number = 5): Promise<SearchResultItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/search?query=${encodeURIComponent(query)}&top_k=${topK}`);
    if (!response.ok) throw new Error('Failed to search knowledge base');
    return response.json();
  },

  // Export
  async exportTranslation(data: TranslationResult, format: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/export?format=${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },

  // Sermon Review
  async getSermons(): Promise<SermonReviewItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/sermons`);
    if (!response.ok) throw new Error('Failed to fetch sermons');
    return response.json();
  },

  async saveSermon(sermon: SermonReviewItem): Promise<SermonReviewItem> {
    const response = await fetch(`${API_BASE_URL}/api/sermons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sermon),
    });
    if (!response.ok) throw new Error('Failed to save sermon');
    return response.json();
  },

  async updateSermon(
    id: number,
    sermon: Partial<SermonReviewItem> & { reviewer_name?: string }
  ): Promise<SermonReviewItem> {
    const response = await fetch(`${API_BASE_URL}/api/sermons/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sermon),
    });
    if (!response.ok) throw new Error('Failed to update sermon');
    return response.json();
  },

  async deleteSermon(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/sermons/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete sermon');
    return response.json();
  },

  async translateDocument(
    file: File,
    direction: string,
    provider: string,
    apiKey: string,
    model?: string
  ): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('direction', direction);
    formData.append('provider', provider);
    formData.append('api_key', apiKey);
    if (model) formData.append('model', model);

    const response = await fetch(`${API_BASE_URL}/api/translate/document`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Document translation failed');
    }
    return response.blob();
  }
};

