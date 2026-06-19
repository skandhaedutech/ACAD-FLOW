const https = require('https');
const options = {
  hostname: 'skandaedutech-acadflowbackend.hf.space',
  port: 443,
  path: '/api/sync-sheet',
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'POST'
  }
};
const req = https.request(options, res => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
});
req.on('error', error => {
  console.error(error);
});
req.end();
