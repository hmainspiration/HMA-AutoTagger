import ytdl from "youtube-dl-exec"; ytdl("https://www.youtube.com/watch?v=dQw4w9WgXcQ", { dumpJson: true }).then(output => console.log(output.title)).catch(e => console.error("Error:", e.message));
