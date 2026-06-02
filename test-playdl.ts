import play from 'play-dl';
async function test() {
  try {
    const stream = await play.stream("https://www.youtube.com/watch?v=jNQXAC9IVRw");
    console.log("Success! Stream available.");
  } catch(e) {
    console.error("Failed:", e.message);
  }
}
test();
