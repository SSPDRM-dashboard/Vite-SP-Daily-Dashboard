import http from 'http';

http.get('http://localhost:3000/api/sheet-data', (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', (d) => process.stdout.write(d));
}).on('error', (e) => {
  console.error(e);
});
