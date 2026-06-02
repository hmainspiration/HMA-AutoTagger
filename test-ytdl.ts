import ytdl from "@distube/ytdl-core";
async function test() {
  try {
    console.log("Starting ytdl test...");
    const url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"; // Me at the zoo
    const info = await ytdl.getInfo(url);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    console.log("Successfully fetched formats: ", audioFormats.length);
  } catch (err) {
    console.error("Test failed:", err);
  }
}
test();
