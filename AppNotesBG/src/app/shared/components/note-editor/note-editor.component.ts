import { Component, signal, computed, OnInit, input, output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Document } from '@tiptap/extension-document';
import { Text } from '@tiptap/extension-text';
import { Paragraph } from '@tiptap/extension-paragraph';
import { TipTapJSON } from '../../types/note.model';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule],
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
        <p *ngIf="!isEditorReady()">
          Cargando editor...
        </p>
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
export class NoteEditorComponent implements OnInit {
  // Input signals
  initialContent = input<TipTapJSON>({ type: 'doc', content: [] });
  readonly = input(false);
  
  // Output events
  contentChange = new EventEmitter<TipTapJSON>();
  save = new EventEmitter<{ title: string; content: TipTapJSON }>();
  
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
  
  private stateService = inject(StateService);
  
  ngOnInit(): void {
    this.initializeEditor();
    this.syncWithStateService();
  }
  
  private initializeEditor(): void {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({
          document: Document,
          text: Text,
          paragraph: Paragraph,
        }),
      ],
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
  
  private syncWithStateService(): void {
    // Sincronizar con el servicio de estado global
    this.content.set(this.stateService.editorContent());
    
    this.stateService.editorContent.subscribe(newContent => {
      if (this.editor() && !this.isDirty()) {
        this.editor()!.commands.setContent(newContent);
      }
    });
  }
  
  private setContent(newContent: TipTapJSON): void {
    this.content.set(newContent);
    this.contentChange.emit(newContent);
  }
  
  private markDirty(): void {
    this.isDirty.set(true);
    this.stateService.markEditorDirty();
  }
  
  private markClean(): void {
    this.isDirty.set(false);
    this.stateService.markEditorClean();
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