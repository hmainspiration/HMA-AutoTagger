async function test() {
  try {
    const res = await fetch("https://api.invidious.io/instances.json?sort_by=health");
    const data = await res.json();
    const active = data.filter(i => i[1].type === "https" && i[1].api === true);
    for (let i = 0; i < Math.min(10, active.length); i++) {
        console.log(active[i][1].uri);
    }
  } catch (err) {}
}
test();
