import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import algoliasearch, { SearchClient, SearchIndex } from 'algoliasearch';
import { TipTapService } from '../core/tiptap';
import type { TipTapDocument } from '../../../../shared/types/tiptap.types';

export interface SearchResult {
  objectID: string;
  title: string;
  content_text: string;
  tags: string[];
  notebook_name: string;
  user_id: string;
  updated_at: number;
  word_count: number;
  reading_time_minutes: number;
  is_pinned: boolean;
  _highlightResult?: {
    title: {
      value: string;
    };
    content_text: {
      value: string;
    };
    tags: Array<{
      value: string;
    }>;
  };
}

export interface SearchOptions {
  query: string;
  userId: string;
  limit?: number;
  offset?: number;
  tags?: string[];
  notebookId?: string;
  isPinned?: boolean;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly client: SearchClient;
  private readonly index: SearchIndex;
  private readonly indexName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tipTap: TipTapService,
  ) {
    const appId = this.configService.get<string>('ALGOLIA_APP_ID');
    const adminApiKey = this.configService.get<string>('ALGOLIA_ADMIN_API_KEY');
    this.indexName = this.configService.get<string>(
      'ALGOLIA_INDEX_NAME',
      'notes_dev',
    );

    if (!appId || !adminApiKey) {
      throw new Error('Algolia credentials not configured');
    }

    this.client = algoliasearch(appId, adminApiKey);
    this.index = this.client.initIndex(this.indexName);

    this.logger.log(`Algolia initialized with index: ${this.indexName}`);
  }

  /**
   * Indexa una nota en Algolia para búsqueda full-text
   */
  async indexNote(noteData: {
    id: string;
    user_id: string;
    title: string;
    content: TipTapDocument;
    tags: string[];
    notebook_name: string;
    updated_at: FirebaseFirestore.Timestamp;
    word_count: number;
    reading_time_minutes: number;
    is_pinned: boolean;
  }): Promise<void> {
    try {
      // Extraer texto plano del contenido TipTap
      const contentText = this.tipTap.extractPlainText(noteData.content);

      const record: Omit<SearchResult, '_highlightResult'> = {
        objectID: noteData.id,
        title: noteData.title,
        content_text: contentText,
        tags: noteData.tags || [],
        notebook_name: noteData.notebook_name || 'Sin libreta',
        user_id: noteData.user_id,
        updated_at: noteData.updated_at.toMillis(),
        word_count: noteData.word_count,
        reading_time_minutes: noteData.reading_time_minutes,
        is_pinned: noteData.is_pinned,
      };

      await this.index.saveObject(record);
      this.logger.log(
        `Note indexed: ${noteData.id} for user: ${noteData.user_id}`,
      );
    } catch (error) {
      this.logger.error(`Failed to index note ${noteData.id}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza una nota en el índice de Algolia
   */
  async updateNote(noteData: {
    id: string;
    user_id: string;
    title: string;
    content: TipTapDocument;
    tags: string[];
    notebook_name: string;
    updated_at: FirebaseFirestore.Timestamp;
    word_count: number;
    reading_time_minutes: number;
    is_pinned: boolean;
  }): Promise<void> {
    try {
      await this.indexNote(noteData);
      this.logger.log(`Note updated in index: ${noteData.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to update note ${noteData.id} in index:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Elimina una nota del índice de Algolia
   */
  async removeNote(noteId: string): Promise<void> {
    try {
      await this.index.deleteObject(noteId);
      this.logger.log(`Note removed from index: ${noteId}`);
    } catch (error) {
      this.logger.error(`Failed to remove note ${noteId} from index:`, error);
      throw error;
    }
  }

  /**
   * Busca notas usando Algolia con filtros múltiples
   */
  async searchNotes(options: SearchOptions): Promise<{
    hits: SearchResult[];
    nbHits: number;
    page: number;
    nbPages: number;
    hitsPerPage: number;
    processingTimeMS: number;
  }> {
    try {
      const {
        query,
        userId,
        limit = 20,
        offset = 0,
        tags,
        notebookId,
        isPinned,
      } = options;

      // Construir filtros Algolia
      const filters: string[] = [`user_id:${userId}`];

      if (tags && tags.length > 0) {
        const tagFilters = tags.map((tag) => `tags:"${tag}"`);
        filters.push(`(${tagFilters.join(' OR ')})`);
      }

      if (notebookId) {
        filters.push(`notebook_name:"${notebookId}"`);
      }

      if (isPinned !== undefined) {
        filters.push(`is_pinned:${isPinned}`);
      }

      const searchParams = {
        query,
        filters: filters.join(' AND '),
        hitsPerPage: Math.min(limit, 100), // Algolia limit
        offset: Math.min(offset, 1000), // Algolia limit
        attributesToHighlight: ['title', 'content_text', 'tags'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        attributesToSnippet: ['content_text:50'],
        snippetEllipsisText: '...',
      };

      const result = await this.index.search<SearchResult>(searchParams);

      this.logger.log(
        `Search performed for user ${userId}: ${result.nbHits} hits found`,
      );

      return {
        hits: result.hits,
        nbHits: result.nbHits,
        page: Math.floor(offset / limit),
        nbPages: Math.ceil(result.nbHits / limit),
        hitsPerPage: limit,
        processingTimeMS: result.processingTimeMS,
      };
    } catch (error) {
      this.logger.error(`Search failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene sugerencias autocompletar para búsqueda
   */
  async getSearchSuggestions(
    userId: string,
    query: string,
    limit = 5,
  ): Promise<string[]> {
    try {
      if (query.length < 2) return [];

      const result = await this.index.search<SearchResult>({
        query,
        hitsPerPage: limit,
        filters: `user_id:${userId}`,
        attributesToRetrieve: ['title'],
        analytics: false,
      });

      const suggestions = result.hits
        .map((hit) => hit.title)
        .filter((title) => title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit);

      return suggestions;
    } catch (error) {
      this.logger.error(`Failed to get suggestions for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Actualiza las configuraciones del índice (ranking, searchableAttributes, etc.)
   */
  async configureIndex(): Promise<void> {
    try {
      const settings = {
        searchableAttributes: [
          'title',
          'content_text',
          'tags',
          'notebook_name',
        ],
        attributesForFaceting: [
          'user_id',
          'tags',
          'notebook_name',
          'is_pinned',
        ],
        ranking: [
          'typo',
          'geo',
          'words',
          'filters',
          'proximity',
          'attribute',
          'exact',
          'custom',
        ],
        customRanking: ['desc(updated_at)', 'desc(is_pinned)'],
        attributesToHighlight: ['title', 'content_text', 'tags'],
        attributesToSnippet: ['content_text:10'],
        snippetEllipsisText: '...',
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        minWordSizefor1Typo: 3,
        minWordSizefor2Typos: 6,
        typoTolerance: 'true',
        allowTyposOnNumericTokens: false,
        ignorePlurals: true,
        removeStopWords: ['en', 'es', 'pt'],
        advancedSyntax: true,
        optionalWords: [],
        separatorsToIndex: '+#$%&*+@£€§|\n\r',
        queryType: 'prefixLast',
        removeWordsIfNoResults: 'allOptional',
        distinct: false,
        numericAttributesToIndex: null,
        allowCompressionOfIntegerArray: true,
      };

      await this.index.setSettings(settings);
      this.logger.log('Algolia index configured successfully');
    } catch (error) {
      this.logger.error('Failed to configure Algolia index:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del índice
   */
  async getIndexStats(): Promise<any> {
    try {
      const stats = await this.index.getStats();
      return stats;
    } catch (error) {
      this.logger.error('Failed to get index stats:', error);
      throw error;
    }
  }

  /**
   * Limpia el índice (útil para desarrollo/testing)
   */
  async clearIndex(): Promise<void> {
    try {
      await this.index.clearObjects();
      this.logger.log('Algolia index cleared');
    } catch (error) {
      this.logger.error('Failed to clear Algolia index:', error);
      throw error;
    }
  }
}
