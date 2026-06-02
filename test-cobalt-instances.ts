async function test() {
  const instances = [
    "https://co.wuk.sh",
    "https://cobalt.qewertyy.dev",
    "https://cobalt.api.timelessnesses.me",
    "https://api.cobalt.expert",
    "https://co.eepy.moe"
  ];
  for (const inst of instances) {
    try {
      const res = await fetch(`${inst}/api/json`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", isAudioOnly: true })
      });
      console.log(inst, res.status);
      if (res.ok) console.log(await res.json());
    } catch(e) {
      console.error(inst, "failed");
    }
  }
}
test();
