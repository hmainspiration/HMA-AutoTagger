async function test() {
  try {
    const res = await fetch("https://es1.y2mate.tube/");
    console.log("X-Frame-Options:", res.headers.get("x-frame-options"));
    console.log("Content-Security-Policy:", res.headers.get("content-security-policy"));
  } catch(e) { }
}
test();
