import fs from "fs";

async function testInvidious() {
  const instances = [
    "https://invidious.slipfox.xyz",
    "https://inv.tux.pizza",
    "https://invidious.protokolla.fi",
    "https://iv.melmac.space"
  ];
  const videoId = "dQw4w9WgXcQ";
  
  for(let host of instances) {
     try {
       const res = await fetch(`${host}/api/v1/videos/${videoId}`);
       if(res.ok) {
         const data = await res.json();
         const audioFormats = data.formatStreams ? data.formatStreams.filter(f => f.type.startsWith("audio")) : [];
         // Wait, invidious has adaptiveFormats for audio usually.
         const adaptive = data.adaptiveFormats ? data.adaptiveFormats.filter(f => f.type.startsWith("audio")) : [];
         const allAudio = [...audioFormats, ...adaptive];
         console.log(host, "SUCCESS!", allAudio.length > 0 ? allAudio[0].url.substring(0,60) : "no audio");
         return;
       }
     } catch(e) { console.log(host, "failed"); }
  }
}
testInvidious();
