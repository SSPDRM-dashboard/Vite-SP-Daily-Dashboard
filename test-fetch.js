const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQrkP-pR1MYTrbDlfJzKMo5YBCmBfYJNByrWyhlnFiEZnHpkGWfE4IpRyBV1nlENxNHAjj6KccyiEZ8/pub?gid=1963976228&single=true&output=csv';

async function testFetch() {
  try {
    const response = await fetch(GOOGLE_SHEET_URL);
    console.log("Status:", response.status);
    console.log("OK:", response.ok);
    const text = await response.text();
    console.log("Text length:", text.length);
    console.log("Snippet:", text.substring(0, 100));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testFetch();
