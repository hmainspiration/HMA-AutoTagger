async function test() {
  try {
    const res = await fetch("https://invidious.protokolla.fi/api/v1/videos/jNQXAC9IVRw", {
      method: "GET",
      headers: {
        "Origin": "https://hma-autotagger.onrender.com"
      }
    });
    console.log(res.headers.get("access-control-allow-origin"));
  } catch (err) {}
}
test();
