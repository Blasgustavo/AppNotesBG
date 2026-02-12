import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un endpoint como público — omite FirebaseAuthGuard.
 * Usar solo en rutas que no requieran autenticación.
 *
 * @example
 * @Public()
 * @Get('health')
 * healthCheck() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
