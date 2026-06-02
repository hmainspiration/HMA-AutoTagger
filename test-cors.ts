async function test() {
  try {
    const res = await fetch("https://corsproxy.io/?https://api.cobalt.tools", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", downloadMode: "audio" })
    });
    console.log("Status:", res.status);
    console.log(await res.text());
  } catch (err) {
    console.error(err);
  }
}
test();
