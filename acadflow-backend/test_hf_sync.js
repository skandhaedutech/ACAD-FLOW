const https = require('https');
const options = {
  hostname: 'skandaedutech-acadflowbackend.hf.space',
  port: 443,
  path: '/api/sync-sheet',
  method: 'POST'
};
const req = https.request(options, res => {
  console.log('Status:', res.statusCode);
  res.on('data', d => {
    process.stdout.write(d);
  });
});
req.on('error', error => {
  console.error(error);
});
req.end();
