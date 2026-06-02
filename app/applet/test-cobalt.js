import https from "https";
async function test() {
  const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const instances = [
    "https://cobalt.qewertyy.dev/api/json",
    "https://co.eepy.moe/api/json",
    "https://cobalt.tools/api/json",
    "https://api.cobalt.expert/api/json"
  ];
  for(let x of instances) {
     try {
       const o = await fetch(x, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           "Accept": "application/json"
         },
         body: JSON.stringify({ url, isAudioOnly: true })
       });
       console.log(x, o.status);
       console.log(await o.text());
     } catch(e) { console.log(x, e.message); }
  }
}
test();
