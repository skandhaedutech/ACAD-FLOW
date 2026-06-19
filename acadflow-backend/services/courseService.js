const express = require('express');
const { requireAuth, getTenantDb } = require('./auth');

const router = express.Router();

// GET /api/courses
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);
    const { data, error } = await db
      .from('courses')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
        // If table doesn't exist yet, return empty array gracefully
        if (error.code === '42P01') {
            return res.json([]);
        }
        throw error;
    }
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// POST /api/courses
router.post('/', requireAuth, async (req, res) => {
  try {
    const { 
        title, category, duration, fee, max_price, discount, mode, trainer_name, admission_status,
        trainer_experience, placement_percentage, rating, syllabus, 
        batch_timings, placement_partners, emi_options, ai_insight 
    } = req.body;
    
    if (!title || !category || !fee) {
      return res.status(400).json({ error: 'Missing required fields (title, category, fee)' });
    }

    const db = getTenantDb(req);
    const orgId = req.user?.user_metadata?.organization_id || '00000000-0000-0000-0000-000000000001';
    
    const { data, error } = await db.from('courses').insert([
      {
        organization_id: orgId,
        title,
        category,
        duration: duration || '',
        fee,
        max_price: max_price || fee,
        discount: discount || 0,
        mode: mode || 'Online / Offline',
        admission_status: admission_status || 'Open',
        trainer_name: trainer_name || 'TBD',
        trainer_experience: trainer_experience || '5+ Years',
        placement_percentage: placement_percentage || 80,
        rating: rating || 5.0,
        syllabus: syllabus || [],
        batch_timings: batch_timings || [],
        placement_partners: placement_partners || [],
        emi_options: emi_options || 'Available on request',
        ai_insight: ai_insight || 'New course offering.'
      }
    ]).select();

    if (error) throw error;

    res.json(data[0]);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// PUT /api/courses/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
        title, category, duration, fee, max_price, discount, mode, trainer_name, admission_status,
        trainer_experience, placement_percentage, rating, syllabus, 
        batch_timings, placement_partners, emi_options, ai_insight 
    } = req.body;
    
    if (!title || !category || !fee) {
      return res.status(400).json({ error: 'Missing required fields (title, category, fee)' });
    }

    const db = getTenantDb(req);
    
    const { data, error } = await db.from('courses').update({
        title,
        category,
        duration: duration || '',
        fee,
        max_price: max_price || fee,
        discount: discount || 0,
        mode: mode || 'Online / Offline',
        admission_status: admission_status || 'Open',
        trainer_name: trainer_name || 'TBD',
        trainer_experience: trainer_experience || '5+ Years',
        placement_percentage: placement_percentage || 80,
        rating: rating || 5.0,
        syllabus: syllabus || [],
        batch_timings: batch_timings || [],
        placement_partners: placement_partners || [],
        emi_options: emi_options || 'Available on request',
        ai_insight: ai_insight || 'Course updated.'
    }).eq('id', id).select();

    if (error) throw error;

    res.json(data[0]);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

module.exports = router;
