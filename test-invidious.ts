async function test() {
  const instances = [
    "https://invidious.slipfox.xyz",
    "https://inv.tux.pizza",
    "https://invidious.protokolla.fi",
    "https://iv.melmac.space"
  ];
  for (const host of instances) {
    try {
      const res = await fetch(`${host}/api/v1/videos/jNQXAC9IVRw`);
      console.log(host, res.status);
      if (res.ok) {
         const data = await res.json();
         console.log(host, "SUCCESS! found formats");
         return;
      }
    } catch(e) {
      console.error(host, "failed");
    }
  }
}
test();
