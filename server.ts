import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import NodeID3 from "node-id3";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

  app.post("/api/process", async (req, res) => {
    try {
      const { url, title, artist, albumArtist, album, year, genre, trackNumber, coverUrl } = req.body;

      if (!url) {
        return res.status(400).json({ error: "YouTube URL is required" });
      }

      console.log("Requesting Cobalt for audio link...", url);
      
      const instances = [
        "https://api.cobalt.tools/", // Official V10 (Requires JWT but might work with browser headers)
        "https://co.wuk.sh/",
        "https://cobalt.qewertyy.dev/",
        "https://cobalt.api.timelessnesses.me/",
        "https://api.cobalt.expert/",
        "https://api.cobalt.xn--9zw.com/",
        "https://co.eepy.moe/"
      ];

      let downloadUrl = null;
      let lastError = null;

      // Extract Video ID to fallback to alternative methods if needed
      const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;

      for (const instance of instances) {
        try {
          // Attempt V10 format
          const cobaltRes = await fetch(instance, {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
              // Some instances block basic fetches, emulate user agent
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            body: JSON.stringify({ url, downloadMode: "audio" })
          });

          if (cobaltRes.ok) {
            const cobaltData = await cobaltRes.json();
            if (cobaltData && cobaltData.url) {
              downloadUrl = cobaltData.url;
              break; // Success!
            }
          } else if (cobaltRes.status === 404) {
             // Maybe it's a V7 instance? Let's try /api/json
             const v7Res = await fetch(`${instance}api/json`, {
                method: "POST",
                headers: {
                  "Accept": "application/json",
                  "Content-Type": "application/json",
                  "User-Agent": "Mozilla/5.0"
                },
                body: JSON.stringify({ url, isAudioOnly: true })
             });
             if (v7Res.ok) {
                 const v7Data = await v7Res.json();
                 if (v7Data && v7Data.url) {
                     downloadUrl = v7Data.url;
                     break;
                 }
             }
          }
        } catch (err: any) {
           lastError = err.message;
        }
      }

      if (!downloadUrl) {
         // Final fallback if all Cobalt instances fail or demand JWT
         // Invidious API returns Googlevideo URLs directly. Usually safe for audio.
         if (videoId) {
            console.log("Cobalt instances failed, falling back to Invidious proxy...");
            try {
               const invRes = await fetch(`https://invidious.slipfox.xyz/api/v1/videos/${videoId}`);
               if (invRes.ok) {
                  const data = await invRes.json();
                  const audioFormats = data.adaptiveFormats 
                     ? data.adaptiveFormats.filter((f: any) => f.type.startsWith("audio")) 
                     : [];
                  if (audioFormats.length > 0) {
                     downloadUrl = audioFormats[0].url;
                  }
               }
            } catch (e: any) {
               console.error("Invidious fallback failed", e);
            }
         }
      }

      if (!downloadUrl) {
        return res.status(500).json({ 
           error: "Todos los servidores de descarga gratuitos (Cobalt/Invidious) fallaron o requieren autenticación actualmente. Consulta GitHub de Cobalt para alojar tu propia instancia o intenta más tarde. Útimo error: " + (lastError || "No URL found") 
        });
      }

      console.log("Downloading audio from...", downloadUrl);
      const audioReq = await fetch(downloadUrl);
      if (!audioReq.ok) {
        return res.status(500).json({ error: "Failed to download audio from Cobalt link" });
      }
      const audioArrayBuffer = await audioReq.arrayBuffer();
      const audioBuffer = Buffer.from(audioArrayBuffer);

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
