import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { algoliasearch } from 'algoliasearch';
import type { SearchClient } from 'algoliasearch';
import { TipTapService } from '../core/tiptap';
import type { TipTapDocument } from '../../../shared/types/tiptap.types';

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

      await this.client.saveObject({
        indexName: this.indexName,
        body: record,
      });
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
      await this.client.deleteObject({
        indexName: this.indexName,
        objectID: noteId,
      });
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

      // Construir filtros usando facetFilters (array estructurado) para evitar inyección
      // facetFilters: AND entre arrays externos, OR dentro de cada array
      // Referencia: https://www.algolia.com/doc/api-reference/api-parameters/facetFilters/
      const facetFilters: string[][] = [
        [`user_id:${userId}`], // Siempre filtrar por usuario — obligatorio
      ];

      if (tags && tags.length > 0) {
        // OR entre tags (el usuario puede filtrar por cualquiera de los tags)
        const tagFilters = tags.map(
          (tag) => `tags:${tag.replace(/[":]/g, '')}`,
        );
        facetFilters.push(tagFilters);
      }

      if (notebookId) {
        // Sanitizar notebookId para evitar inyección en filtro de string
        const safeNotebookId = notebookId.replace(/[":]/g, '').trim();
        facetFilters.push([`notebook_name:${safeNotebookId}`]);
      }

      // isPinned usa filters numérico (booleano), no facetFilters
      const numericFilters: string[] = [];
      if (isPinned !== undefined) {
        numericFilters.push(`is_pinned=${isPinned ? 1 : 0}`);
      }

      // Simplified search without complex Algolia typing
      const result = await (this.client as any).search({
        requests: [
          {
            indexName: this.indexName,
            query,
            facetFilters,
            ...(numericFilters.length > 0 ? { numericFilters } : {}),
            hitsPerPage: Math.min(limit, 100),
            offset: Math.min(offset, 1000),
          },
        ],
      });

      const firstResult = result.results?.[0] || {};

      this.logger.log(
        `Search performed for user ${userId}: ${firstResult.nbHits || 0} hits found`,
      );

      return {
        hits: firstResult.hits || [],
        nbHits: firstResult.nbHits || 0,
        page: Math.floor(offset / limit),
        nbPages: Math.ceil((firstResult.nbHits || 0) / limit),
        hitsPerPage: limit,
        processingTimeMS: firstResult.processingTimeMS || 0,
      };
    } catch (error) {
      this.logger.error(`Search failed for user ${options.userId}:`, error);
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

      const result = await (this.client as any).search({
        requests: [
          {
            indexName: this.indexName,
            query,
            hitsPerPage: limit,
            facetFilters: [[`user_id:${userId}`]], // Array para evitar inyección
            attributesToRetrieve: ['title'],
          },
        ],
      });

      const firstResult = result.results?.[0] || {};
      const suggestions = (firstResult.hits || [])
        .map((hit: any) => hit.title)
        .filter((title: string) =>
          title.toLowerCase().includes(query.toLowerCase()),
        )
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
      const settings: any = {
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
        typoTolerance: true,
        allowTyposOnNumericTokens: false,
        ignorePlurals: true,
        advancedSyntax: true,
        distinct: false,
        allowCompressionOfIntegerArray: true,
      };

      await (this.client as any).setSettings({
        indexName: this.indexName,
        indexSettings: settings,
      });
      this.logger.log('Algolia index configured successfully');
    } catch (error) {
      this.logger.error('Failed to configure Algolia index:', error);
      throw error;
    }
  }

  /**
   * Obtiene el número de notas indexadas del usuario (seguro — filtrado por user_id)
   * No expone logs internos de Algolia ni datos de otros usuarios
   */
  async getUserIndexStats(userId: string): Promise<{ indexed_notes: number }> {
    try {
      const result = await (this.client as any).search({
        requests: [
          {
            indexName: this.indexName,
            query: '',
            filters: `user_id:${userId}`,
            hitsPerPage: 0, // No necesitamos hits, solo el count
          },
        ],
      });

      const firstResult = result.results?.[0] || {};
      return { indexed_notes: firstResult.nbHits || 0 };
    } catch (error) {
      this.logger.error(`Failed to get index stats for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Limpia el índice (útil para desarrollo/testing)
   */
  async clearIndex(): Promise<void> {
    try {
      await this.client.clearObjects({ indexName: this.indexName });
      this.logger.log('Algolia index cleared');
    } catch (error) {
      this.logger.error('Failed to clear Algolia index:', error);
      throw error;
    }
  }
}
