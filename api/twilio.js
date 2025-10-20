import { handleIncomingSms, handleInactivityCheck } from '../src/controller/smsController.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Twilio-Signature, X-Twilio-Webhook-Event');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      if (req.url === '/api/twilio') {
        console.log('📱 Twilio webhook received:', {
          from: req.body.From,
          body: req.body.Body,
          timestamp: new Date().toISOString()
        });
        await handleIncomingSms(req, res);
      } else if (req.url === '/api/check-inactivity') {
        console.log('⏰ Inactivity check received:', {
          phone: req.body.phone,
          timestamp: new Date().toISOString()
        });
        await handleInactivityCheck(req, res);
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌ API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
