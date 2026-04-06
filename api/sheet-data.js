export default async function handler(req, res) {
  const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQrkP-pR1MYTrbDlfJzKMo5YBCmBfYJNByrWyhlnFiEZnHpkGWfE4IpRyBV1nlENxNHAjj6KccyiEZ8/pub?gid=1963976228&single=true&output=csv';
  
  try {
    const response = await fetch(GOOGLE_SHEET_URL);
    if (!response.ok) {
      throw new Error(`Google Sheet fetch failed: ${response.status}`);
    }
    const data = await response.text();
    
    // Set headers for CORS and content type
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    res.status(200).send(data);
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    res.status(500).json({ error: 'Gagal mengambil data dari Google Sheet', details: error.message });
  }
}
