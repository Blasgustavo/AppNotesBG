import { Injectable, signal, computed } from '@angular/core';
import { Note, Notebook } from '../../shared/types/note.model';
import { UiStateService } from './ui-state.service';
import { inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotesStateService {
  private readonly uiState = inject(UiStateService);

  readonly notes = signal<Note[]>([]);
  readonly selectedNote = signal<Note | null>(null);
  readonly notebooks = signal<Notebook[]>([]);
  readonly currentNotebook = signal<Notebook | null>(null);

  /** computed() derivado de notes + searchQuery — nunca Signal actualizado en multiples lugares */
  readonly filteredNotes = computed(() => {
    const query = this.uiState.searchQuery().toLowerCase();
    const notes = this.notes();
    if (!query) return notes;
    return notes.filter(note =>
      note.title.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  setNotes(notes: Note[]): void {
    this.notes.set(notes);
  }

  addNote(note: Note): void {
    this.notes.update(current => [note, ...current]);
  }

  updateNote(noteId: string, updates: Partial<Note>): void {
    this.notes.update(current =>
      current.map(note =>
        note.id === noteId ? { ...note, ...updates } : note
      )
    );
  }

  deleteNote(noteId: string): void {
    this.notes.update(current => current.filter(note => note.id !== noteId));
  }

  selectNote(note: Note | null): void {
    this.selectedNote.set(note);
  }

  setNotebook(notebook: Notebook | null): void {
    this.currentNotebook.set(notebook);
  }

  addNotebook(notebook: Notebook): void {
    this.notebooks.update(current => [...current, notebook]);
  }
}
