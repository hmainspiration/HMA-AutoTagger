async function test() {
  const instances = [
    "https://pipedapi.tokhmi.xyz",
    "https://pipedapi.syncpundit.io",
    "https://piped-api.garudalinux.org"
  ];
  for (const inst of instances) {
      try {
        const res = await fetch(`${inst}/streams/jNQXAC9IVRw`, {
          method: "GET",
          headers: { "Origin": "https://hma-autotagger.onrender.com" }
        });
        console.log(inst, "CORS STATUS:", res.headers.get("access-control-allow-origin"));
        console.log("Status:", res.status);
        if (res.ok) {
           const data = await res.json();
           console.log("success, streams:", data.audioStreams?.length);
        } else {
           console.log("Error text");
        }
      } catch (err) {}
  }
}
test();
