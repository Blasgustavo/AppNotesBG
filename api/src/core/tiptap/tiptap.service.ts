import { Injectable, Logger } from '@nestjs/common';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import {
  TipTapDocument,
  TipTapNode,
  TipTapTextNode,
  isValidTipTapDocument,
} from '../../../../shared/types/tiptap.types';

@Injectable()
export class TipTapService {
  private readonly logger = new Logger(TipTapService.name);

  // DOMPurify setup para server-side rendering
  private purify: DOMPurify.DOMPurifyI;

  constructor() {
    // Configurar DOMPurify con JSDOM para entorno Node.js
    const window = new JSDOM('').window;
    this.purify = DOMPurify(window);
  }

  /**
   * Extrae texto plano de un documento TipTap para búsqueda y word count
   */
  extractPlainText(document: TipTapDocument): string {
    if (!isValidTipTapDocument(document)) {
      this.logger.warn('Invalid TipTap document provided');
      return '';
    }

    if (!document.content || document.content.length === 0) {
      return '';
    }

    return document.content
      .map((node) => this.extractNodeText(node))
      .join(' ')
      .trim();
  }

  /**
   * Valida que un documento TipTap cumpla con las reglas de seguridad y formato
   */
  validateSchema(document: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validación básica de estructura
    if (!document) {
      errors.push('Document is null or undefined');
      return { isValid: false, errors };
    }

    if (document.type !== 'doc') {
      errors.push('Root type must be "doc"');
    }

    if (!Array.isArray(document.content)) {
      errors.push('Content must be an array');
      return { isValid: false, errors };
    }

    // Validar tamaño del documento
    const documentSize = JSON.stringify(document).length;
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (documentSize > maxSize) {
      errors.push(
        `Document size (${documentSize}) exceeds maximum (${maxSize})`,
      );
    }

    // Validar nodos anidados y seguridad
    this.validateNodes(document.content, errors, 0);

    // Validar schema version
    if (!document.schema_version || document.schema_version !== '2.0') {
      errors.push('Invalid or missing schema_version (must be "2.0")');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Sanitiza un documento TipTap removiendo contenido peligroso
   */
  sanitizeContent(document: TipTapDocument): TipTapDocument {
    if (!isValidTipTapDocument(document)) {
      throw new Error('Invalid TipTap document provided');
    }

    const sanitized = JSON.parse(JSON.stringify(document)); // Deep clone

    // Sanitizar texto en nodos de texto
    this.sanitizeNodes(sanitized.content);

    // Asegurar schema_version
    sanitized.schema_version = '2.0';

    // Agregar metadata de sanitización
    sanitized.metadata = {
      ...sanitized.metadata,
      sanitized_at: new Date().toISOString(),
      sanitized_by: 'TipTapService',
    };

    return sanitized;
  }

  /**
   * Calcula métricas del documento: word count, character count, reading time
   */
  calculateMetrics(document: TipTapDocument): {
    word_count: number;
    character_count: number;
    reading_time_minutes: number;
  } {
    const plainText = this.extractPlainText(document);
    const words = plainText.split(/\s+/).filter((word) => word.length > 0);
    const wordCount = words.length;
    const characterCount = plainText.length;
    const readingTimeMinutes = Math.ceil(wordCount / 200); // 200 WPM average

    return {
      word_count: wordCount,
      character_count,
      reading_time_minutes,
    };
  }

  /**
   * Genera hash SHA-256 para verificación de integridad
   */
  generateContentHash(document: TipTapDocument): string {
    const crypto = require('crypto');
    const content = JSON.stringify(document);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // ─────────────────────────────────────────────
  // Métodos privados
  // ─────────────────────────────────────────────

  private extractNodeText(node: TipTapNode): string {
    if (node.type === 'text' && (node as TipTapTextNode).text) {
      return (node as TipTapTextNode).text || '';
    }

    if (node.content && Array.isArray(node.content)) {
      return node.content.map((child) => this.extractNodeText(child)).join(' ');
    }

    // Extraer texto de atributos especiales (ej: alt de imágenes)
    if (node.attrs) {
      const altText = node.attrs.alt || '';
      const titleText = node.attrs.title || '';
      return `${altText} ${titleText}`.trim();
    }

    return '';
  }

  private validateNodes(
    nodes: TipTapNode[],
    errors: string[],
    depth: number,
  ): void {
    const maxDepth = 50;

    if (depth > maxDepth) {
      errors.push(`Maximum nesting depth (${maxDepth}) exceeded`);
      return;
    }

    for (const node of nodes) {
      // Validar tipo de nodo permitido
      const allowedTypes = [
        'paragraph',
        'heading',
        'text',
        'bulletList',
        'orderedList',
        'listItem',
        'blockquote',
        'codeBlock',
        'image',
        'link',
        'taskList',
        'taskItem',
        'horizontalRule',
        'table',
      ];

      if (!allowedTypes.includes(node.type)) {
        errors.push(`Invalid node type: ${node.type}`);
      }

      // Validar atributos específicos por tipo
      this.validateNodeAttributes(node, errors);

      // Validar contenido anidado
      if (node.content && Array.isArray(node.content)) {
        this.validateNodes(node.content, errors, depth + 1);
      }
    }
  }

  private validateNodeAttributes(node: TipTapNode, errors: string[]): void {
    if (!node.attrs) return;

    // Validar atributos de imagen
    if (node.type === 'image') {
      const allowedProtocols = ['http:', 'https:'];
      const src = node.attrs.src;

      if (!src || typeof src !== 'string') {
        errors.push('Image node requires valid src attribute');
        return;
      }

      try {
        const url = new URL(src);
        if (!allowedProtocols.includes(url.protocol)) {
          errors.push(`Image src protocol not allowed: ${url.protocol}`);
        }
      } catch {
        errors.push(`Invalid image src URL: ${src}`);
      }
    }

    // Validar atributos de enlace
    if (node.type === 'link') {
      const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
      const href = node.attrs.href;

      if (!href || typeof href !== 'string') {
        errors.push('Link node requires valid href attribute');
        return;
      }

      try {
        const url = new URL(href);
        if (!allowedProtocols.includes(url.protocol)) {
          errors.push(`Link href protocol not allowed: ${url.protocol}`);
        }
      } catch {
        errors.push(`Invalid link href URL: ${href}`);
      }
    }
  }

  private sanitizeNodes(nodes: TipTapNode[]): void {
    for (const node of nodes) {
      // Sanitizar texto en nodos de texto
      if (node.type === 'text' && (node as TipTapTextNode).text) {
        const text = (node as TipTapTextNode).text || '';
        // Remover caracteres potencialmente peligrosos
        (node as TipTapTextNode).text = this.purify.sanitize(text);
      }

      // Sanitizar atributos
      if (node.attrs) {
        this.sanitizeAttributes(node);
      }

      // Sanitizar contenido anidado
      if (node.content && Array.isArray(node.content)) {
        this.sanitizeNodes(node.content);
      }
    }
  }

  private sanitizeAttributes(node: TipTapNode): void {
    if (!node.attrs) return;

    // Remover atributos onclick y otros handlers de eventos
    const forbiddenAttributes = [
      'onclick',
      'onload',
      'onerror',
      'onmouseover',
      'onfocus',
    ];

    for (const attr of forbiddenAttributes) {
      if (attr in node.attrs) {
        delete node.attrs[attr];
      }
    }

    // Sanitizar URLs en imágenes y enlaces
    if (node.type === 'image' && node.attrs.src) {
      node.attrs.src = this.purify.sanitize(node.attrs.src);
    }

    if (node.type === 'link' && node.attrs.href) {
      node.attrs.href = this.purify.sanitize(node.attrs.href);
    }
  }
}
