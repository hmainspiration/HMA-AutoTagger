import fs from "fs";

async function findInstance() {
  try {
    const res = await fetch("https://raw.githubusercontent.com/imputnet/cobalt/current/docs/instances.json");
    if (!res.ok) {
       console.log("no instances.json");
       return;
    }
    const text = await res.json();
    console.log(JSON.stringify(text));
  } catch (e) {
    console.log(e);
  }
}
findInstance();
