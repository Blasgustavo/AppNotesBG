import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        email_verified?: boolean;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  };
}

/**
 * Extrae la IP del cliente de forma segura.
 * - En producción con proxy (nginx, load balancer): usa req.ip que respeta trust proxy
 * - En desarrollo: usa req.socket.remoteAddress como fallback
 * - Si no hay IP disponible: retorna 'unknown'
 */
export function getClientIp(req: Request): string {
  // req.ip usa trust proxy configurado en Express — es la forma correcta
  // En desarrollo trust proxy está apagado, así que usa socket.remoteAddress
  // En producción con trust proxy = 1, req.ip contiene la IP real del cliente
  const ip = req.ip ?? (req as any).socket?.remoteAddress ?? 'unknown';

  // Limpiar IPv6 mapped IPv4 ::ffff:192.168.1.1 -> 192.168.1.1
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }

  return ip;
}

/**
 * Extrae el User-Agent del request.
 * Retorna 'unknown' si no está disponible.
 */
export function getUserAgent(req: Request): string {
  return req.headers['user-agent'] ?? 'unknown';
}
