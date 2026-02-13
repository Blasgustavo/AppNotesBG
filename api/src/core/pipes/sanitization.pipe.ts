import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
const dompurify = DOMPurify(window);

@Injectable()
export class SanitizationPipe implements PipeTransform<any> {
  private readonly allowedTags: string[];
  private readonly allowedAttributes: string[];

  constructor(
    options: { allowedTags?: string[]; allowedAttributes?: string[] } = {},
  ) {
    this.allowedTags = options.allowedTags || [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'blockquote',
      'pre',
      'code',
      'span',
      'div',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ];

    this.allowedAttributes = options.allowedAttributes || [
      'href',
      'src',
      'alt',
      'title',
      'class',
      'id',
      'style',
      'target',
      'rel',
      'width',
      'height',
      'data-type',
      'data-id',
      'data-collapsed',
    ];
  }

  transform(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value);
    }

    return value;
  }

  private sanitizeString(value: string): string {
    const cleaned = dompurify.sanitize(value, {
      ALLOWED_TAGS: this.allowedTags,
      ALLOWED_ATTR: this.allowedAttributes,
      ALLOW_DATA_ATTR: false,
    });

    if (cleaned !== value) {
      return cleaned;
    }

    return value
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'string'
            ? this.sanitizeString(item)
            : this.sanitizeObject(item),
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
