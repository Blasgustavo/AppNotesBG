export const ERROR_CODES = {
  AUTH: {
    INVALID_TOKEN: 'A1001',
    EXPIRED_TOKEN: 'A1002',
    REFRESH_TOKEN_REQUIRED: 'A1003',
    INVALID_REFRESH_TOKEN: 'A1004',
    SESSION_NOT_FOUND: 'A1005',
    SESSION_EXPIRED: 'A1006',
    MAX_SESSIONS_REACHED: 'A1007',
    INVALID_CREDENTIALS: 'A1008',
  },
  NOTES: {
    NOT_FOUND: 'N2001',
    FORBIDDEN: 'N2002',
    INVALID_CONTENT: 'N2003',
    VERSION_CONFLICT: 'N2004',
    SNAPSHOT_NOT_FOUND: 'N2005',
    NOTE_LOCKED: 'N2006',
    NOTE_ARCHIVED: 'N2007',
  },
  NOTEBOOKS: {
    NOT_FOUND: 'B3001',
    FORBIDDEN: 'B3002',
    DEFAULT_NOTEBOOK: 'B3003',
    NOT_EMPTY: 'B3004',
    ARCHIVED_NOTES_EXIST: 'B3005',
  },
  ATTACHMENTS: {
    NOT_FOUND: 'AT4001',
    FORBIDDEN: 'AT4002',
    FILE_TOO_LARGE: 'AT4003',
    INVALID_FILE_TYPE: 'AT4004',
    QUOTA_EXCEEDED: 'AT4005',
    UPLOAD_FAILED: 'AT4006',
  },
  VALIDATION: {
    INVALID_INPUT: 'V5001',
    MISSING_REQUIRED_FIELD: 'V5002',
    INVALID_FORMAT: 'V5003',
    MAX_LENGTH_EXCEEDED: 'V5004',
    ARRAY_MAX_SIZE_EXCEEDED: 'V5005',
  },
  FIRESTORE: {
    DOCUMENT_NOT_FOUND: 'F6001',
    DUPLICATE_DOCUMENT: 'F6002',
    TRANSACTION_FAILED: 'F6003',
    QUERY_FAILED: 'F6004',
  },
  RATE_LIMIT: {
    TOO_MANY_REQUESTS: 'R7001',
    USER_RATE_LIMIT_EXCEEDED: 'R7002',
  },
  INTERNAL: {
    SERVER_ERROR: 'I9001',
    DATABASE_ERROR: 'I9002',
    EXTERNAL_SERVICE_ERROR: 'I9003',
  },
} as const;

export type ErrorCode =
  (typeof ERROR_CODES)[keyof typeof ERROR_CODES][keyof (typeof ERROR_CODES)[keyof typeof ERROR_CODES]];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  A1001: 'Token de autenticación inválido',
  A1002: 'Token de autenticación expirado',
  A1003: 'Se requiere refresh token',
  A1004: 'Refresh token inválido o expirado',
  A1005: 'Sesión no encontrada',
  A1006: 'Sesión expirada',
  A1007: 'Máximo de sesiones alcanzado',
  A1008: 'Credenciales inválidas',

  N2001: 'Nota no encontrada',
  N2002: 'No tienes acceso a esta nota',
  N2003: 'Contenido de nota inválido',
  N2004: 'Conflicto de versiones',
  N2005: 'Snapshot de versión no encontrado',
  N2006: 'La nota está bloqueada por otro usuario',
  N2007: 'La nota está archivada',

  B3001: 'Libreta no encontrada',
  B3002: 'No tienes acceso a esta libreta',
  B3003: 'No se puede modificar la libreta por defecto',
  B3004: 'No se puede eliminar una libreta con notas',
  B3005: 'No se puede eliminar una libreta con notas archivadas',

  AT4001: 'Adjunto no encontrado',
  AT4002: 'No tienes acceso a este adjunto',
  AT4003: 'El archivo excede el tamaño máximo permitido',
  AT4004: 'Tipo de archivo no permitido',
  AT4005: 'Cuota de almacenamiento excedida',
  AT4006: 'Error al subir el archivo',

  V5001: 'Entrada inválida',
  V5002: 'Campo requerido faltante',
  V5003: 'Formato inválido',
  V5004: 'Longitud máxima excedida',
  V5005: 'Número máximo de elementos excedido',

  F6001: 'Documento no encontrado',
  F6002: 'El documento ya existe',
  F6003: 'Error en la transacción',
  F6004: 'Error en la consulta',

  R7001: 'Demasiadas solicitudes',
  R7002: 'Límite de solicitudes del usuario excedido',

  I9001: 'Error interno del servidor',
  I9002: 'Error de base de datos',
  I9003: 'Error en servicio externo',
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(code: ErrorCode, message?: string, details?: any) {
    super(code, message || ERROR_MESSAGES[code], 404, details);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends AppError {
  constructor(code: ErrorCode, message?: string, details?: any) {
    super(code, message || ERROR_MESSAGES[code], 403, details);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AppError {
  constructor(code: ErrorCode, message?: string, details?: any) {
    super(code, message || ERROR_MESSAGES[code], 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(code: ErrorCode, message?: string, details?: any) {
    super(code, message || ERROR_MESSAGES[code], 401, details);
    this.name = 'UnauthorizedError';
  }
}
