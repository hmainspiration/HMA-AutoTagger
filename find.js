import fs from "fs";

async function findInstance() {
  try {
    const res = await fetch("https://raw.githubusercontent.com/imputnet/cobalt/current/docs/instances.json");
    const text = await res.text();
    console.log(text.substring(0, 500));
  } catch (e) {
    console.log(e);
  }
}
findInstance();
