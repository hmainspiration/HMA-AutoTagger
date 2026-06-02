import youtubedl from 'youtube-dl-exec';
async function test() {
  try {
    const url = "https://www.youtube.com/watch?v=jNQXAC9IVRw";
    console.log("Downloading audio...");
    const output = await youtubedl(url, {
      dumpJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    });
    console.log("Success! Found formats:", output.formats?.length);
  } catch(e) {
    console.error("Failed:", e);
  }
}
test();
