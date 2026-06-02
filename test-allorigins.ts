async function test() {
  try {
    const targetUrl = "https://invidious.protokolla.fi/api/v1/videos/jNQXAC9IVRw";
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
    console.log("CORS:", res.headers.get("access-control-allow-origin"));
    console.log("Status:", res.status);
    if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.contents);
        console.log("Found streams:", !!parsed.adaptiveFormats);
    } else {
        console.log(await res.text());
    }
  } catch(e) { console.error(e) }
}
test();
