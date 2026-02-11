import { Injectable, signal } from '@angular/core';
import { TipTapJSON } from '../../shared/types/note.model';

@Injectable({
  providedIn: 'root'
})
export class EditorStateService {
  readonly editorContent = signal<TipTapJSON>({ type: 'doc', content: [] });
  readonly isEditorDirty = signal(false);
  readonly isEditing = signal(false);

  setContent(content: TipTapJSON): void {
    this.editorContent.set(content);
  }

  markDirty(): void {
    this.isEditorDirty.set(true);
  }

  markClean(): void {
    this.isEditorDirty.set(false);
  }

  startEditing(): void {
    this.isEditing.set(true);
  }

  stopEditing(): void {
    this.isEditing.set(false);
  }
}
