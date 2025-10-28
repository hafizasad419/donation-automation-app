import { Router } from 'express';
import { handleIncomingSms, handleInactivityCheck } from '../controller/smsController.js';

const router = Router();

// Twilio webhook endpoint
router.post('/twilio', async (req, res) => {
  try {
    console.log('📱 Twilio webhook received:', {
      from: req.body.From,
      body: req.body.Body,
      timestamp: new Date().toISOString()
    });
    await handleIncomingSms(req, res);
  } catch (error) {
    console.error('❌ Twilio webhook error:', error);
    res.status(500).send("Internal server error");
  }
});

// MessageCollab webhook endpoint
router.post('/messagecollab', async (req, res) => {
  try {
    console.log('📱 MessageCollab webhook received:', {
      from: req.body.from,
      message: req.body.message,
      mId: req.body.mId,
      timestamp: new Date().toISOString()
    });
    await handleIncomingSms(req, res);
  } catch (error) {
    console.error('❌ MessageCollab webhook error:', error);
    res.status(500).send("Internal server error");
  }
});

// Inactivity check endpoint (called by QStash)
router.post('/check-inactivity', async (req, res) => {
  try {
    console.log('⏰ Inactivity check received:', {
      phone: req.body.phone,
      timestamp: new Date().toISOString()
    });
    await handleInactivityCheck(req, res);
  } catch (error) {
    console.error('❌ Inactivity check error:', error);
    res.status(500).send("Internal server error");
  }
});

export default router;
