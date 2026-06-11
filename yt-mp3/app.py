"""
YouTube → MP3 Downloader
Flask backend con yt-dlp + FFmpeg
"""
from flask import Flask, render_template, request, send_file, jsonify, after_this_request
import yt_dlp
import os
import re
import shutil
import tempfile
from pathlib import Path

app = Flask(__name__)


# ──────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────

def clean_filename(name: str) -> str:
    """Elimina caracteres no válidos para nombres de archivo."""
    name = re.sub(r'[\\/*?:"<>|]', '_', name)
    return name.strip('. ')[:180] or 'audio'


def fmt_duration(sec) -> str:
    """Convierte segundos a formato legible (mm:ss o hh:mm:ss)."""
    if not sec:
        return "—"
    m, s = divmod(int(sec), 60)
    h, m = divmod(m, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


# ──────────────────────────────────────────────
#  Rutas
# ──────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/info', methods=['POST'])
def get_info():
    """Devuelve metadatos del video sin descargarlo."""
    data = request.get_json(silent=True) or {}
    url = (data.get('url') or '').strip()

    if not url:
        return jsonify(error='Ingresa una URL de YouTube'), 400

    try:
        opts = {
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)

        vc = info.get('view_count')
        return jsonify(
            title=info.get('title', 'Sin título'),
            thumbnail=info.get('thumbnail', ''),
            duration=fmt_duration(info.get('duration')),
            uploader=info.get('uploader', 'Desconocido'),
            view_count=f"{vc:,}".replace(',', '.') if vc else '—',
        )

    except yt_dlp.utils.DownloadError as e:
        msg = str(e)
        if 'Private' in msg or 'private' in msg:
            return jsonify(error='Video privado o no disponible'), 400
        if 'age' in msg.lower():
            return jsonify(error='Video con restricción de edad'), 400
        return jsonify(error='URL inválida o video no disponible'), 400
    except Exception as e:
        return jsonify(error=str(e)), 500


@app.route('/download', methods=['POST'])
def download():
    """Descarga el audio y lo convierte a MP3 a 128 kbps."""
    data = request.get_json(silent=True) or {}
    url = (data.get('url') or '').strip()

    if not url:
        return jsonify(error='URL requerida'), 400

    tmp = tempfile.mkdtemp()
    try:
        opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '128',
            }],
            'outtmpl': os.path.join(tmp, '%(title)s.%(ext)s'),
            'noplaylist': True,
            'quiet': True,
            'no_warnings': True,
            'concurrent_fragment_downloads': 4,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = clean_filename(info.get('title', 'audio'))

        # Buscar el MP3 generado
        mp3 = next(Path(tmp).glob('*.mp3'), None)
        if not mp3:
            shutil.rmtree(tmp, ignore_errors=True)
            return jsonify(
                error='No se generó el MP3. ¿Está FFmpeg instalado correctamente?'
            ), 500

        # Limpiar directorio temporal después de enviar
        @after_this_request
        def cleanup(response):
            shutil.rmtree(tmp, ignore_errors=True)
            return response

        return send_file(
            str(mp3),
            mimetype='audio/mpeg',
            as_attachment=True,
            download_name=f'{title}.mp3',
        )

    except yt_dlp.utils.DownloadError:
        shutil.rmtree(tmp, ignore_errors=True)
        return jsonify(error='No se pudo descargar. Verifica la URL e intenta de nuevo'), 400
    except Exception as e:
        shutil.rmtree(tmp, ignore_errors=True)
        return jsonify(error=str(e)), 500


# ──────────────────────────────────────────────
#  Entry point
# ──────────────────────────────────────────────

if __name__ == '__main__':
    print('\n🎵  YouTube → MP3  |  Abre  http://localhost:5000\n')
    app.run(debug=True, port=5000)
