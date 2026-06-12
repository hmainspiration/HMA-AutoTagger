import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import NodeID3 from "node-id3";
import multer from "multer";
import ytdl from "youtube-dl-exec";
import ffmpeg from "ffmpeg-static";
import fs from "fs";
import { randomUUID } from "crypto";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/yt-info", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "Ingresa una URL de YouTube" });
      
      const info = await ytdl(url, { dumpJson: true }) as any;
      return res.json({
        title: info.title || "Sin título",
        thumbnail: info.thumbnail || "",
        duration: info.duration ? new Date(info.duration * 1000).toISOString().substring(14, 19) : "—",
        uploader: info.uploader || "Desconocido",
        view_count: info.view_count ? info.view_count.toLocaleString("es-ES") : "—"
      });
    } catch (e: any) {
      console.error(e);
      return res.status(400).json({ error: "No se pudo obtener la info o URL inválida" });
    }
  });

  app.post("/api/yt-download", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL requerida" });
      
      const id = randomUUID();
      const tmpFile = path.join(process.cwd(), `tmp_${id}.mp3`);
      
      await ytdl(url, {
        extractAudio: true,
        audioFormat: "mp3",
        audioQuality: 128,
        output: tmpFile,
        ffmpegLocation: ffmpeg || undefined
      });
      
      if (!fs.existsSync(tmpFile)) {
        return res.status(500).json({ error: "Fallo al generar el archivo MP3" });
      }
      
      res.download(tmpFile, "audio.mp3", (err) => {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      });
    } catch (e: any) {
      console.error(e);
      return res.status(400).json({ error: "Fallo al descargar el video" });
    }
  });

  // API constraints strictly followed from prompt
  app.get("/api/search", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Missing YouTube URL" });
      }

      // 1. Get Title from YouTube OEmbed
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (!oembedRes.ok) {
        return res.status(404).json({ error: "Could not fetch YouTube video title. Is the URL valid?" });
      }
      const oembedData = await oembedRes.json();
      const title = oembedData.title || "";

      // We attempt a basic extraction or pass the whole title
      const cleanTitle = title.replace(/\\(official.*?\\)|\\[.*?\\]|\\{.*?\\}|official|video|audio/gi, "").trim();

      // 2. Query iTunes API
      const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanTitle)}&entity=song&limit=1`);
      
      if (!itunesRes.ok) {
        // Fallback info if iTunes fails
        return res.json({
          title,
          artist: "Unknown Artist",
          album: "Unknown Album",
          year: new Date().getFullYear().toString(),
          coverUrl: ""
        });
      }

      const itunesData = await itunesRes.json();
      
      if (itunesData.results && itunesData.results.length > 0) {
        const track = itunesData.results[0];
        return res.json({
          title: track.trackName || title,
          artist: track.artistName || "Unknown Artist",
          albumArtist: track.artistName || "Unknown Artist",
          album: track.collectionName || "Unknown Album",
          year: track.releaseDate ? track.releaseDate.substring(0, 4) : new Date().getFullYear().toString(),
          genre: track.primaryGenreName || "Unknown Genre",
          trackNumber: track.trackNumber ? track.trackNumber.toString() : "1",
          coverUrl: track.artworkUrl100 ? track.artworkUrl100.replace("100x100bb.", "600x600bb.") : ""
        });
      } else {
        return res.json({
          title,
          artist: "Unknown Artist",
          albumArtist: "Unknown Artist",
          album: "Unknown Album",
          year: new Date().getFullYear().toString(),
          genre: "Unknown Genre",
          trackNumber: "1",
          coverUrl: ""
        });
      }
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/process", upload.single("audio"), async (req, res) => {
    try {
      const { title, artist, albumArtist, album, year, genre, trackNumber, coverUrl } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: "No se recibió ningún archivo de audio" });
      }

      const audioBuffer = req.file.buffer;
      console.log("Recibido archivo de audio de longitud:", audioBuffer.length);

      let imageBuffer: Buffer | undefined;
      if (coverUrl) {
        try {
          console.log("Downloading cover art from...", coverUrl);
          const imageReq = await fetch(coverUrl);
          if (imageReq.ok) {
            const imageArrayBuffer = await imageReq.arrayBuffer();
            imageBuffer = Buffer.from(imageArrayBuffer);
          }
        } catch (e) {
          console.warn("Could not download cover art", e);
        }
      }

      // node-id3 tagging
      const tags: NodeID3.Tags = {
        title: title || "",
        artist: artist || "",
        performerInfo: albumArtist || artist || "",
        album: album || "",
        year: year || "",
        genre: genre || "",
        trackNumber: trackNumber || "1",
      };

      if (imageBuffer) {
        tags.image = {
          mime: "image/jpeg",
          type: {
            id: 3,
            name: "front cover"
          },
          description: "Cover",
          imageBuffer: imageBuffer
        };
      }

      console.log("Writing ID3 tags...");
      const finalMp3Buffer = NodeID3.write(tags, audioBuffer);
      if(!finalMp3Buffer) {
         return res.status(500).json({ error: "Failed to write ID3 tags to audio buffer." });
      }

      // Send the file
      const safeTitle = (title || "download").replace(/[^a-zA-Z0-9_-]/g, "_");
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
      res.setHeader('Content-Length', finalMp3Buffer.length);
      return res.send(finalMp3Buffer);

    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message || "Unknown error during processing" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
