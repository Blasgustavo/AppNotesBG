import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Interceptor funcional que agrega el Bearer token de Firebase
 * automáticamente a todas las requests dirigidas al backend (api.baseUrl).
 *
 * Solo actúa sobre requests a la API propia — no toca llamadas externas
 * (Algolia, Gemini, etc.).
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  // Solo interceptar requests al backend propio
  if (!req.url.startsWith(environment.api.baseUrl)) {
    return next(req);
  }

  const auth = inject(Auth);
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return next(req);
  }

  return from(currentUser.getIdToken()).pipe(
    switchMap(token => {
      const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
      return next(authReq);
    }),
  );
};
