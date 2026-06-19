const express = require('express');
const router = express.Router();
const { getTenantDb, requireAuth } = require('./auth');

// 1. GET /api/counselors - Fetch active counselors scoped by organization
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);
    const { data: counselors, error } = await db
      .from('active_counselors')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(counselors || []);
  } catch (error) {
    console.error('Error fetching counselors:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. POST /api/counselors - Add a new counselor member
router.post('/', requireAuth, async (req, res) => {
  const { name, email, phone, branch, role } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and Email are required fields' });
  }

  try {
    const db = getTenantDb(req);
    const orgId = req.user?.organization_id || '00000000-0000-0000-0000-000000000001';
    const branchId = req.user?.branch_id || '00000000-0000-0000-0000-000000000002';

    const newCounselor = {
      name,
      email,
      phone: phone || null,
      branch: branch || null,
      role: role || 'Counselor',
      organization_id: orgId,
      branch_id: branchId
    };

    const { data, error } = await db
      .from('counselors')
      .insert([newCounselor])
      .select();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'A member with this email address already exists' });
      }
      throw error;
    }

    res.status(201).json({ message: 'Counselor created successfully', counselor: data[0] });
  } catch (error) {
    console.error('Error creating counselor:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. PUT /api/counselors/:id - Update counselor details
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, branch, role } = req.body;

  try {
    const db = getTenantDb(req);

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (branch !== undefined) updates.branch = branch;
    if (role !== undefined) updates.role = role;

    const { data, error } = await db
      .from('counselors')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'A member with this email address already exists' });
      }
      throw error;
    }

    res.json({ message: 'Counselor updated successfully', counselor: data[0] });
  } catch (error) {
    console.error('Error updating counselor:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. DELETE /api/counselors/:id - Soft delete a counselor (sets deleted_at)
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const db = getTenantDb(req);
    const { error } = await db
      .from('counselors')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Counselor removed successfully' });
  } catch (error) {
    console.error('Error removing counselor:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
