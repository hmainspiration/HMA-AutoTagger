async function test() {
  try {
    const res = await fetch("https://api.cobalt.tools", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
      },
      body: JSON.stringify({ url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", downloadMode: "audio" })
    });
    console.log("Status:", res.status);
    console.log(await res.text());
  } catch(e) {
    console.error(e);
  }
}
test();
