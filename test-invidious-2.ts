async function test() {
  try {
      const res = await fetch(`https://invidious.protokolla.fi/api/v1/videos/jNQXAC9IVRw`);
      console.log(res.status);
      const text = await res.text();
      console.log(text.substring(0, 200));
  } catch(e) {
      console.error("failed");
  }
}
test();
