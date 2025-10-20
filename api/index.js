export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    message: 'Donation Automation App API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      twilio: '/api/twilio',
      'check-inactivity': '/api/check-inactivity'
    }
  });
}
