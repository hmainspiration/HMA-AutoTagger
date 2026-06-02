async function test() {
  try {
    const res = await fetch("https://api.vevioz.com/api/button/mp3/jNQXAC9IVRw");
    console.log(res.status);
  } catch(e) {}
}
test();
