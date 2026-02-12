import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FirestoreService } from '../core/firestore';
import {
  CreateThemeDto,
  UpdateThemeDto,
  QueryThemesDto,
  ApplyThemeDto,
  ThemePreviewDto,
  CloneThemeDto,
  ThemeExportDto,
  ThemeImportDto,
  ThemeShareDto,
} from './dto/theme.dto';

const THEMES_COL = 'themes';
const MAX_THEMES_PER_USER = 20;
const MAX_CUSTOM_PROPERTIES = 50;
const DEFAULT_THEMES_COUNT = 5;

@Injectable()
export class ThemesService {
  private readonly logger = new Logger(ThemesService.name);

  constructor(private readonly firestore: FirestoreService) {}

  /**
   * Lista temas personalizados del usuario con filtros
   */
  async findAll(userId: string, query: QueryThemesDto) {
    let q: FirebaseFirestore.Query = this.firestore
      .collection(THEMES_COL)
      .where('user_id', '==', userId);

    // Aplicar filtros
    if (query.is_public !== undefined) {
      q = q.where('is_public', '==', query.is_public);
    }

    if (query.category) {
      q = q.where('category', '==', query.category);
    }

    if (query.is_default !== undefined) {
      q = q.where('is_default', '==', query.is_default);
    }

    if (query.tags && query.tags.length > 0) {
      q = q.where('tags', 'array-contains-any', query.tags);
    }

    // Ordenar por prioridad y fecha de actualización
    q = q.orderBy('is_default', 'desc').orderBy('updated_at', 'desc');

    // Paginación
    if (query.limit) {
      q = q.limit(Math.min(query.limit, 100));
    }

    if (query.cursor) {
      const cursorSnap = await this.firestore.getDoc(THEMES_COL, query.cursor);
      if (cursorSnap.exists) {
        q = q.startAfter(cursorSnap);
      }
    }

    const snap = await q.get();
    return snap.docs.map((doc) => doc.data());
  }

  /**
   * Obtiene un tema específico verificando ownership
   */
  async findOne(themeId: string, userId: string) {
    const snap = await this.firestore.getDoc(THEMES_COL, themeId);
    if (!snap.exists) {
      throw new NotFoundException(`Theme ${themeId} not found`);
    }

    const data = snap.data() as Record<string, unknown>;

    // Verificar acceso: es público o pertenece al usuario
    const isOwner = data['user_id'] === userId;
    const isPublic = data['is_public'] === true;

    if (!isOwner && !isPublic) {
      throw new ForbiddenException('Access denied to this theme');
    }

    // Incrementar uso si es público
    if (isPublic && !isOwner) {
      await this.firestore.doc(THEMES_COL, themeId).update({
        usage_count: this.firestore.increment(1),
        last_used_at: this.firestore.serverTimestamp,
      });
    }

    return data;
  }

  /**
   * Crea un nuevo tema personalizado
   */
  async create(userId: string, dto: CreateThemeDto, ipAddress: string) {
    // Verificar límite de temas por usuario
    const userThemesSnap = await this.firestore
      .collection(THEMES_COL)
      .where('user_id', '==', userId)
      .count()
      .get();

    const userThemesCount = userThemesSnap.data().count || 0;
    if (userThemesCount >= MAX_THEMES_PER_USER) {
      throw new BadRequestException(
        `Maximum ${MAX_THEMES_PER_USER} themes per user allowed`,
      );
    }

    // Validar custom properties
    if (
      dto.custom_properties &&
      Object.keys(dto.custom_properties).length > MAX_CUSTOM_PROPERTIES
    ) {
      throw new BadRequestException(
        `Maximum ${MAX_CUSTOM_PROPERTIES} custom properties allowed`,
      );
    }

    // Validar que no exista un tema con el mismo nombre para el usuario
    const existingThemeSnap = await this.firestore
      .collection(THEMES_COL)
      .where('user_id', '==', userId)
      .where('name', '==', dto.name)
      .get();

    if (
      !existingThemeSnap.empty &&
      !existingThemeSnap.docs[0].data()['is_default']
    ) {
      throw new BadRequestException(
        `Theme with name "${dto.name}" already exists`,
      );
    }

    const now = this.firestore.serverTimestamp;
    const themeData = {
      id: this.firestore.generateId(),
      user_id: userId,
      name: dto.name,
      description: dto.description || null,
      colors: dto.colors,
      fonts: dto.fonts,
      spacing: dto.spacing,
      borders: dto.borders,
      shadows: dto.shadows,
      is_public: dto.is_public || false,
      tags: dto.tags || [],
      category: dto.category || 'custom',
      display_mode: dto.display_mode || 'auto',
      preview_image_url: dto.preview_image_url || null,
      custom_properties: dto.custom_properties || {},
      is_active: false,
      usage_count: 0,
      last_used_at: null,
      is_default: false,
      version: 1,
      audit: {
        created_ip: ipAddress,
        last_updated_by: userId,
        last_updated_ip: ipAddress,
      },
      created_at: now,
      updated_at: now,
    };

    const themeRef = this.firestore.collection(THEMES_COL).doc(themeData.id);
    await themeRef.set(themeData);

    this.logger.log(`Theme created: ${themeData.id} by user: ${userId}`);

    const created = await themeRef.get();
    return created.data();
  }

  /**
   * Actualiza un tema existente
   */
  async update(
    themeId: string,
    userId: string,
    dto: UpdateThemeDto,
    ipAddress: string,
  ) {
    const existing = await this.findOne(themeId, userId);
    const isOwner = existing['user_id'] === userId;

    if (!isOwner) {
      throw new ForbiddenException('Only theme owner can update theme');
    }

    // Validar custom properties
    if (
      dto.custom_properties &&
      Object.keys(dto.custom_properties).length > MAX_CUSTOM_PROPERTIES
    ) {
      throw new BadRequestException(
        `Maximum ${MAX_CUSTOM_PROPERTIES} custom properties allowed`,
      );
    }

    // Si cambia el nombre, validar que no exista otro tema con ese nombre
    if (dto.name && dto.name !== existing['name']) {
      const duplicateThemeSnap = await this.firestore
        .collection(THEMES_COL)
        .where('user_id', '==', userId)
        .where('name', '==', dto.name)
        .where('id', '!=', themeId)
        .get();

      if (
        !duplicateThemeSnap.empty &&
        !duplicateThemeSnap.docs[0].data()['is_default']
      ) {
        throw new BadRequestException(
          `Theme with name "${dto.name}" already exists`,
        );
      }
    }

    const updates: Record<string, unknown> = {
      updated_at: this.firestore.serverTimestamp,
      'audit.last_updated_by': userId,
      'audit.last_updated_ip': ipAddress,
      version: this.firestore.increment(1),
    };

    if (dto.name !== undefined) updates['name'] = dto.name;
    if (dto.description !== undefined) updates['description'] = dto.description;
    if (dto.colors !== undefined) updates['colors'] = dto.colors;
    if (dto.fonts !== undefined) updates['fonts'] = dto.fonts;
    if (dto.spacing !== undefined) updates['spacing'] = dto.spacing;
    if (dto.borders !== undefined) updates['borders'] = dto.borders;
    if (dto.shadows !== undefined) updates['shadows'] = dto.shadows;
    if (dto.is_public !== undefined) updates['is_public'] = dto.is_public;
    if (dto.tags !== undefined) updates['tags'] = dto.tags;
    if (dto.category !== undefined) updates['category'] = dto.category;
    if (dto.display_mode !== undefined)
      updates['display_mode'] = dto.display_mode;
    if (dto.preview_image_url !== undefined)
      updates['preview_image_url'] = dto.preview_image_url;
    if (dto.custom_properties !== undefined)
      updates['custom_properties'] = dto.custom_properties;

    await this.firestore.doc(THEMES_COL, themeId).update(updates);

    const updated = await this.firestore.getDoc(THEMES_COL, themeId);
    this.logger.log(`Theme updated: ${themeId} by user: ${userId}`);

    return updated.data();
  }

  /**
   * Aplica un tema a un note, notebook o globalmente
   */
  async applyTheme(userId: string, dto: ApplyThemeDto, ipAddress: string) {
    const theme = await this.findOne(dto.theme_id, userId);

    // Aplicar según el scope
    switch (dto.scope) {
      case 'note':
        if (!dto.note_id) {
          throw new BadRequestException('Note ID is required for note scope');
        }
        await this.applyThemeToNote(dto.note_id, userId, theme, ipAddress);
        break;

      case 'notebook':
        if (!dto.notebook_id) {
          throw new BadRequestException(
            'Notebook ID is required for notebook scope',
          );
        }
        await this.applyThemeToNotebook(
          dto.notebook_id,
          userId,
          theme,
          ipAddress,
        );
        break;

      case 'global':
        await this.applyThemeGlobally(userId, theme, ipAddress);
        break;

      default:
        throw new BadRequestException('Invalid scope specified');
    }

    this.logger.log(
      `Theme applied: ${dto.theme_id} by user: ${userId} with scope: ${dto.scope}`,
    );
  }

  /**
   * Genera preview de un tema
   */
  async getPreview(themeId: string, userId: string, dto: ThemePreviewDto) {
    const theme = await this.findOne(themeId, userId);
    const isOwner = theme['user_id'] === userId;

    if (!isOwner && !theme['is_public']) {
      throw new ForbiddenException('Access denied to this theme');
    }

    const format = dto.format || 'css';
    let preview: string;

    switch (format) {
      case 'css':
        preview = this.generateCSSPreview(theme, dto.note_id);
        break;
      case 'json':
        preview = this.generateJSONPreview(theme);
        break;
      default:
        throw new BadRequestException('Invalid preview format');
    }

    return {
      theme_id: themeId,
      format,
      preview,
      generated_at: this.firestore.serverTimestamp,
    };
  }

  /**
   * Clona un tema existente
   */
  async cloneTheme(userId: string, dto: CloneThemeDto, ipAddress: string) {
    const sourceTheme = await this.findOne(dto.source_theme_id, userId);
    const isOwner = sourceTheme['user_id'] === userId;

    if (!isOwner && !sourceTheme['is_public']) {
      throw new ForbiddenException('Access denied to clone this theme');
    }

    // Verificar límite de temas
    const userThemesSnap = await this.firestore
      .collection(THEMES_COL)
      .where('user_id', '==', userId)
      .count()
      .get();

    const userThemesCount = userThemesSnap.data().count || 0;
    if (userThemesCount >= MAX_THEMES_PER_USER) {
      throw new BadRequestException(
        `Maximum ${MAX_THEMES_PER_USER} themes per user allowed`,
      );
    }

    const now = this.firestore.serverTimestamp;
    const clonedThemeData = {
      id: this.firestore.generateId(),
      user_id: userId,
      name: dto.name || `${sourceTheme['name']} (Clone)`,
      description: dto.description || sourceTheme['description'],
      colors: sourceTheme['colors'],
      fonts: sourceTheme['fonts'],
      spacing: sourceTheme['spacing'],
      borders: sourceTheme['borders'],
      shadows: sourceTheme['shadows'],
      is_public: false, // Los clones son privados por defecto
      tags: sourceTheme['tags'],
      category: sourceTheme['category'],
      display_mode: sourceTheme['display_mode'],
      preview_image_url: sourceTheme['preview_image_url'],
      custom_properties: sourceTheme['custom_properties'],
      is_active: false,
      usage_count: 0,
      last_used_at: null,
      is_default: false,
      parent_theme_id: dto.source_theme_id,
      version: 1,
      audit: {
        created_ip: ipAddress,
        last_updated_by: userId,
        last_updated_ip: ipAddress,
      },
      created_at: now,
      updated_at: now,
    };

    const themeRef = this.firestore
      .collection(THEMES_COL)
      .doc(clonedThemeData.id);
    await themeRef.set(clonedThemeData);

    this.logger.log(
      `Theme cloned: ${clonedThemeData.id} from ${dto.source_theme_id} by user: ${userId}`,
    );

    const created = await themeRef.get();
    return created.data();
  }

  /**
   * Elimina un tema personalizado
   */
  async remove(themeId: string, userId: string) {
    const theme = await this.findOne(themeId, userId);
    const isOwner = theme['user_id'] === userId;

    if (!isOwner) {
      throw new ForbiddenException('Only theme owner can delete theme');
    }

    // No permitir eliminar temas por defecto
    if (theme['is_default']) {
      throw new BadRequestException('Cannot delete default themes');
    }

    await this.firestore.doc(THEMES_COL, themeId).delete();

    this.logger.log(`Theme deleted: ${themeId} by user: ${userId}`);
  }

  // ─────────────────────────────────────────────
  // Métodos privados
  // ─────────────────────────────────────────────

  private async applyThemeToNote(
    noteId: string,
    userId: string,
    theme: any,
    ipAddress: string,
  ) {
    const noteSnap = await this.firestore.getDoc('notes', noteId);
    if (!noteSnap.exists) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    const noteData = noteSnap.data() as Record<string, unknown>;
    if (noteData['user_id'] !== userId) {
      throw new ForbiddenException('Access denied to this note');
    }

    await this.firestore.doc('notes', noteId).update({
      theme_id: theme.id,
      theme_applied_at: this.firestore.serverTimestamp,
      'audit.last_updated_by': userId,
      'audit.last_updated_ip': ipAddress,
    });
  }

  private async applyThemeToNotebook(
    notebookId: string,
    userId: string,
    theme: any,
    ipAddress: string,
  ) {
    const notebookSnap = await this.firestore.getDoc('notebooks', notebookId);
    if (!notebookSnap.exists) {
      throw new NotFoundException(`Notebook ${notebookId} not found`);
    }

    const notebookData = notebookSnap.data() as Record<string, unknown>;
    if (notebookData['user_id'] !== userId) {
      throw new ForbiddenException('Access denied to this notebook');
    }

    await this.firestore.doc('notebooks', notebookId).update({
      theme_id: theme.id,
      theme_applied_at: this.firestore.serverTimestamp,
      'audit.last_updated_by': userId,
      'audit.last_updated_ip': ipAddress,
    });
  }

  private async applyThemeGlobally(
    userId: string,
    theme: any,
    ipAddress: string,
  ) {
    const userSnap = await this.firestore.getDoc('users', userId);
    if (!userSnap.exists) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    await this.firestore.doc('users', userId).update({
      active_theme_id: theme.id,
      theme_applied_at: this.firestore.serverTimestamp,
      'audit.last_updated_by': userId,
      'audit.last_updated_ip': ipAddress,
    });
  }

  private generateCSSPreview(theme: any, noteId?: string): string {
    const { colors, fonts, spacing, borders, shadows } = theme;

    // Generar CSS variables desde el tema
    let css = `:root {\n`;

    // Variables de colores
    css += `  --theme-primary: ${colors.primary};\n`;
    css += `  --theme-secondary: ${colors.secondary};\n`;
    css += `  --theme-accent: ${colors.accent};\n`;
    css += `  --theme-background: ${colors.background};\n`;
    css += `  --theme-surface: ${colors.surface};\n`;
    css += `  --theme-text-primary: ${colors.text_primary};\n`;
    css += `  --theme-text-secondary: ${colors.text_secondary};\n`;
    css += `  --theme-text-accent: ${colors.text_accent};\n`;
    css += `  --theme-text-on-surface: ${colors.text_on_surface};\n`;
    css += `  --theme-border: ${colors.border};\n`;
    css += `  --theme-shadow: ${colors.shadow};\n`;

    // Variables de fuentes
    css += `  --font-primary-family: ${fonts.primary.family};\n`;
    css += `  --font-primary-size: ${fonts.primary.size}px;\n`;
    css += `  --font-primary-weight: ${fonts.primary.weight};\n`;
    css += `  --font-primary-line-height: ${fonts.primary.line_height};\n`;

    // Variables de espaciado
    Object.entries(spacing).forEach(([key, value]) => {
      css += `  --spacing-${key}: ${value};\n`;
    });

    // Variables de bordes
    css += `  --border-radius: ${borders.radius};\n`;
    css += `  --border-width: ${borders.width};\n`;

    // Variables de sombras
    Object.entries(shadows).forEach(([key, value]) => {
      css += `  --shadow-${key}: ${value};\n`;
    });

    css += `}\n\n`;

    // Añar clases de aplicación
    css += `[data-theme="${theme.id}"] {\n`;
    css += `  background-color: var(--theme-background);\n`;
    css += `  color: var(--theme-text-primary);\n`;
    css += `  font-family: var(--font-primary-family);\n`;
    css += `}\n`;

    if (noteId) {
      css += `[data-theme="${theme.id}"] .note-preview-${noteId} {\n`;
      css += `  border: 2px solid var(--theme-border);\n`;
      css += `  border-radius: var(--border-radius);\n`;
      css += `  box-shadow: var(--shadow-sm);\n`;
      css += `}\n`;
    }

    return css;
  }

  private generateJSONPreview(theme: any): string {
    // Devolver el tema en formato JSON para debugging
    return JSON.stringify(
      {
        id: theme.id,
        name: theme.name,
        description: theme.description,
        colors: theme.colors,
        fonts: theme.fonts,
        spacing: theme.spacing,
        borders: theme.borders,
        shadows: theme.shadows,
        is_public: theme.is_public,
        tags: theme.tags,
        category: theme.category,
        display_mode: theme.display_mode,
        preview_image_url: theme.preview_image_url,
        custom_properties: theme.custom_properties,
      },
      null,
      2,
    );
  }
}
