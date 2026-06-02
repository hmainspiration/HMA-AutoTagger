async function test() {
  const instances = [
    "https://invidious.weblibre.org",
    "https://invidious.lunar.icu",
    "https://invidious.privacydev.net",
    "https://invidious.jing.rocks",
    "https://invidious.nerdvpn.de",
    "https://invidious.tiekoetter.com"
  ];
  for (const inst of instances) {
      try {
          const res = await fetch(`${inst}/api/v1/videos/jNQXAC9IVRw`);
          console.log(inst, res.status);
          if (res.ok) {
              const data = await res.json();
              if (data.adaptiveFormats) console.log("Success with", inst);
          }
      } catch(e) { console.error(inst, "failed") }
  }
}
test();
