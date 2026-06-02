async function test() {
  const instances = [
    "https://cobalt.kwiatekm.me",
    "https://cobalt.c-net.org",
    "https://api.cobalt.kwiatekm.me",
    "https://api.cobalt.c-net.org",
    "https://cobalt-api.kwiatekm.me",
    "https://co.kwiatekm.me"
  ];
  for (const inst of instances) {
      try {
          const res = await fetch(`${inst}/api/json`, {
            method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", isAudioOnly: true })
          });
          console.log(inst, res.status);
      } catch(e) { console.error(inst, "failed") }
  }
}
test();
