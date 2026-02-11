import { Injectable, signal, computed } from '@angular/core';
import { User } from '../../shared/types/note.model';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  readonly currentUser = signal<User | null>(null);

  /** computed() — nunca Signal actualizado manualmente */
  readonly isAuthenticated = computed(() => !!this.currentUser());

  setUser(user: User | null): void {
    this.currentUser.set(user);
  }
}
