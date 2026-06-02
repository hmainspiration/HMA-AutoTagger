import fs from "fs";
import https from "https";

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
         const audioFormat = data.formatStreams.find(f => f.type.startsWith("audio"));
         console.log(host, "SUCCESS!", audioFormat?.url.substring(0,60));
         return;
       }
     } catch(e) { console.log(host, "failed"); }
  }
}
testInvidious();
