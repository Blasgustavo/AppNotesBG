import { Injectable, Logger } from '@nestjs/common';
import { FirestoreService } from '../core/firestore';

@Injectable()
export class PerformanceTestingService {
  private readonly logger = new Logger(PerformanceTestingService.name);

  constructor(private readonly firestore: FirestoreService) {}

  /**
   * Test performance de queries críticas antes y después de índices
   */
  async runPerformanceTests(userId: string): Promise<
    {
      testName: string;
      executionTime: number;
      documentCount: number;
      status: 'fast' | 'medium' | 'slow';
    }[]
  > {
    const results = [];

    this.logger.log('🧪 Starting performance tests...');

    // Test 1: Lista de notas (query principal)
    results.push(await this.testListNotes(userId));

    // Test 2: Notas filtradas por tags
    results.push(await this.testNotesByTags(userId));

    // Test 3: Notas fijadas ordenadas
    results.push(await this.testPinnedNotes(userId));

    // Test 4: Notas por libreta
    results.push(await this.testNotesByNotebook(userId));

    // Test 5: Historial de una nota
    results.push(await this.testNoteHistory(userId));

    // Test 6: Attachments por usuario
    results.push(await this.testUserAttachments(userId));

    // Test 7: Notebooks con estructura jerárquica
    results.push(await this.testUserNotebooks(userId));

    // Test 8: Query compleja múltiple filtro
    results.push(await this.testComplexQuery(userId));

    // Test 9: Paginación con cursor
    results.push(await this.testPagination(userId));

    // Test 10: Búsqueda con límites
    results.push(await this.testSearchLimits(userId));

    this.logPerformanceSummary(results);
    return results;
  }

  private async testListNotes(userId: string) {
    const startTime = Date.now();

    const snap = await this.firestore
      .collection('notes')
      .where('user_id', '==', userId)
      .where('deleted_at', '==', null)
      .orderBy('updated_at', 'desc')
      .limit(20)
      .get();

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    return {
      testName: 'List Notes (main query)',
      executionTime,
      documentCount: snap.size,
      status: this.getStatus(executionTime),
    };
  }

  private async testNotesByTags(userId: string) {
    const startTime = Date.now();

    const snap = await this.firestore
      .collection('notes')
      .where('user_id', '==', userId)
      .where('tags', 'array-contains', 'personal')
      .where('deleted_at', '==', null)
      .orderBy('updated_at', 'desc')
      .limit(10)
      .get();

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    return {
      testName: 'Notes by Tags (array-contains)',
      executionTime,
      documentCount: snap.size,
      status: this.getStatus(executionTime),
    };
  }

  private async testPinnedNotes(userId: string) {
    const startTime = Date.now();

    const snap = await this.firestore
      .collection('notes')
      .where('user_id', '==', userId)
      .where('is_pinned', '==', true)
      .where('deleted_at', '==', null)
      .orderBy('updated_at', 'desc')
      .limit(5)
      .get();

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    return {
      testName: 'Pinned Notes (compound query)',
      executionTime,
      documentCount: snap.size,
      status: this.getStatus(executionTime),
    };
  }

  private async testNotesByNotebook(userId: string) {
    // Primero obtener un notebook válido del usuario
    const notebookSnap = await this.firestore
      .collection('notebooks')
      .where('user_id', '==', userId)
      .limit(1)
      .get();

    if (notebookSnap.empty) {
      return {
        testName: 'Notes by Notebook',
        executionTime: 0,
        documentCount: 0,
        status: 'fast' as const,
      };
    }

    const notebookId = notebookSnap.docs[0].id;
    const startTime = Date.now();

    const snap = await this.firestore
      .collection('notes')
      .where('notebook_id', '==', notebookId)
      .where('deleted_at', '==', null)
      .orderBy('updated_at', 'desc')
      .limit(10)
      .get();

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    return {
      testName: 'Notes by Notebook (foreign key)',
      executionTime,
      documentCount: snap.size,
      status: this.getStatus(executionTime),
    };
  }

  private async testNoteHistory(userId: string) {
    // Primero obtener una nota válida del usuario
    const noteSnap = await this.firestore
      .collection('notes')
      .where('user_id', '==', userId)
      .limit(1)
      .get();

    if (noteSnap.empty) {
      return {
        testName: 'Note History Query',
        executionTime: 0,
        documentCount: 0,
        status: 'fast' as const,
      };
    }

    const noteId = noteSnap.docs[0].id;
    const startTime = Date.now();

    const snap = await this.firestore
      .collection('note_history')
      .where('note_id', '==', noteId)
      .orderBy('version', 'desc')
      .limit(10)
      .get();

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    return {
      testName: 'Note History (compound query)',
      executionTime,
      documentCount: snap.size,
      status: this.getStatus(executionTime),
    };
  }

  private async testUserAttachments(userId: string) {
    const startTime = Date.now();

    const snap = await this.firestore
      .collection('attachments')
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    return {
      testName: 'User Attachments (ordered query)',
      executionTime,
      documentCount: snap.size,
      status: this.getStatus(executionTime),
    };
  }

  private async testUserNotebooks(userId: string) {
    const startTime = Date.now();

    const snap = await this.firestore
      .collection('notebooks')
      .where('user_id', '==', userId)
      .where('is_favorite', '==', true)
      .orderBy('sort_order', 'asc')
      .orderBy('updated_at', 'desc')
      .limit(10)
      .get();

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    return {
      testName: 'User Notebooks (compound query)',
      executionTime,
      documentCount: snap.size,
      status: this.getStatus(executionTime),
    };
  }

  private async testComplexQuery(userId: string) {
    const startTime = Date.now();

    // Query con múltiples filtros
    const snap = await this.firestore
      .collection('notes')
      .where('user_id', '==', userId)
      .where('tags', 'array-contains-any', ['personal', 'trabajo'])
      .where('is_pinned', '==', true)
      .where('deleted_at', '==', null)
      .where('archived_at', '==', null)
      .orderBy('updated_at', 'desc')
      .limit(5)
      .get();

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    return {
      testName: 'Complex Multi-Filter Query',
      executionTime,
      documentCount: snap.size,
      status: this.getStatus(executionTime),
    };
  }

  private async testPagination(userId: string) {
    // Primera página
    const firstPageStart = Date.now();

    const firstSnap = await this.firestore
      .collection('notes')
      .where('user_id', '==', userId)
      .where('deleted_at', '==', null)
      .orderBy('updated_at', 'desc')
      .limit(10)
      .get();

    const firstPageEnd = Date.now();

    if (firstSnap.empty) {
      return {
        testName: 'Pagination (first/next page)',
        executionTime: firstPageEnd - firstPageStart,
        documentCount: 0,
        status: 'fast' as const,
      };
    }

    // Segunda página con cursor
    const lastDoc = firstSnap.docs[firstSnap.size - 1];
    const secondPageStart = Date.now();

    await this.firestore
      .collection('notes')
      .where('user_id', '==', userId)
      .where('deleted_at', '==', null)
      .orderBy('updated_at', 'desc')
      .startAfter(lastDoc)
      .limit(10)
      .get();

    const secondPageEnd = Date.now();
    const totalExecutionTime =
      secondPageEnd - secondPageStart + (firstPageEnd - firstPageStart);

    return {
      testName: 'Pagination (first/next page)',
      executionTime: totalExecutionTime,
      documentCount: firstSnap.size,
      status: this.getStatus(totalExecutionTime),
    };
  }

  private async testSearchLimits(userId: string) {
    const startTime = Date.now();

    // Query para simular límites y paginación grandes
    const snap = await this.firestore
      .collection('notes')
      .where('user_id', '==', userId)
      .where('deleted_at', '==', null)
      .orderBy('updated_at', 'desc')
      .limit(100) // Query más grande para test de límites
      .get();

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    return {
      testName: 'Large Limit Query (100 docs)',
      executionTime,
      documentCount: snap.size,
      status: this.getStatus(executionTime),
    };
  }

  private getStatus(executionTime: number): 'fast' | 'medium' | 'slow' {
    if (executionTime < 100) return 'fast';
    if (executionTime < 500) return 'medium';
    return 'slow';
  }

  private logPerformanceSummary(results: any[]) {
    this.logger.log('\n📊 Performance Test Results:');
    this.logger.log('=====================================');

    const fastCount = results.filter((r) => r.status === 'fast').length;
    const mediumCount = results.filter((r) => r.status === 'medium').length;
    const slowCount = results.filter((r) => r.status === 'slow').length;
    const avgTime = Math.round(
      results.reduce((sum, r) => sum + r.executionTime, 0) / results.length,
    );
    const maxTime = Math.max(...results.map((r) => r.executionTime));

    results.forEach((result) => {
      const icon =
        result.status === 'fast'
          ? '🟢'
          : result.status === 'medium'
            ? '🟡'
            : '🔴';
      this.logger.log(
        `${icon} ${result.testName}: ${result.executionTime}ms (${result.documentCount} docs)`,
      );
    });

    this.logger.log('=====================================');
    this.logger.log(`📈 Performance Summary:`);
    this.logger.log(`  ✅ Fast (<100ms): ${fastCount}/${results.length}`);
    this.logger.log(
      `  🟡 Medium (100-500ms): ${mediumCount}/${results.length}`,
    );
    this.logger.log(`  🔴 Slow (>500ms): ${slowCount}/${results.length}`);
    this.logger.log(`  ⏱️  Average: ${avgTime}ms`);
    this.logger.log(`  📊 Max: ${maxTime}ms`);

    if (slowCount > 0) {
      this.logger.warn(
        '⚠️  Some queries are performing poorly - check indexes!',
      );
    } else {
      this.logger.log('✅ All queries performing well!');
    }
  }
}
