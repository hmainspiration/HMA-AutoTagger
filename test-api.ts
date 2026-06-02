async function test() {
  try {
    const res = await fetch("https://y2meta.tube/api/v1/init");
    console.log(res.status);
    console.log(await res.text());
  } catch (err) { }
}
test();
