import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError, ERROR_CODES, ERROR_MESSAGES } from '../errors/error-codes';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  code?: string;
  details?: any;
}

const INTERNAL_ERROR_CODE = 'I9001';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;
    let code: string | undefined;
    let details: any | undefined;

    if (exception instanceof AppError) {
      status = exception.statusCode;
      message = exception.message;
      error = exception.name;
      code = exception.code;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, any>;
        message = res['message'] ?? exception.message;
        error = res['error'] ?? exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message =
        ERROR_MESSAGES[INTERNAL_ERROR_CODE as keyof typeof ERROR_MESSAGES] ||
        'Internal server error';
      error = 'InternalServerError';
      code = INTERNAL_ERROR_CODE;

      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (code) {
      body.code = code;
    }
    if (details) {
      body.details = details;
    }

    response.status(status).json(body);
  }
}
