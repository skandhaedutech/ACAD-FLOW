const express = require('express');
const { requireAuth, getTenantDb } = require('./auth');

const router = express.Router();

// GET /api/whatsapp/templates
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);
    const { data, error } = await db
      .from('message_templates')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/whatsapp/activity
router.post('/activity', requireAuth, async (req, res) => {
  try {
    const { lead_id, activity_type, description, counselor_id } = req.body;
    
    if (!lead_id || !activity_type || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getTenantDb(req);
    
    const { data, error } = await db.from('lead_activities').insert([
      {
        lead_id,
        activity_type,
        description,
        created_by: counselor_id || null
      }
    ]).select();

    if (error) throw error;

    // We can also trigger an eventbus event here if needed
    // const { eventBus } = require('./notificationService');
    // eventBus.emit('lead.activity_logged', { lead_id, activity_type });

    res.json(data[0]);
  } catch (error) {
    console.error('Error logging WhatsApp activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// GET /api/whatsapp/metrics (Optional, can be used if we decouple stats)
// We will integrate metrics directly in /api/stats instead.

module.exports = router;
