# 2kOFFICE

Bienvenido al repositorio de **2kOFFICE**, una plataforma web para la gestión administrativa y simulación de la Agencia Libre, plantillas, salarios y traspasos de una liga virtual de baloncesto (estilo NBA 2K).

## 🚀 Despliegue en Producción

El proyecto está diseñado para funcionar de manera completamente estática (HTML, CSS y JS puro). El despliegue de la versión en producción se realiza automáticamente mediante **GitHub Pages**.

La rama principal del repositorio es `main` y sirve los archivos que forman la página web directamente. Cualquier *commit* que se empuje a la rama `main` se verá reflejado en la página web tras la compilación de GitHub Pages.

## 📂 Estructura del Proyecto

Tras la reorganización estructural, el proyecto se divide en las siguientes carpetas y archivos clave:

```text
2kOFFICE/
│
├── index.html              # Página principal (Dashboard / Inicio)
├── equipos.html            # Resumen y estadísticas globales de franquicias
├── fa.html                 # FA Office (Agencia Libre principal)
├── jugadores.html          # Base de datos global de jugadores
├── roster.html             # Gestión financiera y roster por equipo
├── simulador.html          # Panel de simulación y herramientas para FA
├── trade.html              # Herramienta de traspasos interactiva
├── visual_roster.html      # Roster visual interactivamente ordenable
├── agentes_libres.html     # Lista de agentes libres específicos
│
├── assets/                 # Recursos estáticos
│   ├── fonts/              # Fuentes personalizadas (Platinum Sign, etc.)
│   ├── logos/              # Logos de los equipos (PNG/GIF)
│   └── photos/             # Fotografías individuales de cada jugador (PNG/SVG)
│
├── css/                    # Hojas de estilo estructuradas por sección
│
├── data/                   # Archivos de la base de datos (CSV)
│   ├── players.csv         # Datos e información financiera de los jugadores
│   ├── economia.csv        # Finanzas y presupuestos de cada franquicia
│   └── draft_picks.csv     # Rondas de draft disponibles para traspasos
│
├── js/                     # Lógica frontend de la aplicación
│   ├── shared/             # Utilidades, acceso a datos (CSV) y lógica central (engine.js)
│   └── [archivo].js        # Un script principal asociado a cada página HTML
│
└── scripts/                # Herramientas de mantenimiento y utilidades (Backend/Data)
    ├── auto_subir.bat      # Script rápido para empujar cambios a GitHub
    ├── subir_github.bat    # Script de sincronización Git con más logs
    └── _tools_y_scrapers/  # Scripts en Python/PS/JS para actualizar bases de datos
```

## 🛠️ Entorno de Desarrollo Local

Debido a que la aplicación carga archivos locales (los `.csv` que actúan como base de datos) usando la API `fetch`, **no funcionará haciendo doble clic directamente en el `index.html`** debido a las políticas de seguridad CORS del navegador.

### Cómo trabajar en local:

1. **Instala Visual Studio Code (VS Code)**.
2. Instala la extensión **Live Server**.
3. Abre la carpeta del proyecto `2kOFFICE` en VS Code.
4. Haz clic derecho sobre el archivo `index.html` (o cualquier otra página) y selecciona **"Open with Live Server"**.
5. Esto abrirá un servidor local (por defecto `http://127.0.0.1:5500`) que servirá correctamente los recursos y los archivos CSV, permitiendo probar la lógica y simuladores sin errores.

## 💾 Gestión de la Base de Datos (CSV)

La persistencia de datos (Agencia Libre, presupuestos, cambios de equipo, etc.) se gestiona alterando los archivos ubicados en `/data`:
- **`players.csv`**: Modifica salarios, equipos asignados, valoraciones y derechos Bird.
- **`economia.csv`**: Modifica topes salariales, presupuestos y espacio de excepciones.

**Importante:** Cualquier guardado que ofrezca la UI (por ejemplo en FA Office con permisos de Administrador usando File System Access API), solicitará permiso al navegador para sobrescribir directamente el archivo `players.csv` de tu carpeta local, actualizando así la persistencia antes de hacer *commit* y *push*.

## 👨‍💻 Scripts y Herramientas Automáticas

Dentro de la carpeta `/scripts` encontrarás pequeños programas y *scrapers*:
- `auto_subir.bat` / `subir_github.bat`: Accesos directos rápidos para empaquetar tus cambios locales de los CSVs o código y subirlos a GitHub.
- `_tools_y_scrapers/`: Scripts mayormente en Python y Powershell diseñados para tareas masivas (ej. actualizar fechas de nacimiento, parsear nuevos rosters, importar imágenes, etc.).

---
*Mantenimiento y actualizaciones: Actualiza los CSV localmente y haz push a GitHub para reflejar los cambios en el simulador web.*
