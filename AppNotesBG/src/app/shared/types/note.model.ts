import { signal, Signal } from '@angular/core';

// Interfaces principales del modelo de datos
export interface Note {
  id: string;
  user_id: string;
  notebook_id: string;
  title: string;
  content: TipTapJSON;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
  archived_at: Timestamp | null;
  reminder_at: Timestamp | null;
  tags: string[];
  is_pinned: boolean;
  collaborators: Collaborator[];
  style: NoteStyle;
  font: NoteFont;
  attachments: Attachment[];
}

export interface Notebook {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  is_default: boolean;
  note_count: number;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  created_at: Timestamp;
  app_theme: 'light' | 'dark';
  default_note_style: NoteStyle;
  default_font_family: string;
  default_font_size: number;
  default_color_palette: string[];
  storage_used_bytes: number;
  storage_limit_bytes: number;
}

export interface Attachment {
  id: string;
  note_id: string;
  user_id: string;
  url: string;
  storage_path: string;
  type: string;
  mime_type: string;
  name: string;
  size_bytes: number;
  created_at: Timestamp;
}

export interface TipTapJSON {
  type: 'doc';
  content: any[]; // TipTap content nodes
}

export interface Collaborator {
  user_id: string;
  permission: 'view' | 'edit';
}

export interface NoteStyle {
  background_color: string;
  text_color: string;
  highlight_color: string;
}

export interface NoteFont {
  family: string;
  size: number;
  weight: string;
  line_height: number;
}

export interface Timestamp {
  seconds: number;
  nanos: number;
}

// Signals para estado reactivo
export interface AppState {
  currentUser: Signal<User | null>;
  currentNotebook: Signal<Notebook | null>;
  notes: Signal<Note[]>;
  isLoading: Signal<boolean>;
  error: Signal<string | null>;
  selectedNote: Signal<Note | null>;
}

export interface EditorState {
  content: Signal<TipTapJSON>;
  isDirty: Signal<boolean>;
  selectedAttachments: Signal<Attachment[]>;
  collaborators: Signal<Collaborator[]>;
}