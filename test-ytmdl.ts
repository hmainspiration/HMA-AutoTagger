async function test() {
  try {
    const res = await fetch("https://ytmdl.deepanjan.tech/api/v1/download?url=https://www.youtube.com/watch?v=jNQXAC9IVRw", {
        headers: { "Origin": "https://hma-autotagger.onrender.com" }
    });
    console.log("Status:", res.status);
    console.log("CORS:", res.headers.get("access-control-allow-origin"));
  } catch(e) {}
}
test();
