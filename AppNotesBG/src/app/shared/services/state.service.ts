/**
 * @deprecated StateService unificado — usar los servicios de dominio directamente:
 *   - AuthStateService   → core/state/auth-state.service.ts
 *   - NotesStateService  → core/state/notes-state.service.ts
 *   - EditorStateService → core/state/editor-state.service.ts
 *   - UiStateService     → core/state/ui-state.service.ts
 *
 * Este archivo se mantiene temporalmente para compatibilidad. Migrar gradualmente.
 */
export { AuthStateService } from '../../core/state/auth-state.service';
export { NotesStateService } from '../../core/state/notes-state.service';
export { EditorStateService } from '../../core/state/editor-state.service';
export { UiStateService } from '../../core/state/ui-state.service';
