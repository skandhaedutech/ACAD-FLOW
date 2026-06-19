const express = require('express');
const router = express.Router();
const dbAdmin = require('../db');
const eventBus = require('./eventBus');
const { calculateLeadScore } = require('./aiEngine');

// POST /api/public/leads - Capture public leads from website
router.post('/leads', async (req, res) => {
  const { 
    student_name, 
    phone_number, 
    email, 
    interested_course, 
    city, 
    education, 
    preferred_time 
  } = req.body;

  if (!student_name || !phone_number) {
    return res.status(400).json({ error: 'Name and phone number are required' });
  }

  try {
    // Determine initial score using the AI Engine
    const leadScoreParams = {
      lead_source: 'Website',
      followup_status: 'Pending',
      interested_course: interested_course || ''
    };
    const lead_score = calculateLeadScore(leadScoreParams);

    const newLead = {
      name: student_name,
      phone: phone_number,
      email: email || '',
      course_interested: interested_course || '',
      source: 'Website',
      status: 'Pending',
      followup_time: preferred_time || 'One Day',
      city: city || '',
      remarks: education ? `Education Background: ${education}` : '',
      organization_id: '00000000-0000-0000-0000-000000000001',
      branch_id: '00000000-0000-0000-0000-000000000002',
      lead_score: lead_score
    };

    const { data: createdData, error } = await dbAdmin
      .from('leads')
      .insert([newLead])
      .select();

    if (error) throw error;
    const createdLead = createdData[0];

    // Log in audit logs
    await dbAdmin.from('audit_logs').insert([{
      organization_id: createdLead.organization_id,
      branch_id: createdLead.branch_id,
      user_id: null,
      action: 'CREATE_LEAD_PUBLIC',
      entity_type: 'leads',
      entity_id: createdLead.id,
      new_values: newLead
    }]);

    // Publish event to decoupled Event Bus
    eventBus.publish('lead.status_changed', {
      lead_id: createdLead.id,
      student_name: createdLead.name,
      phone: createdLead.phone,
      old_status: null,
      new_status: createdLead.status,
      followup_time: createdLead.followup_time,
      organization_id: createdLead.organization_id,
      branch_id: createdLead.branch_id
    });

    res.status(201).json({ message: 'Lead created successfully', lead: createdLead });
  } catch (error) {
    console.error('Error creating public lead:', error);
    if (error && error.code === '23505') {
      return res.status(409).json({ error: 'You have already submitted an inquiry.' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
