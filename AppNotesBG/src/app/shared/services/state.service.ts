import { Injectable, signal } from '@angular/core';
import { User, Notebook, Note, AppState, EditorState, TipTapJSON } from '../types/note.model';

@Injectable({
  providedIn: 'root'
})
export class StateService implements AppState {
  // User state
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = this.currentUser.map(user => !!user);

  // Notebook state
  readonly currentNotebook = signal<Notebook | null>(null);
  readonly notebooks = signal<Notebook[]>([]);

  // Notes state
  readonly notes = signal<Note[]>([]);
  readonly filteredNotes = signal<Note[]>([]);
  readonly selectedNote = signal<Note | null>(null);

  // UI state
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal('');

  // Editor state
  readonly editorContent = signal<TipTapJSON>({ type: 'doc', content: [] });
  readonly isEditorDirty = signal(false);
  readonly isEditing = signal(false);

  constructor() {
    // Initialize default TipTap content
    this.editorContent.set({ type: 'doc', content: [] });
  }

  // User actions
  setUser(user: User | null): void {
    this.currentUser.set(user);
  }

  // Notebook actions
  setNotebook(notebook: Notebook | null): void {
    this.currentNotebook.set(notebook);
  }

  addNotebook(notebook: Notebook): void {
    this.notebooks.update(current => [...current, notebook]);
  }

  // Notes actions
  setNotes(notes: Note[]): void {
    this.notes.set(notes);
    this.filterNotes(); // Apply current filters
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

  // Search and filter
  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.filterNotes();
  }

  private filterNotes(): void {
    const query = this.searchQuery().toLowerCase();
    const notes = this.notes();
    
    if (!query) {
      this.filteredNotes.set(notes);
      return;
    }

    const filtered = notes.filter(note => 
      note.title.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    );

    this.filteredNotes.set(filtered);
  }

  // Editor actions
  setEditorContent(content: TipTapJSON): void {
    this.editorContent.set(content);
  }

  markEditorDirty(): void {
    this.isEditorDirty.set(true);
  }

  markEditorClean(): void {
    this.isEditorDirty.set(false);
  }

  // UI actions
  setLoading(loading: boolean): void {
    this.isLoading.set(loading);
  }

  setError(error: string | null): void {
    this.error.set(error);
  }

  clearError(): void {
    this.error.set(null);
  }
}