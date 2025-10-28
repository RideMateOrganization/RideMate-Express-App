import express from 'express';

const router = express.Router();

// Simple endpoint - just log to console
router.post('/log', (req, res) => {
  const { sessionId, timestamp, message, data } = req.body;

  console.log('=================================');
  console.log(`[${timestamp}] [Session: ${sessionId}]`);
  console.log(`MESSAGE: ${message}`);
  if (data) {
    console.log('DATA:', JSON.stringify(data, null, 2));
  }
  console.log('=================================');

  res.json({ success: true });
});

export default router;
