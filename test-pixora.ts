async function test() {
  try {
    const res = await fetch("https://inv.thepixora.com/api/v1/videos/jNQXAC9IVRw");
    console.log(res.status);
    if(res.ok) console.log("SUCCESS!");
  } catch(e) {}
}
test();
