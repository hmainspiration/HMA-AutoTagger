/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useRef, useEffect, Component, ReactNode, ErrorInfo } from "react";
import { Search, Download, Music, AlertCircle, Loader2, Upload } from "lucide-react";

const safeStorage = {
  get: (key: string) => { 
    try { return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null; } catch { return null; } 
  },
  set: (key: string, val: string) => { 
    try { if (typeof window !== 'undefined') window.localStorage.setItem(key, val); } catch {} 
  },
  remove: (key: string) => { 
    try { if (typeof window !== 'undefined') window.localStorage.removeItem(key); } catch {} 
  }
};

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Oops, la aplicación falló.</h2>
          <p className="text-sm text-neutral-400 max-w-md">El navegador bloqueó un script (probablemente modo incógnito o webview restringe almacenamiento). Reinicia la app o intenta desde el Chrome normal.</p>
          <pre className="mt-4 p-4 bg-neutral-900 border border-neutral-800 rounded text-xs text-red-400 max-w-full overflow-x-auto">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
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

  const [activeTab, setActiveTab] = useState<"download" | "tag">("download");
  const [manualFile, setManualFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [rememberMetadata, setRememberMetadata] = useState(false);

  useEffect(() => {
    setRememberMetadata(safeStorage.get("rememberMetadata") === "true");
  }, []);

  const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;
  const y2mateUrl = videoId ? `https://es1.y2mate.tube/convert/?videoId=${videoId}` : `https://es1.y2mate.tube/`;

  // Remove direct fetch logic since it's blocked by YouTube
  const handleSearch = async (e: FormEvent) => {

    e.preventDefault();
    if (!url.trim()) return;
    
    setError(null);
    setLoadingSearch(true);
    setMetadata(null);
    setManualFile(null);

    try {
      const res = await fetch(`/api/search?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch metadata");
      }
      
      const data = await res.json();
      let finalAlbumArtist = data.albumArtist || data.artist || "";
      let finalAlbum = data.album || "";
      let finalYear = data.year || "";
      let finalGenre = data.genre || "";

      if (safeStorage.get("rememberMetadata") === "true") {
        const memAlbumArtist = safeStorage.get("memAlbumArtist");
        if (memAlbumArtist !== null) finalAlbumArtist = memAlbumArtist;
        
        const memAlbum = safeStorage.get("memAlbum");
        if (memAlbum !== null) finalAlbum = memAlbum;

        const memYear = safeStorage.get("memYear");
        if (memYear !== null) finalYear = memYear;

        const memGenre = safeStorage.get("memGenre");
        if (memGenre !== null) finalGenre = memGenre;
      }

      setMetadata({
        title: data.title || "",
        artist: data.artist || "",
        albumArtist: finalAlbumArtist,
        album: finalAlbum,
        year: finalYear,
        genre: finalGenre,
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
    if (!metadata || !url || !manualFile) {
      setError("Por favor, asegúrate de haber subido el archivo MP3 manualmente antes de procesar.");
      return;
    }

    setError(null);
    setLoadingProcess(true);

    try {
      setProcessStage("Inyectando carátula y etiquetas ID3 en el servidor...");
      const formData = new FormData();
      formData.append("audio", manualFile, manualFile.name || "audio.mp3");
      formData.append("title", metadata.title || "");
      formData.append("artist", metadata.artist || "");
      formData.append("albumArtist", metadata.albumArtist || "");
      formData.append("album", metadata.album || "");
      formData.append("year", metadata.year || "");
      formData.append("genre", metadata.genre || "");
      formData.append("trackNumber", metadata.trackNumber || "1");
      formData.append("coverUrl", metadata.coverUrl || "");

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
           throw new Error(`El servidor devolvió el error: ${res.status}`);
        }
      }

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
      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-6 sm:gap-8">
        
        {/* Header */}
        <header className="flex flex-col items-center text-center gap-3 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Music className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">AutoTagger V.5</h1>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-sm px-4">
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

        {/* Metadata & Process Area */}
        {metadata && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Steps Navigation */}
            <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-1 shadow-lg">
               <button 
                 onClick={() => setActiveTab("download")}
                 className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "download" ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}
               >
                 Paso 1: Descargar MP3 Gratis
               </button>
               <button
                 onClick={() => setActiveTab("tag")} 
                 className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "tag" ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}
               >
                 Paso 2: Subir y Etiquetar MP3
               </button>
            </div>

            {activeTab === "download" && (
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
                <p className="text-xs sm:text-sm text-neutral-300">
                  Descarga el audio base gratuitamente desde este integrador externo, y luego dirígete a la pestaña <b>Paso 2</b> para inyectar los metadatos.
                </p>
                <div className="w-full h-[400px] sm:h-[600px] border border-neutral-800 rounded-xl overflow-hidden bg-white">
                  <iframe 
                    src={y2mateUrl} 
                    className="w-full h-full border-0" 
                    title="Y2mate Download Pannel"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
                  />
                </div>
              </div>
            )}

            {activeTab === "tag" && (
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row gap-6 sm:gap-8">
                {/* Cover Art */}
                <div className="flex flex-col gap-4 w-full md:w-56 lg:w-64 shrink-0 mx-auto max-w-[240px] md:max-w-none">
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
                          <Music className="w-10 h-10 sm:w-12 sm:h-12 opacity-50" />
                        </div>
                     )}
                   </div>
                </div>

                {/* Editable Fields */}
                <div className="flex-1 flex flex-col gap-4 sm:gap-5">
                  <h3 className="text-base sm:text-lg font-medium text-white mb-0 sm:mb-1">Revisar e Inyectar Metadatos</h3>
                  
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
                        onChange={(e) => {
                          setMetadata({ ...metadata, albumArtist: e.target.value });
                          if (rememberMetadata) safeStorage.set("memAlbumArtist", e.target.value);
                        }}
                        className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Álbum</label>
                      <input
                        type="text"
                        value={metadata.album}
                        onChange={(e) => {
                          setMetadata({ ...metadata, album: e.target.value });
                          if (rememberMetadata) safeStorage.set("memAlbum", e.target.value);
                        }}
                        className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 text-left sm:grid-cols-3 gap-4 md:col-span-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Año</label>
                        <input
                          type="text"
                          value={metadata.year}
                          onChange={(e) => {
                            setMetadata({ ...metadata, year: e.target.value });
                            if (rememberMetadata) safeStorage.set("memYear", e.target.value);
                          }}
                          className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Género</label>
                        <input
                          type="text"
                          value={metadata.genre}
                          onChange={(e) => {
                            setMetadata({ ...metadata, genre: e.target.value });
                            if (rememberMetadata) safeStorage.set("memGenre", e.target.value);
                          }}
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
                    
                    <div className="flex items-center gap-2 mt-1 md:col-span-2 bg-neutral-900 border border-neutral-800 p-3 rounded-xl cursor-pointer hover:bg-neutral-800/50 transition-colors" onClick={() => {
                        const newVal = !rememberMetadata;
                        setRememberMetadata(newVal);
                        safeStorage.set("rememberMetadata", String(newVal));
                        if (newVal) {
                          safeStorage.set("memAlbumArtist", metadata.albumArtist);
                          safeStorage.set("memAlbum", metadata.album);
                          safeStorage.set("memYear", metadata.year);
                          safeStorage.set("memGenre", metadata.genre);
                        } else {
                          safeStorage.remove("memAlbumArtist");
                          safeStorage.remove("memAlbum");
                          safeStorage.remove("memYear");
                          safeStorage.remove("memGenre");
                        }
                    }}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${rememberMetadata ? 'bg-purple-500 border-purple-500' : 'bg-neutral-950 border-neutral-700'}`}>
                        {rememberMetadata && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-xs sm:text-sm text-neutral-300 select-none">Recordar Álbum, Intérprete, Año y Género para la próxima.</span>
                    </div>
                  </div>

                  {/* Subir MP3 y Procesar */}
                  <div className="mt-4 pt-4 border-t border-neutral-800/50">
                    <input 
                      type="file" 
                      accept="audio/mp3,audio/*" 
                      ref={fileInputRef}
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setManualFile(e.target.files[0]);
                        }
                      }}
                    />
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full mb-3 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-purple-500/30 hover:border-purple-400 bg-purple-500/5 text-purple-200 font-medium px-4 py-6 sm:py-8 rounded-xl transition-all"
                    >
                      <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 sm:mb-1" />
                      <span className="text-base sm:text-lg text-center">{manualFile ? `Seleccionado: ${manualFile.name}` : "1. Haz click aquí para subir el MP3"}</span>
                    </button>

                    <button
                      onClick={handleProcess}
                      disabled={loadingProcess || !manualFile}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium px-4 py-3 sm:px-6 sm:py-4 rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-500/50 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-purple-500/10 text-base sm:text-lg"
                    >
                      {loadingProcess ? (
                        <>
                          <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                          <span className="text-center">{processStage || "Procesando..."}</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5 sm:w-6 sm:h-6" />
                          2. Procesar e Inyectar Metadatos
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
