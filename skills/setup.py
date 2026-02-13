#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     🚀 AppNotesBG - Multi-Asistente AI Installer 🚀                          ║
║                                                                              ║
║     Instalador universal para configurar asistentes de IA                    ║
║     (Opencode, Claude, Cursor) con transformación automática de skills       ║
║                                                                              ║
║     Ubicación: ./skills/setup.py                                             ║
║     Autor: AppNotesBG Team                                                   ║
║     Versión: 1.0.0                                                           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import json
import shutil
import logging
import argparse
import subprocess
import re
import time
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass, asdict, field
from datetime import datetime
from enum import Enum
import tempfile

# =============================================================================
# IMPORTACIONES DE RICH (CON INSTALACIÓN AUTOMÁTICA)
# =============================================================================

def install_and_import_rich():
    """Instala Rich si no está disponible y lo importa"""
    try:
        import rich
        from rich.console import Console
        from rich.panel import Panel
        from rich.text import Text
        from rich.table import Table
        from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
        from rich.prompt import Prompt, Confirm, IntPrompt
        from rich.style import Style
        from rich import box
        from rich.align import Align
        from rich.columns import Columns
        from rich.tree import Tree
        from rich.syntax import Syntax
        from rich.live import Live
        return True
    except ImportError:
        print("📦 Instalando dependencias necesarias (rich, requests, pyyaml)...")
        print("   Esto puede tardar unos segundos...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "rich", "requests", "pyyaml"])
            print("✅ Dependencias instaladas correctamente\n")
            # Reintentar importación
            import rich
            from rich.console import Console
            from rich.panel import Panel
            from rich.text import Text
            from rich.table import Table
            from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
            from rich.prompt import Prompt, Confirm, IntPrompt
            from rich.style import Style
            from rich import box
            from rich.align import Align
            from rich.columns import Columns
            from rich.tree import Tree
            from rich.syntax import Syntax
            from rich.live import Live
            return True
        except Exception as e:
            print(f"❌ Error instalando dependencias: {e}")
            print("   Por favor instala manualmente: pip install rich requests pyyaml")
            sys.exit(1)

# Instalar e importar Rich
install_and_import_rich()

# Ahora importar globalmente
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
from rich.prompt import Prompt, Confirm, IntPrompt
from rich.style import Style
from rich import box
from rich.align import Align
from rich.columns import Columns
from rich.tree import Tree
from rich.syntax import Syntax
from rich.live import Live

# =============================================================================
# CONFIGURACIÓN GLOBAL
# =============================================================================

@dataclass
class Config:
    """Configuración central del instalador"""
    VERSION: str = "1.0.0"
    PROJECT_NAME: str = "AppNotesBG"
    EMOJI_LOGO: str = "📝"
    
    # Rutas
    @property
    def SCRIPT_DIR(self) -> Path:
        return Path(__file__).parent.absolute()
    
    @property
    def PROJECT_ROOT(self) -> Path:
        return self.SCRIPT_DIR.parent.absolute()
    
    @property
    def SKILLS_SOURCE_DIR(self) -> Path:
        return self.SCRIPT_DIR
    
    # Archivos en raíz
    @property
    def SETUP_IGNORE(self) -> Path:
        return self.PROJECT_ROOT / ".setupignore"
    
    @property
    def AI_ASSISTANT_JSON(self) -> Path:
        return self.PROJECT_ROOT / ".ai-assistant.json"
    
    @property
    def SETUP_LOG(self) -> Path:
        return self.PROJECT_ROOT / "setup.log"
    
    @property
    def ENV_FILE(self) -> Path:
        return self.PROJECT_ROOT / ".env"
    
    # Directorios de asistentes
    def get_assistant_dir(self, assistant_id: str) -> Path:
        return self.PROJECT_ROOT / f".{assistant_id}"
    
    # Configuración de asistentes soportados
    ASSISTANTS: Dict[str, Dict[str, Any]] = field(default_factory=lambda: {
        "opencode": {
            "name": "Opencode",
            "emoji": "🔷",
            "binary": "opencode",
            "description": "Asistente de código con focus en velocidad",
            "color": "bright_blue",
            "skills_subdir": "skills",
            "filename_template": "SKILL.md",
            "create_subdir": True
        },
        "claude": {
            "name": "Claude Code",
            "emoji": "🟣",
            "binary": "claude",
            "description": "Asistente conversacional avanzado",
            "color": "bright_magenta", 
            "skills_subdir": "commands",
            "filename_template": "{name}.md",
            "create_subdir": False
        },
        "cursor": {
            "name": "Cursor",
            "emoji": "⚡",
            "binary": "cursor",
            "description": "Editor AI con reglas personalizables",
            "color": "bright_yellow",
            "skills_subdir": "rules",
            "filename_template": "{name}.md",
            "create_subdir": False
        }
    })
    
    # Providers de API
    API_PROVIDERS: Dict[str, Dict[str, Any]] = field(default_factory=lambda: {
        "openai": {
            "name": "OpenAI",
            "emoji": "🤖",
            "env_var": "OPENAI_API_KEY",
            "test_url": "https://api.openai.com/v1/models",
            "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
            "description": "GPT-4 y GPT-3.5 para asistentes de código"
        },
        "anthropic": {
            "name": "Anthropic",
            "emoji": "🧠",
            "env_var": "ANTHROPIC_API_KEY", 
            "test_url": "https://api.anthropic.com/v1/models",
            "models": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
            "description": "Claude 3 con capacidades avanzadas"
        },
        "google": {
            "name": "Google Gemini",
            "emoji": "✨",
            "env_var": "GOOGLE_API_KEY",
            "test_url": "https://generativelanguage.googleapis.com/v1/models",
            "models": ["gemini-pro", "gemini-ultra"],
            "description": "Gemini Pro para procesamiento de lenguaje"
        }
    })

# Instancia global de configuración
CONFIG = Config()

# =============================================================================
# SISTEMA DE UI CON RICH
# =============================================================================

class Colors:
    """Colores y estilos para la UI"""
    PRIMARY = "bright_cyan"
    SUCCESS = "bright_green"
    WARNING = "bright_yellow"
    ERROR = "bright_red"
    INFO = "bright_blue"
    MUTED = "dim"
    HIGHLIGHT = "bright_white"

class Icons:
    """Iconos Unicode y emojis"""
    # Estados
    SUCCESS = "✅"
    ERROR = "❌"
    WARNING = "⚠️"
    INFO = "ℹ️"
    PENDING = "⏳"
    LOADING = "🔄"
    CHECK = "✓"
    BULLET = "•"
    ARROW = "→"
    STAR = "⭐"
    SPARKLES = "✨"
    ROCKET = "🚀"
    GEAR = "⚙️"
    KEY = "🔑"
    SEARCH = "🔍"
    BOOK = "📚"
    FOLDER = "📁"
    FILE = "📄"
    BRAIN = "🧠"
    ROBOT = "🤖"
    MAGIC = "🪄"
    DETECTIVE = "🕵️"
    CHIP = "💻"
    DATABASE = "🗄️"
    SETTINGS = "🔧"
    
    # Asistentes
    OPENCODE = "🔷"
    CLAUDE = "🟣"
    CURSOR = "⚡"
    
    # Providers
    OPENAI = "🤖"
    ANTHROPIC = "🧠"
    GOOGLE = "✨"

class UI:
    """Interfaz de usuario interactiva con Rich"""
    
    def __init__(self):
        self.console = Console()
        self.icons = Icons()
        self.colors = Colors()
        
    def clear(self):
        """Limpia la consola"""
        self.console.clear()
    
    def print_banner(self):
        """Muestra banner de bienvenida"""
        banner = f"""
{self.icons.ROCKET} {CONFIG.EMOJI_LOGO} AppNotesBG - Multi-Asistente AI Installer {self.icons.ROCKET}

Instalador universal para configurar asistentes de IA
con detección automática, validación de API keys y 
transformación inteligente de skills.

Versión: {CONFIG.VERSION}
        """
        self.console.print(Panel(
            Align.center(banner),
            border_style=self.colors.PRIMARY,
            title="[bold cyan]🎯 Bienvenido[/bold cyan]",
            subtitle="[dim]Preparando tu entorno de desarrollo...[/dim]"
        ))
        self.console.print()
    
    def print_section(self, title: str, icon: str = ""):
        """Imprime una sección con título destacado"""
        self.console.print()
        self.console.print(f"[bold {self.colors.PRIMARY}]{icon} {title}[/bold {self.colors.PRIMARY}]")
        self.console.print(f"[dim]{'─' * 50}[/dim]")
    
    def print_success(self, message: str, icon: str = None):
        """Mensaje de éxito"""
        icon = icon or self.icons.SUCCESS
        self.console.print(f"[bold {self.colors.SUCCESS}]{icon} {message}[/bold {self.colors.SUCCESS}]")
    
    def print_error(self, message: str, icon: str = None):
        """Mensaje de error"""
        icon = icon or self.icons.ERROR
        self.console.print(f"[bold {self.colors.ERROR}]{icon} {message}[/bold {self.colors.ERROR}]")
    
    def print_warning(self, message: str, icon: str = None):
        """Mensaje de advertencia"""
        icon = icon or self.icons.WARNING
        self.console.print(f"[bold {self.colors.WARNING}]{icon} {message}[/bold {self.colors.WARNING}]")
    
    def print_info(self, message: str, icon: str = None):
        """Mensaje informativo"""
        icon = icon or self.icons.INFO
        self.console.print(f"[{self.colors.INFO}]{icon} {message}[/{self.colors.INFO}]")
    
    def print_muted(self, message: str):
        """Texto atenuado"""
        self.console.print(f"[{self.colors.MUTED}]{message}[/{self.colors.MUTED}]")
    
    def create_table(self, title: str = None, show_header: bool = True) -> 'Table':
        """Crea una tabla formateada"""
        from rich.table import Table
        table = Table(
            title=title,
            box=box.ROUNDED,
            show_header=show_header,
            header_style=f"bold {self.colors.PRIMARY}",
            border_style=self.colors.PRIMARY
        )
        return table
    
    def prompt(self, message: str, choices: List[str] = None, default: str = None) -> str:
        """Prompt interactivo"""
        from rich.prompt import Prompt
        return Prompt.ask(f"[{self.colors.PRIMARY}]{message}[/{self.colors.PRIMARY}]", choices=choices, default=default)
    
    def confirm(self, message: str, default: bool = True) -> bool:
        """Confirmación sí/no"""
        from rich.prompt import Confirm
        return Confirm.ask(f"[{self.colors.PRIMARY}]{message}[/{self.colors.PRIMARY}]", default=default)
    
    def print_progress_bar(self, current: int, total: int, description: str = "Procesando"):
        """Barra de progreso simple"""
        percent = (current / total) * 100
        filled = int(30 * current / total)
        bar = "█" * filled + "░" * (30 - filled)
        self.console.print(f"\r[{bar}] {percent:.1f}% - {description}", end="")
        if current == total:
            self.console.print()  # Nueva línea al completar
    
    def print_tree(self, items: List[str], title: str = None):
        """Imprime una lista como árbol"""
        from rich.tree import Tree
        tree = Tree(f"[bold]{title or 'Items'}[/bold]")
        for item in items:
            tree.add(f"{self.icons.BULLET} {item}")
        self.console.print(tree)
    
    def show_summary_panel(self, data: Dict[str, Any]):
        """Muestra panel de resumen"""
        from rich.panel import Panel
        from rich.json import JSON
        
        content = "\n".join([f"{self.icons.BULLET} [bold]{k}:[/bold] {v}" for k, v in data.items()])
        self.console.print(Panel(
            content,
            title=f"[bold {self.colors.SUCCESS}]{self.icons.SPARKLES} Resumen[/bold {self.colors.SUCCESS}]",
            border_style=self.colors.SUCCESS
        ))

# =============================================================================
# SISTEMA DE LOGS
# =============================================================================

class SetupLogger:
    """Sistema de logging con archivo y consola"""
    
    def __init__(self, log_file: Path):
        self.log_file = log_file
        self.logger = logging.getLogger("AppNotesBG_Setup")
        self.logger.setLevel(logging.DEBUG)
        
        # Evitar duplicados
        if self.logger.handlers:
            return
        
        # Handler para archivo
        file_handler = logging.FileHandler(log_file, mode='a', encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        self.logger.addHandler(file_handler)
        
        # Handler para consola
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter('%(message)s')
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)
    
    def debug(self, msg: str):
        self.logger.debug(msg)
    
    def info(self, msg: str):
        self.logger.info(msg)
    
    def warning(self, msg: str):
        self.logger.warning(msg)
    
    def error(self, msg: str, exc_info: bool = False):
        self.logger.error(msg, exc_info=exc_info)
    
    def critical(self, msg: str):
        self.logger.critical(msg)
    
    def section(self, title: str):
        """Log de sección"""
        self.logger.info(f"\n{'='*50}")
        self.logger.info(f" {title}")
        self.logger.info(f"{'='*50}\n")

# =============================================================================
# DETECCIÓN DE ASISTENTES
# =============================================================================

@dataclass
class AssistantStatus:
    """Estado de un asistente detectado"""
    id: str
    name: str
    emoji: str
    binary_found: bool
    config_exists: bool
    is_active: bool
    version: Optional[str] = None
    
    @property
    def status_icon(self) -> str:
        if self.is_active:
            return "🟢"
        elif self.binary_found or self.config_exists:
            return "🟡"
        else:
            return "🔴"
    
    @property
    def status_text(self) -> str:
        if self.is_active:
            return "Activo"
        elif self.binary_found and self.config_exists:
            return "Parcial"
        elif self.binary_found:
            return "Binario"
        elif self.config_exists:
            return "Config"
        else:
            return "No detectado"

class AssistantDetector:
    """Detecta asistentes de IA instalados"""
    
    def __init__(self, ui: UI, logger: SetupLogger):
        self.ui = ui
        self.logger = logger
    
    def detect_all(self) -> List[AssistantStatus]:
        """Detecta todos los asistentes y retorna sus estados"""
        self.logger.section("DETECCIÓN DE ASISTENTES")
        self.ui.print_section("Detectando Asistentes Instalados", self.ui.icons.SEARCH)
        
        results = []
        
        for assistant_id, config in CONFIG.ASSISTANTS.items():
            status = self._detect_single(assistant_id, config)
            results.append(status)
            
            # Log del resultado
            self.logger.info(
                f"{config['name']}: binary={status.binary_found}, "
                f"config={status.config_exists}, active={status.is_active}"
            )
        
        return results
    
    def _detect_single(self, assistant_id: str, config: Dict) -> AssistantStatus:
        """Detecta un asistente específico"""
        # Verificar binario
        binary_found = shutil.which(config['binary']) is not None
        
        # Verificar directorio de configuración
        config_dir = CONFIG.get_assistant_dir(assistant_id)
        config_exists = config_dir.exists()
        
        # Determinar si está "activo"
        is_active = binary_found and config_exists
        
        # Intentar obtener versión
        version = None
        if binary_found:
            version = self._get_version(config['binary'])
        
        return AssistantStatus(
            id=assistant_id,
            name=config['name'],
            emoji=config['emoji'],
            binary_found=binary_found,
            config_exists=config_exists,
            is_active=is_active,
            version=version
        )
    
    def _get_version(self, binary: str) -> Optional[str]:
        """Intenta obtener la versión del binario"""
        try:
            result = subprocess.run(
                [binary, "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                # Extraer versión de la salida
                version_match = re.search(r'(\d+\.\d+\.\d+)', result.stdout)
                if version_match:
                    return version_match.group(1)
        except:
            pass
        return None
    
    def display_results(self, statuses: List[AssistantStatus]):
        """Muestra tabla de resultados"""
        table = self.ui.create_table("Asistentes Detectados")
        table.add_column("Estado", justify="center", width=8)
        table.add_column("Asistente", width=15)
        table.add_column("Binario", justify="center", width=10)
        table.add_column("Config", justify="center", width=10)
        table.add_column("Versión", width=12)
        
        for status in statuses:
            binary_icon = "✅" if status.binary_found else "❌"
            config_icon = "✅" if status.config_exists else "❌"
            
            table.add_row(
                f"{status.status_icon} {status.status_text}",
                f"{status.emoji} {status.name}",
                binary_icon,
                config_icon,
                status.version or "—"
            )
        
        self.ui.console.print(table)
        self.ui.console.print()

# =============================================================================
# GESTIÓN DE API KEYS
# =============================================================================

class APIKeyManager:
    """Gestiona la configuración de API keys"""
    
    def __init__(self, ui: UI, logger: SetupLogger):
        self.ui = ui
        self.logger = logger
        self.configured_keys: Dict[str, str] = {}
    
    def configure_interactive(self) -> Dict[str, str]:
        """Configuración interactiva de API keys"""
        self.logger.section("CONFIGURACIÓN DE API KEYS")
        self.ui.print_section("Configuración de API Keys", self.ui.icons.KEY)
        self.ui.print_muted("Puedes dejar en blanco para configurar después\n")
        
        # Mostrar providers disponibles
        self._display_providers_table()
        
        for provider_id, provider_config in CONFIG.API_PROVIDERS.items():
            self._configure_provider(provider_id, provider_config)
        
        # Resumen
        self._display_keys_summary()
        
        return self.configured_keys
    
    def _display_providers_table(self):
        """Muestra tabla de providers"""
        table = self.ui.create_table("Providers Disponibles")
        table.add_column("Provider", width=20)
        table.add_column("Descripción")
        table.add_column("Modelos", width=30)
        
        for provider_id, config in CONFIG.API_PROVIDERS.items():
            models_str = ", ".join(config['models'][:2]) + "..."
            table.add_row(
                f"{config['emoji']} {config['name']}",
                config['description'],
                models_str
            )
        
        self.ui.console.print(table)
        self.ui.console.print()
    
    def _configure_provider(self, provider_id: str, config: Dict):
        """Configura un provider específico"""
        self.ui.console.print()
        self.ui.print_info(
            f"Configurando {config['emoji']} {config['name']}",
            icon=""
        )
        
        # Pedir API key
        key = self.ui.prompt(f"API Key para {config['name']} (opcional)")
        
        if not key:
            self.ui.print_muted(f"  {self.ui.icons.ARROW} Omitido\n")
            return
        
        # Validar
        self.ui.print_info("Validando API key...")
        is_valid, error_msg = self._validate_key(provider_id, key)
        
        if is_valid:
            self.configured_keys[provider_id] = key
            os.environ[config['env_var']] = key
            self.ui.print_success(f"API key válida para {config['name']}\n")
            self.logger.info(f"API key configurada: {provider_id}")
        else:
            self.ui.print_error(f"API key inválida: {error_msg}")
            self._handle_validation_failure(provider_id, config, key)
    
    def _validate_key(self, provider: str, key: str) -> Tuple[bool, str]:
        """Valida una API key haciendo petición real"""
        try:
            import requests
            
            config = CONFIG.API_PROVIDERS[provider]
            
            if provider == "openai":
                headers = {"Authorization": f"Bearer {key}"}
                response = requests.get(
                    config['test_url'],
                    headers=headers,
                    timeout=10
                )
                if response.status_code == 200:
                    return True, ""
                elif response.status_code == 401:
                    return False, "Autenticación fallida - key inválida"
                else:
                    return False, f"Error HTTP {response.status_code}"
                    
            elif provider == "anthropic":
                # Anthropic no tiene endpoint público simple, verificamos formato
                if not key.startswith("sk-ant-"):
                    return False, "Formato incorrecto - debe empezar con 'sk-ant-'"
                # Intentamos una petición que requiere auth
                headers = {
                    "x-api-key": key,
                    "Content-Type": "application/json"
                }
                response = requests.get(
                    "https://api.anthropic.com/v1/models",
                    headers=headers,
                    timeout=10
                )
                if response.status_code == 200:
                    return True, ""
                elif response.status_code == 401:
                    return False, "Autenticación fallida"
                else:
                    return True, ""  # 404 u otros pueden ser OK si la auth pasó
                    
            elif provider == "google":
                url = f"{config['test_url']}?key={key}"
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    return True, ""
                elif response.status_code == 400:
                    return False, "Key inválida"
                else:
                    return False, f"Error HTTP {response.status_code}"
                    
        except requests.exceptions.Timeout:
            return False, "Timeout - verifica tu conexión"
        except requests.exceptions.ConnectionError:
            return False, "Error de conexión"
        except Exception as e:
            return False, f"Error: {str(e)}"
        
        return False, "Provider no soportado"
    
    def _handle_validation_failure(self, provider_id: str, config: Dict, key: str):
        """Maneja el fallo de validación ofreciendo opciones"""
        self.ui.console.print()
        
        choice = self.ui.prompt(
            "¿Qué deseas hacer?",
            choices=["reintentar", "saltar", "omitir", "manual"],
            default="saltar"
        )
        
        if choice == "reintentar":
            self._configure_provider(provider_id, config)
        elif choice == "manual":
            # Guardar sin validar
            self.configured_keys[provider_id] = key
            os.environ[config['env_var']] = key
            self.ui.print_warning("Key guardada sin validar\n")
        elif choice == "omitir":
            self.ui.print_muted("Provider omitido\n")
        # "saltar" simplemente continúa sin guardar
    
    def _display_keys_summary(self):
        """Muestra resumen de keys configuradas"""
        if not self.configured_keys:
            self.ui.print_warning("No se configuraron API keys")
            return
        
        self.ui.console.print()
        self.ui.print_success(
            f"API Keys configuradas: {len(self.configured_keys)}",
            icon=self.ui.icons.KEY
        )
        
        for provider_id in self.configured_keys:
            config = CONFIG.API_PROVIDERS[provider_id]
            self.ui.console.print(f"  {self.ui.icons.CHECK} {config['emoji']} {config['name']}")
        
        self.ui.console.print()
        self.ui.print_muted("💡 Puedes agregar más keys después con: ./skills/setup.py update")

# =============================================================================
# TRANSFORMACIÓN DE SKILLS
# =============================================================================

@dataclass
class SkillData:
    """Datos de un skill parseado"""
    name: str
    title: str
    file_path: Path
    relative_path: str
    sections: Dict[str, str]
    raw_content: str

class SkillTransformer:
    """Transforma skills al formato de cada asistente"""
    
    def __init__(self, ui: UI, logger: SetupLogger):
        self.ui = ui
        self.logger = logger
    
    def discover_skills(self) -> List[Path]:
        """Descubre todos los skills en /skills/"""
        self.logger.section("DESCUBRIMIENTO DE SKILLS")
        self.ui.print_section("Descubriendo Skills", self.ui.icons.BOOK)
        
        skills = []
        
        # Buscar todos los .md excepto el propio setup.py
        for md_file in CONFIG.SKILLS_SOURCE_DIR.rglob("*.md"):
            if md_file.name == "setup.py":
                continue
            if self._is_valid_skill(md_file):
                skills.append(md_file)
                self.logger.debug(f"Skill encontrado: {md_file}")
        
        skills.sort()
        
        self.ui.print_success(f"Skills encontrados: {len(skills)}")
        
        # Mostrar lista
        skill_names = [f"{self.ui.icons.FILE} {s.stem}" for s in skills]
        self.ui.print_tree(skill_names, "Skills Disponibles")
        
        return skills
    
    def _is_valid_skill(self, file: Path) -> bool:
        """Verifica si un archivo es un skill válido"""
        # Excluir archivos comunes que no son skills
        excluded = {'README', 'CHANGELOG', 'CONTRIBUTING', 'LICENSE', 'setup'}
        return file.stem.lower() not in excluded
    
    def transform_all(self, skills: List[Path], assistant_id: str) -> int:
        """Transforma todos los skills para un asistente"""
        config = CONFIG.ASSISTANTS[assistant_id]
        output_dir = CONFIG.get_assistant_dir(assistant_id) / config['skills_subdir']
        
        self.logger.section(f"TRANSFORMACIÓN PARA {config['name'].upper()}")
        self.ui.print_section(
            f"Transformando Skills para {config['emoji']} {config['name']}",
            self.ui.icons.MAGIC
        )
        
        # Crear directorio de salida
        output_dir.mkdir(parents=True, exist_ok=True)
        
        transformed_count = 0
        
        # Procesar cada skill con barra de progreso
        for i, skill_file in enumerate(skills, 1):
            try:
                self._transform_single(skill_file, assistant_id, output_dir)
                transformed_count += 1
                
                # Mostrar progreso
                self.ui.print_progress_bar(i, len(skills), f"Transformando {skill_file.stem}")
                
            except Exception as e:
                self.logger.error(f"Error transformando {skill_file}: {e}")
                self.ui.print_error(f"Error en {skill_file.name}: {str(e)[:50]}")
        
        self.ui.console.print()
        self.ui.print_success(
            f"{transformed_count} skills transformados exitosamente",
            icon=self.ui.icons.SPARKLES
        )
        
        return transformed_count
    
    def _transform_single(self, skill_file: Path, assistant_id: str, output_dir: Path):
        """Transforma un skill individual"""
        # Parsear skill
        skill_data = self._parse_skill(skill_file)
        
        # Transformar según asistente
        if assistant_id == "opencode":
            content = self._to_opencode(skill_data)
        elif assistant_id == "claude":
            content = self._to_claude(skill_data)
        elif assistant_id == "cursor":
            content = self._to_cursor(skill_data)
        else:
            raise ValueError(f"Asistente no soportado: {assistant_id}")
        
        # Guardar archivo
        output_path = self._get_output_path(skill_file, assistant_id, output_dir)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding='utf-8')
        
        self.logger.info(f"Transformado: {skill_file.name} -> {output_path}")
    
    def _parse_skill(self, skill_file: Path) -> SkillData:
        """Extrae información de un archivo de skill"""
        content = skill_file.read_text(encoding='utf-8')
        
        # Extraer título (# Título)
        title_match = re.search(r'^# (.+)$', content, re.MULTILINE)
        title = title_match.group(1) if title_match else skill_file.stem
        
        # Extraer secciones
        sections = {}
        current_section = None
        current_content = []
        
        for line in content.split('\n'):
            section_match = re.match(r'^##?\s+(.+)$', line)
            if section_match:
                if current_section:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = section_match.group(1).strip().lower().replace(' ', '_')
                current_content = []
            elif current_section:
                current_content.append(line)
        
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content).strip()
        
        return SkillData(
            name=skill_file.stem,
            title=title,
            file_path=skill_file,
            relative_path=str(skill_file.relative_to(CONFIG.SKILLS_SOURCE_DIR)),
            sections=sections,
            raw_content=content
        )
    
    def _get_output_path(self, skill_file: Path, assistant_id: str, output_dir: Path) -> Path:
        """Determina la ruta de salida según el asistente"""
        config = CONFIG.ASSISTANTS[assistant_id]
        skill_name = skill_file.stem.lower().replace('_', '-').replace(' ', '-')
        
        if config.get('create_subdir', False):
            # Estructura: .opencode/skills/{skill-name}/SKILL.md
            return output_dir / skill_name / config['filename_template']
        else:
            # Estructura: .claude/commands/{skill-name}.md
            filename = config['filename_template'].format(name=skill_name)
            return output_dir / filename
    
    def _to_opencode(self, skill: SkillData) -> str:
        """Transforma a formato Opencode"""
        sections = skill.sections
        
        return f"""---
name: {skill.name.lower().replace('_', '-').replace(' ', '-')}
description: {sections.get('rol', 'Skill de AppNotesBG')[:100]}
version: "1.0.0"
source: {skill.relative_path}
generated_at: {datetime.now().isoformat()}
tags: [{skill.name.lower().replace('_', '-')}, appnotesbg]
---

# 🎯 What I Do
{sections.get('rol', 'Sin descripción')}

# ⚡ When to Use Me
{sections.get('activacion', 'Cuando sea necesario')}

# 🔄 How to Use Me

## Execution Flow
{sections.get('flujo_de_ejecucion', sections.get('protocolo_de_entrada', 'Seguir las instrucciones del skill'))}

## Input Protocol
```json
{{
  "action": "string",
  "data": {{}}
}}
```

## Output Protocol
```json
{{
  "success": true,
  "result": {{}}
}}
```

# ⚠️ Constraints
{sections.get('restricciones_clave', 'Seguir las reglas del proyecto')}

# 📚 References
- **Source**: `{skill.relative_path}`
- **Title**: {skill.title}
- **Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---
*Generated by AppNotesBG Multi-Assistant Installer v{CONFIG.VERSION}*
"""
    
    def _to_claude(self, skill: SkillData) -> str:
        """Transforma a formato Claude Code"""
        sections = skill.sections
        
        return f"""# {skill.title}

## 🎯 Role
{sections.get('rol', 'Sin descripción')}

## 📊 Level
{sections.get('nivel', 'Not specified')}

## 🌍 Domain
{sections.get('dominio', 'General')}

## ⚡ When to Use
{sections.get('activacion', 'Use when needed')}

## 🔄 Execution Flow
{sections.get('flujo_de_ejecucion', sections.get('protocolo_de_entrada', 'Follow instructions'))}

## 📥 Input Protocol
{sections.get('protocolo_de_entrada', 'JSON format')}

## 📤 Output Protocol
{sections.get('protocolo_de_salida', 'JSON format')}

## ⚠️ Constraints
{sections.get('restricciones_clave', sections.get('reglas', 'Follow best practices'))}

## 📚 References
- **Source**: `{skill.relative_path}`
- **Generated**: {datetime.now().isoformat()}

---
*Generated by AppNotesBG Multi-Assistant Installer v{CONFIG.VERSION}*
"""
    
    def _to_cursor(self, skill: SkillData) -> str:
        """Transforma a formato Cursor"""
        sections = skill.sections
        
        return f"""# {skill.title}

## Description
{sections.get('rol', 'Skill for AppNotesBG')}

## Activation
{sections.get('activacion', 'Automatic or on demand')}

## Rules
{sections.get('restricciones_clave', sections.get('reglas', 'Follow best practices'))}

## Workflow
{sections.get('flujo_de_ejecucion', 'Execute as documented')}

## Source
{skill.relative_path}

---
*Generated by AppNotesBG Multi-Assistant Installer v{CONFIG.VERSION}*
"""

# =============================================================================
# GENERACIÓN DE CONFIGURACIÓN
# =============================================================================

class ConfigGenerator:
    """Genera archivos de configuración"""
    
    def __init__(self, ui: UI, logger: SetupLogger):
        self.ui = ui
        self.logger = logger
    
    def generate_ai_assistant_json(self, installed_assistants: List[str], api_keys: Dict[str, str]):
        """Genera .ai-assistant.json"""
        self.logger.info("Generando .ai-assistant.json")
        
        config = {
            "project": {
                "name": CONFIG.PROJECT_NAME,
                "version": CONFIG.VERSION,
                "generated_at": datetime.now().isoformat(),
                "last_update": datetime.now().isoformat()
            },
            "configuration": {
                "active_assistants": installed_assistants,
                "default_assistant": installed_assistants[0] if installed_assistants else None,
                "auto_update": True,
                "log_level": "INFO"
            },
            "skills": {
                "source_directory": str(CONFIG.SKILLS_SOURCE_DIR),
                "total_count": len(list(CONFIG.SKILLS_SOURCE_DIR.rglob("*.md"))),
                "installed_for": installed_assistants
            },
            "providers": {
                provider_id: {
                    "configured": provider_id in api_keys,
                    "models": CONFIG.API_PROVIDERS[provider_id]["models"]
                }
                for provider_id in CONFIG.API_PROVIDERS.keys()
            },
            "metadata": {
                "installer_version": CONFIG.VERSION,
                "installation_path": str(CONFIG.PROJECT_ROOT),
                "log_file": str(CONFIG.SETUP_LOG)
            }
        }
        
        CONFIG.AI_ASSISTANT_JSON.write_text(
            json.dumps(config, indent=2),
            encoding='utf-8'
        )
        
        self.ui.print_success(
            f".ai-assistant.json generado",
            icon=self.ui.icons.FILE
        )
    
    def generate_setupignore(self):
        """Genera .setupignore si no existe"""
        if CONFIG.SETUP_IGNORE.exists():
            self.logger.info(".setupignore ya existe")
            return
        
        content = """# AppNotesBG Setup Ignore
# Skills excluidos de la instalación
# Sintaxis: uno por línea, soporta wildcards

# Ejemplos (descomenta para usar):
# README.md
# CHANGELOG.md
# draft-*
# experimental/*
# *-test.md
"""
        
        CONFIG.SETUP_IGNORE.write_text(content, encoding='utf-8')
        self.ui.print_success(".setupignore creado", icon=self.ui.icons.FILE)
    
    def save_env_file(self, api_keys: Dict[str, str]):
        """Guarda API keys en archivo .env"""
        if not api_keys:
            return
        
        env_content = "# AppNotesBG API Keys\n"
        env_content += f"# Generated: {datetime.now().isoformat()}\n\n"
        
        for provider_id, key in api_keys.items():
            config = CONFIG.API_PROVIDERS[provider_id]
            env_content += f"# {config['name']}\n"
            env_content += f"{config['env_var']}={key}\n\n"
        
        # Añadir al .env existente o crear nuevo
        if CONFIG.ENV_FILE.exists():
            existing = CONFIG.ENV_FILE.read_text(encoding='utf-8')
            if 'AppNotesBG API Keys' not in existing:
                existing += f"\n\n{env_content}"
                CONFIG.ENV_FILE.write_text(existing, encoding='utf-8')
        else:
            CONFIG.ENV_FILE.write_text(env_content, encoding='utf-8')
        
        self.ui.print_success("API keys guardadas en .env", icon=self.ui.icons.KEY)

# =============================================================================
# INSTALADOR PRINCIPAL
# =============================================================================

class MultiAssistantInstaller:
    """Orquestador principal"""
    
    def __init__(self):
        self.ui = UI()
        self.logger = SetupLogger(CONFIG.SETUP_LOG)
        self.detector = AssistantDetector(self.ui, self.logger)
        self.api_manager = APIKeyManager(self.ui, self.logger)
        self.transformer = SkillTransformer(self.ui, self.logger)
        self.config_gen = ConfigGenerator(self.ui, self.logger)
        
        self.installed_assistants: List[str] = []
        self.skills: List[Path] = []
    
    def run(self, args: argparse.Namespace) -> int:
        """Ejecuta el flujo completo"""
        
        # Modo dry-run
        if args.dry_run:
            self.ui.console.print(
                Panel("[yellow]🔍 MODO DRY-RUN: No se realizarán cambios reales[/yellow]")
            )
        
        # Banner
        self.ui.print_banner()
        
        # Verificar requisitos
        if not self._check_requirements():
            return 1
        
        # Detectar asistentes
        assistant_statuses = self.detector.detect_all()
        self.detector.display_results(assistant_statuses)
        
        # Seleccionar asistentes
        selected = self._select_assistants(assistant_statuses, args)
        if not selected:
            self.ui.print_warning("No se seleccionaron asistentes")
            return 0
        
        # Configurar API keys
        api_keys = {}
        if not args.skip_api:
            api_keys = self.api_manager.configure_interactive()
        
        # Descubrir skills
        self.skills = self.transformer.discover_skills()
        
        # Instalar para cada asistente
        for assistant_id in selected:
            self._install_assistant(assistant_id, args.dry_run)
        
        # Generar configuraciones
        if not args.dry_run:
            self.config_gen.generate_ai_assistant_json(self.installed_assistants, api_keys)
            self.config_gen.generate_setupignore()
            self.config_gen.save_env_file(api_keys)
            
            # Opcional: git hooks
            if self.ui.confirm("¿Activar auto-actualización con git hooks?", default=True):
                self._install_git_hook()
        
        # Resumen final
        self._print_final_summary()
        
        return 0
    
    def _check_requirements(self) -> bool:
        """Verifica requisitos previos"""
        self.ui.print_section("Verificando Requisitos", self.ui.icons.GEAR)
        
        checks = [
            ("Python 3.8+", sys.version_info >= (3, 8)),
            ("Directorio ./skills/", CONFIG.SKILLS_SOURCE_DIR.exists()),
        ]
        
        all_passed = True
        for name, passed in checks:
            icon = self.ui.icons.SUCCESS if passed else self.ui.icons.ERROR
            status = "✅" if passed else "❌"
            self.ui.console.print(f"  {status} {name}")
            if not passed:
                all_passed = False
        
        if not all_passed:
            self.ui.print_error("No se cumplen todos los requisitos")
            return False
        
        self.ui.print_success("Requisitos verificados")
        return True
    
    def _select_assistants(self, statuses: List[AssistantStatus], args: argparse.Namespace) -> List[str]:
        """Selecciona qué asistentes instalar"""
        
        # Filtrar detectados
        detected = [s for s in statuses if s.binary_found or s.config_exists]
        
        if args.assistant == "all":
            return [s.id for s in detected]
        
        if args.assistant and args.assistant != "detect":
            if args.force or any(s.id == args.assistant for s in detected):
                return [args.assistant]
            else:
                self.ui.print_error(f"Asistente '{args.assistant}' no detectado")
                return []
        
        # Modo interactivo
        if len(detected) == 0:
            self.ui.print_error("No se detectaron asistentes instalados")
            return []
        
        if len(detected) == 1:
            if self.ui.confirm(f"¿Instalar para {detected[0].emoji} {detected[0].name}?", default=True):
                return [detected[0].id]
            return []
        
        # Mostrar opciones
        self.ui.console.print()
        self.ui.print_info("Selecciona los asistentes para instalar:")
        
        options = []
        for status in detected:
            options.append(status.id)
            self.ui.console.print(f"  [{len(options)}] {status.emoji} {status.name} ({status.status_text})")
        
        self.ui.console.print(f"  [a] Todos los detectados")
        self.ui.console.print(f"  [n] Ninguno")
        
        choice = self.ui.prompt("Selección", default="1")
        
        if choice.lower() == 'a':
            return [s.id for s in detected]
        elif choice.lower() == 'n':
            return []
        else:
            try:
                idx = int(choice) - 1
                if 0 <= idx < len(detected):
                    return [detected[idx].id]
            except ValueError:
                pass
            return []
    
    def _install_assistant(self, assistant_id: str, dry_run: bool):
        """Instala para un asistente específico"""
        config = CONFIG.ASSISTANTS[assistant_id]
        
        self.ui.console.print()
        self.ui.console.print(Panel(
            f"{config['emoji']} Instalando para {config['name']}",
            border_style=config['color']
        ))
        
        if dry_run:
            skills_dir = CONFIG.get_assistant_dir(assistant_id) / config['skills_subdir']
            self.ui.print_muted(f"[DRY-RUN] Se instalaría en: {skills_dir}")
            return
        
        # Transformar skills
        count = self.transformer.transform_all(self.skills, assistant_id)
        
        self.installed_assistants.append(assistant_id)
        self.logger.info(f"Instalación completada: {assistant_id} ({count} skills)")
    
    def _install_git_hook(self):
        """Instala git hook para auto-actualización"""
        hook_path = CONFIG.PROJECT_ROOT / ".git" / "hooks" / "post-checkout"
        
        if hook_path.exists():
            self.ui.print_warning("Ya existe un post-checkout hook")
            return
        
        hook_content = '''#!/bin/bash
# Auto-actualización de skills para asistentes de IA
echo "🔄 Actualizando configuraciones de IA..."
cd "$(dirname "$0")/../.."
python ./skills/setup.py update --quiet 2>/dev/null || true
'''
        
        hook_path.write_text(hook_content)
        hook_path.chmod(0o755)
        
        self.ui.print_success("Git hook instalado para auto-actualización", icon=self.ui.icons.GEAR)
    
    def _print_final_summary(self):
        """Muestra resumen final"""
        self.ui.console.print()
        
        summary_data = {
            "Asistentes configurados": len(self.installed_assistants),
            "Skills procesados": len(self.skills),
            "APIs configuradas": len(self.api_manager.configured_keys),
            "Versión": CONFIG.VERSION
        }
        
        self.ui.show_summary_panel(summary_data)
        
        # Listar asistentes
        if self.installed_assistants:
            self.ui.console.print()
            self.ui.print_info("Asistentes configurados:")
            for ast_id in self.installed_assistants:
                config = CONFIG.ASSISTANTS[ast_id]
                self.ui.console.print(f"  {config['emoji']} {config['name']}")
        
        # Próximos pasos
        self.ui.console.print()
        self.ui.console.print(Panel(
            "[bold]Próximos pasos:[/bold]\n"
            "1. Reinicia tu asistente de IA\n"
            "2. Los skills están disponibles automáticamente\n"
            "3. Para actualizar: [cyan]python ./skills/setup.py update[/cyan]",
            title="🚀 Listo para usar",
            border_style="green"
        ))

# =============================================================================
# COMANDOS ESPECIALES
# =============================================================================

def cmd_update(ui: UI, logger: SetupLogger):
    """Modo actualización"""
    ui.print_section("Modo Actualización", Icons.LOADING)
    
    if not CONFIG.AI_ASSISTANT_JSON.exists():
        ui.print_error("No se encontró .ai-assistant.json")
        ui.print_info("Ejecuta primero: python ./skills/setup.py")
        return 1
    
    # Leer configuración actual
    config = json.loads(CONFIG.AI_ASSISTANT_JSON.read_text())
    installed = config.get('configuration', {}).get('active_assistants', [])
    
    if not installed:
        ui.print_warning("No hay asistentes instalados")
        return 0
    
    ui.print_info(f"Asistentes instalados: {', '.join(installed)}")
    
    # Detectar cambios
    transformer = SkillTransformer(ui, logger)
    skills = transformer.discover_skills()
    
    # Reinstalar
    for assistant_id in installed:
        ui.print_info(f"Actualizando {assistant_id}...")
        transformer.transform_all(skills, assistant_id)
    
    # Actualizar timestamp
    config['project']['last_update'] = datetime.now().isoformat()
    CONFIG.AI_ASSISTANT_JSON.write_text(json.dumps(config, indent=2))
    
    ui.print_success("Actualización completada")
    return 0

def cmd_detect(ui: UI, logger: SetupLogger):
    """Solo detectar asistentes"""
    detector = AssistantDetector(ui, logger)
    statuses = detector.detect_all()
    detector.display_results(statuses)
    return 0

def cmd_clean(ui: UI, logger: SetupLogger):
    """Limpiar todo"""
    ui.print_warning("🗑️ Limpiando configuraciones generadas...")
    
    removed = []
    for assistant_id in CONFIG.ASSISTANTS.keys():
        dir_path = CONFIG.get_assistant_dir(assistant_id)
        if dir_path.exists():
            shutil.rmtree(dir_path)
            removed.append(f"{assistant_id}/")
    
    if CONFIG.AI_ASSISTANT_JSON.exists():
        CONFIG.AI_ASSISTANT_JSON.unlink()
        removed.append(".ai-assistant.json")
    
    if removed:
        ui.print_success(f"Eliminado: {', '.join(removed)}")
    else:
        ui.print_info("No había configuraciones para limpiar")
    
    return 0

# =============================================================================
# ENTRY POINT
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description=f"{CONFIG.EMOJI_LOGO} AppNotesBG - Multi-Asistente AI Installer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
Ejemplos:
  python ./skills/setup.py                    # Modo interactivo
  python ./skills/setup.py opencode           # Instalar Opencode
  python ./skills/setup.py all --dry-run      # Simular para todos
  python ./skills/setup.py claude --force     # Forzar instalación Claude
  python ./skills/setup.py update             # Actualizar existentes
  python ./skills/setup.py detect             # Solo detectar asistentes
  python ./skills/setup.py clean              # Limpiar todo

Versión: {CONFIG.VERSION}
        """
    )
    
    parser.add_argument(
        "assistant",
        nargs="?",
        choices=["opencode", "claude", "cursor", "all", "update", "detect", "clean"],
        help="Asistente para instalar o comando especial"
    )
    
    parser.add_argument(
        "--dry-run", "-n",
        action="store_true",
        help="Simular instalación sin hacer cambios"
    )
    
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Forzar instalación aunque no se detecte el asistente"
    )
    
    parser.add_argument(
        "--skip-api",
        action="store_true",
        help="Omitir configuración de API keys"
    )
    
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Modo silencioso (solo errores)"
    )
    
    parser.add_argument(
        "--version", "-v",
        action="version",
        version=f"%(prog)s {CONFIG.VERSION}"
    )
    
    args = parser.parse_args()
    
    # Setup básico
    ui = UI()
    logger = SetupLogger(CONFIG.SETUP_LOG)
    
    # Comandos especiales
    if args.assistant == "update":
        return cmd_update(ui, logger)
    
    if args.assistant == "detect":
        return cmd_detect(ui, logger)
    
    if args.assistant == "clean":
        return cmd_clean(ui, logger)
    
    # Instalador principal
    try:
        installer = MultiAssistantInstaller()
        return installer.run(args)
    except KeyboardInterrupt:
        ui.print_warning("\n⚠️  Instalación cancelada por el usuario")
        return 130
    except Exception as e:
        logger.error(f"Error fatal: {e}", exc_info=True)
        ui.print_error(f"Error inesperado: {e}")
        ui.print_info(f"Revisa el log: {CONFIG.SETUP_LOG}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
