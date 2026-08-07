const express = require('express');
const router = express.Router();
const { getTenantDb, requireAuth, requireRole } = require('./auth');

// GET /api/installments?admission_id=... - fetch installments for an admission
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);
    const { admission_id } = req.query;
    if (!admission_id) return res.status(400).json({ error: 'admission_id is required' });

    const { data, error } = await db
      .from('installments')
      .select('*')
      .eq('admission_id', admission_id)
      .order('due_date', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Failed to fetch installments:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/installments - create installments (Accounts/Counselor/Admin)
router.post('/', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);
    const { admission_id, installments } = req.body;
    if (!admission_id || !Array.isArray(installments)) return res.status(400).json({ error: 'Invalid payload' });

    // Remove existing installments for admission (replace semantics)
    const { error: delErr } = await db.from('installments').delete().eq('admission_id', admission_id);
    if (delErr) throw delErr;

    // Insert provided installments with optional paid/paid_date fields
    const rows = installments.map(i => ({
      admission_id,
      amount: i.amount || 0,
      due_date: i.due_date || null,
      paid: i.paid || false,
      paid_date: i.paid_date || null
    }));
    const { data, error } = await db.from('installments').insert(rows).select('*');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Failed to create installments:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/installments/:id - update single installment (including paid_date)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);
    const { id } = req.params;
    const payload = req.body || {};
    
    // If marking as paid and no paid_date provided, set it to now
    if (payload.paid === true && !payload.paid_date) {
      payload.paid_date = new Date().toISOString().split('T')[0];
    }
    // If unmarking as paid, clear paid_date
    if (payload.paid === false) {
      payload.paid_date = null;
    }
    
    const { error } = await db.from('installments').update(payload).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update installment:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/installments/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);
    const { id } = req.params;
    const { error } = await db.from('installments').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete installment:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
