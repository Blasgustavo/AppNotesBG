import { Component, signal, computed, OnInit, OnDestroy, input, output, inject, effect } from '@angular/core';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { TipTapJSON } from '../../types/note.model';
import { EditorStateService } from '../../../core/state/editor-state.service';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [],
  template: `
    <div class="note-editor">
      <h2>{{ title() }}</h2>
      
      <!-- Title input con signal -->
      <input 
        type="text" 
        [value]="title()" 
        (input)="onTitleChange($event)"
        placeholder="Título de la nota..."
        class="title-input"
      />
      
      <!-- TipTap editor placeholder -->
      <div class="editor-content" #editorElement>
        <!-- El editor se inicializará aquí -->
        @if (!isEditorReady()) {
          <p>Cargando editor...</p>
        }
      </div>
      
      <!-- Status signals -->
      <div class="editor-status">
        <p>Palabras: {{ wordCount() }}</p>
        <p>Caracteres: {{ charCount() }}</p>
        <p [class]="{ 'dirty': isDirty() }">
          {{ isDirty() ? 'Modificado' : 'Guardado' }}
        </p>
      </div>
      
      <!-- Action buttons -->
      <div class="editor-actions">
        <button 
          [disabled]="!isDirty()"
          (click)="saveNote()"
          class="save-btn"
        >
          💾 Guardar
        </button>
        
        <button 
          (click)="clearContent()"
          class="clear-btn"
        >
          🗑️ Limpiar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .note-editor {
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin: 16px 0;
    }
    
    .title-input {
      width: 100%;
      padding: 12px;
      font-size: 18px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    
    .editor-content {
      min-height: 200px;
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
    }
    
    .editor-status {
      display: flex;
      gap: 16px;
      margin: 12px 0;
      font-size: 14px;
      color: #666;
    }
    
    .editor-status .dirty {
      color: #ff9800;
      font-weight: bold;
    }
    
    .editor-actions {
      display: flex;
      gap: 12px;
    }
    
    .save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .save-btn {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .clear-btn {
      background: #f44336;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
  `]
})
export class NoteEditorComponent implements OnInit, OnDestroy {
  // Input signals
  initialContent = input<TipTapJSON>({ type: 'doc', content: [] });
  readonly = input(false);
  
  // Fix error 4: output<T>() en lugar de new EventEmitter<T>() (Angular 17+)
  contentChange = output<TipTapJSON>();
  save = output<{ title: string; content: TipTapJSON }>();
  
  // Internal signals
  private editor = signal<Editor | null>(null);
  title = signal('Nueva nota');
  content = signal<TipTapJSON>({ type: 'doc', content: [] });
  isDirty = signal(false);
  isEditorReady = signal(false);
  
  // Computed signals
  wordCount = computed(() => {
    const plainText = this.extractPlainText(this.content());
    return plainText.split(/\s+/).filter(word => word.length > 0).length;
  });
  
  charCount = computed(() => {
    return this.extractPlainText(this.content()).length;
  });
  
  private readonly editorState = inject(EditorStateService);

  constructor() {
    // Fix error 3: effect() en lugar de .subscribe() en un Signal
    // NUNCA usar .subscribe() en Signals — usar effect() para efectos secundarios
    effect(() => {
      const newContent = this.editorState.editorContent();
      if (this.editor() && !this.isDirty()) {
        this.editor()!.commands.setContent(newContent);
      }
    });
  }

  ngOnInit(): void {
    this.content.set(this.editorState.editorContent());
    this.initializeEditor();
  }

  private initializeEditor(): void {
    // Fix error 7: Document, Text y Paragraph ya estan incluidos en StarterKit
    // No pasar instancias de extension como config — StarterKit los incluye por defecto
    const editor = new Editor({
      extensions: [StarterKit],
      content: this.initialContent(),
      editable: !this.readonly(),
      onUpdate: () => {
        if (this.editor()) {
          const newContent = this.editor()!.getJSON() as TipTapJSON;
          this.setContent(newContent);
          this.markDirty();
        }
      },
    });

    this.editor.set(editor);
    this.isEditorReady.set(true);
  }
  
  private setContent(newContent: TipTapJSON): void {
    this.content.set(newContent);
    this.contentChange.emit(newContent);
  }
  
  private markDirty(): void {
    this.isDirty.set(true);
    this.editorState.markDirty();
  }

  private markClean(): void {
    this.isDirty.set(false);
    this.editorState.markClean();
  }
  
  onTitleChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.title.set(input.value);
    this.markDirty();
  }
  
  saveNote(): void {
    if (!this.isDirty() || !this.editor()) {
      return;
    }
    
    const saveData = {
      title: this.title(),
      content: this.content()
    };
    
    this.save.emit(saveData);
    this.markClean();
  }
  
  clearContent(): void {
    if (this.editor()) {
      const emptyContent = { type: 'doc', content: [] };
      this.editor()!.commands.setContent(emptyContent);
      this.setContent(emptyContent);
      this.title.set('Nueva nota');
    }
  }
  
  private extractPlainText(tiptapJson: TipTapJSON): string {
    if (!tiptapJson.content) {
      return '';
    }
    
    const extractFromNode = (node: any): string => {
      if (node.type === 'text' && node.text) {
        return node.text;
      }
      
      if (node.content && Array.isArray(node.content)) {
        return node.content.map((child: any) => extractFromNode(child)).join('');
      }
      
      return '';
    };
    
    return tiptapJson.content.map(node => extractFromNode(node)).join('');
  }
  
  ngOnDestroy(): void {
    if (this.editor()) {
      this.editor()!.destroy();
    }
  }
}