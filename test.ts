async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/sheet-data');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text.substring(0, 100));
  } catch (e) {
    console.error(e);
  }
}
test();
