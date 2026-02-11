import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs';

/**
 * Guard que protege rutas autenticadas.
 * Redirige a /login si el usuario no está autenticado.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map(user => {
      if (user) return true;
      return router.createUrlTree(['/login']);
    }),
  );
};

/**
 * Guard que protege la ruta /login.
 * Redirige a / si el usuario ya está autenticado.
 */
export const publicGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map(user => {
      if (!user) return true;
      return router.createUrlTree(['/']);
    }),
  );
};
