/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { Search, Download, Music, AlertCircle, Loader2 } from "lucide-react";

const COBALT_INSTANCES = [
  "https://co.wuk.sh",
  "https://cobalt.qewertyy.dev",
  "https://cobalt.api.timelessnesses.me",
  "https://api.cobalt.expert",
  "https://api.cobalt.xn--9zw.com",
  "https://co.eepy.moe",
  "https://api.cobalt.tools"
];

const fetchCobaltDownloadUrl = async (videoUrl: string): Promise<string> => {
  const videoIdMatch = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;

  for (const instance of COBALT_INSTANCES) {
    try {
      // 1. Try V10 format
      const res = await fetch(instance, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: videoUrl, downloadMode: "audio" })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.url) {
          return data.url;
        }
      } else if (res.status === 404 || res.status === 405) {
        // Try V7 format (/api/json)
        const v7Res = await fetch(`${instance}/api/json`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url: videoUrl, isAudioOnly: true })
        });
        if (v7Res.ok) {
          const v7Data = await v7Res.json();
          if (v7Data && v7Data.url) {
            return v7Data.url;
          }
        }
      }
    } catch (e: any) {
      console.warn(`Cobalt instance ${instance} failed:`, e.message);
    }
  }

  // Fallback to Invidious API
  if (videoId) {
    const invidiousInstances = [
      "https://invidious.slipfox.xyz",
      "https://inv.tux.pizza",
      "https://invidious.protokolla.fi",
      "https://iv.melmac.space"
    ];

    for (const host of invidiousInstances) {
      try {
        const invRes = await fetch(`${host}/api/v1/videos/${videoId}`);
        if (invRes.ok) {
          const data = await invRes.json();
          const audioFormats = data.adaptiveFormats 
            ? data.adaptiveFormats.filter((f: any) => f.type.startsWith("audio")) 
            : [];
          if (audioFormats.length > 0) {
            return audioFormats[0].url;
          }
        }
      } catch (e) {
        console.warn(`Invidious instance ${host} failed:`, e);
      }
    }
  }

  throw new Error("No se pudo obtener un enlace de descarga directa de ninguno de los servidores gratuitos (Cobalt/Invidious). Por favor, intenta de nuevo o con un enlace diferente.");
};

export default function App() {
  const [url, setUrl] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingProcess, setLoadingProcess] = useState(false);
  const [processStage, setProcessStage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [metadata, setMetadata] = useState<{
    title: string;
    artist: string;
    albumArtist: string;
    album: string;
    year: string;
    genre: string;
    trackNumber: string;
    coverUrl: string;
  } | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setError(null);
    setLoadingSearch(true);
    setMetadata(null);

    try {
      const res = await fetch(`/api/search?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch metadata");
      }
      
      const data = await res.json();
      setMetadata({
        title: data.title || "",
        artist: data.artist || "",
        albumArtist: data.albumArtist || data.artist || "",
        album: data.album || "",
        year: data.year || "",
        genre: data.genre || "",
        trackNumber: data.trackNumber || "1",
        coverUrl: data.coverUrl || "",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleProcess = async () => {
    if (!metadata || !url) return;

    setError(null);
    setLoadingProcess(true);
    setProcessStage("Buscando enlace de descarga directa...");

    try {
      // 1. Obtener la URL de descarga directa de audio desde el Frontend
      const directAudioUrl = await fetchCobaltDownloadUrl(url);
      
      // 2. Descargar el archivo de audio directamente en el navegador del cliente (IP residencial)
      setProcessStage("Descargando archivo de audio desde YouTube...");
      const audioReq = await fetch(directAudioUrl);
      if (!audioReq.ok) {
        throw new Error("No se pudo descargar el archivo de audio base del servidor de origen.");
      }
      const audioBlob = await audioReq.blob();

      // 3. Crear el FormData con el Blob y los metadatos de ID3
      setProcessStage("Inyectando carátula y etiquetas ID3 en el servidor...");
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.mp3");
      formData.append("title", metadata.title || "");
      formData.append("artist", metadata.artist || "");
      formData.append("albumArtist", metadata.albumArtist || "");
      formData.append("album", metadata.album || "");
      formData.append("year", metadata.year || "");
      formData.append("genre", metadata.genre || "");
      formData.append("trackNumber", metadata.trackNumber || "1");
      formData.append("coverUrl", metadata.coverUrl || "");

      // 4. Enviar el Form con el audio y metadatos a nuestro servidor para que use node-id3
      const res = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
           const errorData = await res.json();
           throw new Error(errorData.error || "Fallo al procesar las etiquetas del audio.");
        } else {
           throw new Error(`El servidor de Render devolvió el error: ${res.status}`);
        }
      }

      // 5. Descargar el MP3 etiquetado final
      setProcessStage("¡Listo! Iniciando descarga en tu dispositivo...");
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const safeTitle = (metadata.title || "download").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `${safeTitle}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error inesperado durante el procesamiento.");
    } finally {
      setLoadingProcess(false);
      setProcessStage("");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-purple-500/30">
      <main className="max-w-3xl mx-auto px-6 py-12 flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">AutoTagger</h1>
          <p className="text-neutral-400 text-sm max-w-sm">
            Descarga audios de YouTube y etiquétalos automáticamente con metadatos reales e imágenes de alta calidad.
          </p>
        </header>

        {/* Input form */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pega el link de YouTube aquí..."
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
            required
          />
          <button
            type="submit"
            disabled={loadingSearch || !url}
            className="flex items-center justify-center gap-2 bg-white text-black font-medium px-6 py-3 rounded-xl hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white/50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loadingSearch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">{error}</p>
          </div>
        )}

        {/* Metadata Editor & Preview */}
        {metadata && (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Cover Art */}
            <div className="flex flex-col gap-4 w-full md:w-64 shrink-0">
               <div className="aspect-square bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700/50 relative group shadow-2xl">
                 {metadata.coverUrl ? (
                    <img 
                      src={metadata.coverUrl} 
                      alt="Cover Art" 
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500">
                      <Music className="w-12 h-12 opacity-50" />
                    </div>
                 )}
               </div>
            </div>

            {/* Editable Fields */}
            <div className="flex-1 flex flex-col gap-5">
              <h3 className="text-lg font-medium text-white mb-1">Editar Metadatos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Título</label>
                  <input
                    type="text"
                    value={metadata.title}
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Artista</label>
                  <input
                    type="text"
                    value={metadata.artist}
                    onChange={(e) => setMetadata({ ...metadata, artist: e.target.value })}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Intérprete del Álbum</label>
                  <input
                    type="text"
                    value={metadata.albumArtist}
                    onChange={(e) => setMetadata({ ...metadata, albumArtist: e.target.value })}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Álbum</label>
                  <input
                    type="text"
                    value={metadata.album}
                    onChange={(e) => setMetadata({ ...metadata, album: e.target.value })}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 text-left sm:grid-cols-3 gap-4 md:col-span-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Año</label>
                    <input
                      type="text"
                      value={metadata.year}
                      onChange={(e) => setMetadata({ ...metadata, year: e.target.value })}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Género</label>
                    <input
                      type="text"
                      value={metadata.genre}
                      onChange={(e) => setMetadata({ ...metadata, genre: e.target.value })}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Pista</label>
                    <input
                      type="text"
                      value={metadata.trackNumber}
                      onChange={(e) => setMetadata({ ...metadata, trackNumber: e.target.value })}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-800/50">
                <button
                  onClick={handleProcess}
                  disabled={loadingProcess}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium px-6 py-3.5 rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-500/50 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-purple-500/10"
                >
                  {loadingProcess ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{processStage || "Procesando..."}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Procesar y Descargar MP3
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
