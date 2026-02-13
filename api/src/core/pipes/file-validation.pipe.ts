import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export interface FileValidationOptions {
  maxSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Injectable()
export class ParseFilePipe implements PipeTransform<MulterFile> {
  private readonly maxSize: number;
  private readonly allowedMimeTypes: string[];
  private readonly allowedExtensions: string[];

  constructor(options: FileValidationOptions = {}) {
    this.maxSize = options.maxSize || 10 * 1024 * 1024;
    this.allowedMimeTypes = options.allowedMimeTypes || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'video/mp4',
      'video/webm',
      'text/plain',
      'application/json',
    ];
    this.allowedExtensions = options.allowedExtensions || [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.pdf',
      '.mp3',
      '.wav',
      '.mp4',
      '.webm',
      '.txt',
      '.json',
    ];
  }

  transform(file: MulterFile): MulterFile {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxSize) {
      throw new BadRequestException(
        `File size exceeds limit of ${this.maxSize} bytes (${(this.maxSize / 1024 / 1024).toFixed(2)}MB)`,
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    const ext = extname(file.originalname).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `File extension "${ext}" not allowed. Allowed extensions: ${this.allowedExtensions.join(', ')}`,
      );
    }

    const sanitizedFilename = this.sanitizeFilename(file.originalname);
    file.originalname = sanitizedFilename;

    return file;
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }
}
