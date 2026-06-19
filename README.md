# Aplicación de Seguimiento de Actividades de Estudio

Esta aplicación web te permite llevar un registro detallado de tus actividades de estudio mediante un calendario interactivo.

## Características

- Calendario interactivo para visualizar todas tus actividades
- Registro de tareas con detalles como:
  - Tema de estudio
  - Horas dedicadas
  - Proyecto al que pertenece
  - Nivel de importancia
- Visualización compacta y elegante de las actividades
- Edición y eliminación de registros
- Interfaz responsiva para dispositivos móviles y de escritorio

## Requisitos

- Python 3.14 o superior
- uv

## Instalación

1. Clona o descarga este repositorio
2. Instala las dependencias con uv:

```bash
uv sync
```

3. Opcionalmente define variables de entorno:

```bash
export SECRET_KEY="cambia-esto-en-produccion"
export DATABASE_URL="sqlite:///instance/estudio_tracker.db"
```

4. Ejecuta la aplicación en desarrollo:

```bash
uv run flask --app app run --debug
```

5. Abre tu navegador y visita: `http://localhost:5000`

## Despliegue

El proyecto incluye configuración para Render/Heroku-style:

- `pyproject.toml` define las dependencias principales
- `uv.lock` bloquea versiones reproducibles
- `requirements.txt` se genera desde `uv.lock` para compatibilidad
- `Procfile` ejecuta `uv run gunicorn app:app`
- `.python-version` fija Python 3.14 para tooling moderno
- `runtime.txt` mantiene compatibilidad con plataformas que todavía lo leen
- `render.yaml` instala `uv`, ejecuta `uv sync --locked` y arranca con `uv run`

En producción define `SECRET_KEY` y, si no usas SQLite local, `DATABASE_URL`.

## Uso

1. Haz clic en cualquier día del calendario para seleccionarlo
2. Completa el formulario con los detalles de tu actividad de estudio
3. Haz clic en "Guardar" para registrar la actividad
4. Las actividades se mostrarán en el calendario con colores según su importancia:
   - Rojo: Alta importancia
   - Amarillo: Media importancia
   - Azul: Baja importancia
5. Puedes hacer clic en cualquier actividad para editarla o eliminarla

## Tecnologías utilizadas

- Backend: Flask (Python)
- Base de datos: SQLite con Flask-SQLAlchemy / SQLAlchemy
- Gestor de paquetes: uv
- Frontend: HTML, CSS, JavaScript
- Bibliotecas: FullCalendar.js, Bootstrap 5

## Licencia

Este proyecto está disponible como código abierto bajo la licencia MIT.
