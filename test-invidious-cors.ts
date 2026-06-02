async function test() {
  try {
    const res = await fetch("https://invidious.slipfox.xyz/api/v1/videos/jNQXAC9IVRw", {
      method: "GET",
      headers: {
        "Origin": "https://hma-autotagger.onrender.com"
      }
    });
    console.log("Status:", res.status);
    console.log("CORS header:", res.headers.get("access-control-allow-origin"));
    if (res.ok) {
        console.log("Success with CORS!");
    } else {
        console.log(await res.text());
    }
  } catch (e) {
    console.error("Failed:", e);
  }
}
test();
