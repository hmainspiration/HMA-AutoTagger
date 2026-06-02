async function test() {
  const instances = [
    "https://co.wuk.sh",
    "https://cobalt.qewertyy.dev",
    "https://cobalt.api.timelessnesses.me",
    "https://api.cobalt.expert"
  ];
  for (const inst of instances) {
    try {
      const res = await fetch(`${inst}/api/json`, {
        method: "OPTIONS",
        headers: {
            "Origin": "https://hma-autotagger.onrender.com",
            "Access-Control-Request-Method": "POST"
        }
      });
      console.log(inst, res.headers.get("access-control-allow-origin"));
    } catch(e) {
      console.error(inst, "failed");
    }
  }
}
test();
