import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AuthStateService } from '../../core/state/auth-state.service';
import { UiStateService } from '../../core/state/ui-state.service';
import { environment } from '../../../environments/environment';

export interface AuthMeResponse {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  is_new_user: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);
  private readonly uiState = inject(UiStateService);

  // Signal del usuario de Firebase (null = no autenticado)
  readonly firebaseUser = toSignal(user(this.auth), { initialValue: null });

  /**
   * Login con Google via popup.
   * Tras el login, llama al backend para crear/actualizar el usuario en Firestore.
   */
  async loginWithGoogle(): Promise<void> {
    this.uiState.setLoading(true);
    this.uiState.setError(null);

    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      const idToken = await credential.user.getIdToken();

      // Sincronizar con el backend — crea usuario en Firestore si es nuevo
      const profile = await firstValueFrom(
        this.http.post<AuthMeResponse>(
          `${environment.api.baseUrl}/auth/me`,
          {},
          { headers: { Authorization: `Bearer ${idToken}` } },
        ),
      );

      // Actualizar estado global con el perfil del backend
      this.authState.setUser({
        id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url ?? '',
        // Defaults para campos del modelo completo
        created_at: null as any,
        app_theme: 'light',
        default_note_style: {
          background_color: '#FFFFFF',
          text_color: '#333333',
          highlight_color: '#FFEB3B',
        },
        default_font_family: 'Inter',
        default_font_size: 14,
        default_color_palette: [],
        storage_used_bytes: 0,
        storage_limit_bytes: 524288000,
      });
    } catch (error: any) {
      // Ignorar cancelación del popup por parte del usuario
      if (error?.code !== 'auth/popup-closed-by-user' &&
          error?.code !== 'auth/cancelled-popup-request') {
        this.uiState.setError('Error al iniciar sesión. Por favor intenta de nuevo.');
        console.error('[AuthService] loginWithGoogle error:', error);
      }
    } finally {
      this.uiState.setLoading(false);
    }
  }

  /**
   * Cierra la sesión del usuario.
   */
  async logout(): Promise<void> {
    this.uiState.setLoading(true);
    try {
      await signOut(this.auth);
      this.authState.setUser(null);
    } catch (error) {
      console.error('[AuthService] logout error:', error);
    } finally {
      this.uiState.setLoading(false);
    }
  }

  /**
   * Devuelve el ID token actual para incluirlo en requests al backend.
   * Retorna null si no hay usuario autenticado.
   */
  async getIdToken(): Promise<string | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  }
}
