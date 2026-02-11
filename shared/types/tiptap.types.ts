// TipTap JSON types — compartido entre frontend y backend
// Compatible con ProseMirror/Tiptap 2+

export interface TipTapDocument {
  type: 'doc';
  content?: TipTapNode[];
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
export function isValidTipTapDocument(obj: any): obj is TipTapDocument {
  return obj && 
         obj.type === 'doc' && 
         Array.isArray(obj.content) && 
         obj.content.length >= 0;
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