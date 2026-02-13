// TipTap JSON types — compartido entre frontend y backend
// Compatible con ProseMirror/Tiptap 2+

export interface TipTapDocument {
  /** Versión del schema — debe ser '2.0'. Requerida para validación en TipTapService. */
  schema_version: '2.0';
  type: 'doc';
  content?: TipTapNode[];
  /** Metadata calculada por el backend — no enviar desde el cliente */
  metadata?: {
    word_count?: number;
    character_count?: number;
    last_hash?: string;
    sanitized_at?: string;
    sanitized_by?: string;
    created_with?: string;
  };
}

export interface TipTapNode {
  type: string;
  content?: TipTapNode[] | string;
  attrs?: Record<string, any>;
  marks?: TipTapMark[];
}

export interface TipTapMark {
  type: string;
  attrs?: Record<string, any>;
}

export interface TipTapTextNode extends TipTapNode {
  type: 'text';
  text?: string;
}

export interface TipTapParagraphNode extends TipTapNode {
  type: 'paragraph';
  content?: TipTapNode[];
}

export interface TipTapHeadingNode extends TipTapNode {
  type: 'heading';
  attrs?: {
    level: number;
  };
  content?: TipTapNode[];
}

export interface TipTapListNode extends TipTapNode {
  type: 'bulletList' | 'orderedList';
  content?: TipTapNode[];
}

export interface TipTapImageNode extends TipTapNode {
  type: 'image';
  attrs: {
    src: string;
    alt?: string;
    title?: string;
  };
}

export interface TipTapLinkMark extends TipTapMark {
  type: 'link';
  attrs: {
    href: string;
  };
}

// Utilities

/**
 * Type guard para TipTapDocument v2.
 * Verifica la estructura mínima requerida: type=doc, content=[],  schema_version=2.0
 */
export function isValidTipTapDocument(obj: any): obj is TipTapDocument {
  return (
    obj !== null &&
    obj !== undefined &&
    obj.type === 'doc' &&
    obj.schema_version === '2.0' &&
    Array.isArray(obj.content)
  );
}

/**
 * Crea un documento TipTap vacío válido para usar como valor por defecto
 */
export function createEmptyTipTapDocument(): TipTapDocument {
  return {
    schema_version: '2.0',
    type: 'doc',
    content: [
      { type: 'paragraph', content: [] },
    ],
  };
}

export function extractTextFromTipTap(node: TipTapNode): string {
  if (node.type === 'text' && (node as TipTapTextNode).text) {
    return (node as TipTapTextNode).text || '';
  }
  
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(child => extractTextFromTipTap(child)).join(' ');
  }
  
  return '';
}