import https from "https";
async function testInvidious() {
  const videoId = "dQw4w9WgXcQ";
  const url = `https://invidious.slipfox.xyz/api/v1/videos/${videoId}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Invidious returned: ", res.status);
    if(data.formatStreams) {
      console.log(data.formatStreams[0].url);
    }
  } catch(e) { console.error(e); }
}
testInvidious();
