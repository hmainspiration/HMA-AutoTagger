# 🎵 YouTube → MP3 Downloader

Convierte y descarga el audio de cualquier video de YouTube a MP3 en **128 kbps**.

## Requisitos previos

- **Python 3.8+**
- **FFmpeg** instalado y en el PATH del sistema

---

## Instalación paso a paso

### 1 · Instala FFmpeg

| Sistema       | Comando / Instrucción                                                    |
|---------------|--------------------------------------------------------------------------|
| **Windows**   | Descarga desde [ffmpeg.org](https://ffmpeg.org/download.html), extrae y agrega la carpeta `bin/` al PATH |
| **macOS**     | `brew install ffmpeg`                                                    |
| **Ubuntu/Debian** | `sudo apt update && sudo apt install ffmpeg`                         |
| **Fedora/RHEL**   | `sudo dnf install ffmpeg`                                            |

Verifica que funciona:
```bash
ffmpeg -version
```

### 2 · (Opcional) Crea un entorno virtual

```bash
python -m venv venv

# Linux / macOS
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3 · Instala las dependencias de Python

```bash
pip install -r requirements.txt
```

---

## Uso

```bash
python app.py
```

Abre tu navegador en → **http://localhost:5000**

1. Pega la URL del video de YouTube
2. Haz clic en **Buscar** para ver el preview
3. Haz clic en **Descargar MP3**
4. El archivo `.mp3` se guarda en tu carpeta de Descargas

---

## Estructura del proyecto

```
yt-mp3/
├── app.py              ← Backend Flask
├── requirements.txt    ← Dependencias Python
├── README.md
└── templates/
    └── index.html      ← Interfaz web
```

---

## Solución de problemas

| Error                              | Solución                                              |
|------------------------------------|-------------------------------------------------------|
| `FFmpeg not found`                 | Instala FFmpeg y asegúrate de que esté en el PATH     |
| `Video no disponible`              | El video puede ser privado, con restricción de edad, o eliminado |
| `Connection refused`               | Verifica que `app.py` está corriendo en el puerto 5000 |
| `ModuleNotFoundError: yt_dlp`      | Ejecuta `pip install -r requirements.txt`             |

---

## Notas

- Solo para **uso personal** y contenido con licencia libre o de tu propiedad
- Respeta los derechos de autor
- La velocidad depende de tu conexión a internet y la duración del video
