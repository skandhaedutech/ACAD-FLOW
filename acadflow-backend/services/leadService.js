const express = require('express');
const router = express.Router();
const { getTenantDb, requireAuth } = require('./auth');
const eventBus = require('./eventBus');
const { appendLeadToSheet, updateLeadInSheet } = require('./googleSheets');

// 1. GET /api/leads - Fetch active leads scoped by tenant organization
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);
    
    const { data: leads, error } = await db
      .from('active_leads')
      .select(`
        *,
        student_id,
        counselors (
          name
        ),
        admissions (
          course,
          fees,
          payment_status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedLeads = (leads || []).map(lead => {
      const hasAdmission = lead.admissions && lead.admissions.length > 0;
      const admissionRecord = hasAdmission ? lead.admissions[0] : null;

      return {
        id: lead.id,
        student_name: lead.name,
        phone_number: lead.phone,
        email: lead.email || '',
        interested_course: lead.course_interested,
        lead_source: lead.source,
        counselor_name: lead.counselors ? lead.counselors.name : '',
        counselor_id: lead.counselor_id,
        followup_status: lead.status || 'Pending',
        followup_time: lead.followup_time || 'One Day',
        admission_status: hasAdmission ? 'Admitted' : 'Not Admitted',
        fees: admissionRecord ? parseFloat(admissionRecord.fees || 0) : 0,
        lead_score: lead.lead_score || 50,
        created_date: lead.created_at,
        gender: lead.gender || '',
        city: lead.city || '',
        fees_discussed: lead.fees_discussed ? parseFloat(lead.fees_discussed) : 0,
        remarks: lead.remarks || '',
        student_id: lead.student_id || ''
      };
    });

    res.json(formattedLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/test', async (req, res) => {
  try {
    const db = require('../db');
    const { data: leads, error } = await db
      .from('active_leads')
      .select(`
        *,
        student_id
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads test:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. POST /api/leads - Create a new lead directly in Supabase
router.post('/', requireAuth, async (req, res) => {
  const { 
    student_id,
    student_name, 
    phone_number, 
    email, 
    interested_course, 
    lead_source, 
    counselor_id, 
    followup_status, 
    followup_time, 
    gender, 
    city, 
    fees_discussed, 
    remarks 
  } = req.body;

  if (!student_name || !phone_number) {
    return res.status(400).json({ error: 'Student name and phone number are required' });
  }

  try {
    const db = getTenantDb(req);
    const orgId = req.user?.organization_id || '00000000-0000-0000-0000-000000000001';
    const branchId = req.user?.branch_id || '00000000-0000-0000-0000-000000000002';

    console.log('--- LEAD CREATION DEBUG ---');
    console.log('Incoming Payload:', req.body);
    console.log('Phone Number Received:', phone_number);
    console.log('Organization ID Received:', orgId);

    // No duplicate checking logic per user request

    // Do not auto-generate student ID. Let counselor add it, otherwise null.
    const nextId = student_id || null;

    const newLead = {
      name: student_name,
      student_id: nextId,
      phone: phone_number,
      email: email || '',
      course_interested: interested_course || '',
      source: lead_source || 'Direct Walk-in',
      counselor_id: counselor_id || null,
      status: followup_status || 'Pending',
      followup_time: followup_time || 'One Day',
      gender: gender || '',
      city: city || '',
      fees_discussed: fees_discussed ? parseFloat(fees_discussed) : null,
      remarks: remarks || '',
      organization_id: orgId,
      branch_id: branchId,
      lead_score: 50
    };

    const { data: createdData, error } = await db
      .from('leads')
      .insert([newLead])
      .select();

    if (error) throw error;
    const createdLead = createdData[0];

    // Log in audit logs
    await db.from('audit_logs').insert([{
      organization_id: orgId,
      branch_id: branchId,
      user_id: req.user?.id || null,
      action: 'CREATE_LEAD',
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
      organization_id: orgId,
      branch_id: branchId
    });

    // Fetch counselor name for GSheet
    let counselorName = '';
    if (counselor_id) {
      const { data: cData } = await db.from('counselors').select('name').eq('id', counselor_id);
      if (cData && cData.length > 0) counselorName = cData[0].name;
    }

    // Automatically add to Google Sheet
    appendLeadToSheet({
      name: newLead.name,
      phone: newLead.phone,
      email: newLead.email,
      course_interested: newLead.course_interested,
      source: newLead.source,
      status: newLead.status,
      counselor_name: counselorName,
      followup_time: newLead.followup_time,
      remarks: newLead.remarks,
      student_id: newLead.student_id
    }).catch(err => console.error('Failed to append to GSheet:', err));

    res.status(201).json({ message: 'Lead created successfully', lead: createdLead });
  } catch (error) {
    console.error('Error creating lead:', error, JSON.stringify(error));
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
      details: error.details || null
    });
  }
});

// Legacy / compatibility route for update-lead (MUST be registered before dynamic param /:id)
router.put('/update-lead', requireAuth, async (req, res) => {
  const { phone_number, followup_status, admission_status, followup_time } = req.body;
  
  if (!phone_number) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const db = getTenantDb(req);
    
    const { data: leads, error: findError } = await db
      .from('leads')
      .select('id, name, course_interested, status, counselor_id, organization_id, branch_id')
      .eq('phone', phone_number);

    if (findError) throw findError;

    if (!leads || leads.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leads[0];

    // Map legacy update call to our PUT /:id updates
    const updates = {};
    if (followup_status) updates.status = followup_status;
    if (followup_time) updates.followup_time = followup_time;

    if (Object.keys(updates).length > 0) {
      const { error: updateLeadError } = await db
        .from('leads')
        .update(updates)
        .eq('id', lead.id);

      if (updateLeadError) throw updateLeadError;

      // Log followup details if status changed
      if (followup_status && followup_status !== lead.status) {
        await db.from('follow_ups').insert([{
          lead_id: lead.id,
          organization_id: lead.organization_id,
          branch_id: lead.branch_id,
          followup_date: new Date().toISOString(),
          followup_type: 'Call',
          status: followup_status === 'Pending' ? 'Pending' : 'Completed',
          remarks: `Status updated via legacy API to ${followup_status}`,
          created_by: lead.counselor_id || req.user?.id || null
        }]);

        // Publish event to decoupled Event Bus
        eventBus.publish('lead.status_changed', {
          lead_id: lead.id,
          student_name: lead.name,
          phone: phone_number,
          old_status: lead.status,
          new_status: followup_status,
          followup_time: followup_time || 'One Day',
          organization_id: lead.organization_id,
          branch_id: lead.branch_id
        });
      }
    }

    // Update admissions status
    if (admission_status) {
      const { data: existingAdmissions, error: admSelectError } = await db
        .from('admissions')
        .select('id')
        .eq('lead_id', lead.id);

      if (admSelectError) throw admSelectError;

      const hasAdmissionRecord = existingAdmissions && existingAdmissions.length > 0;

      if (admission_status === 'Admitted' && !hasAdmissionRecord) {
        // Trigger Lead Converted Event Bus sequence
        eventBus.publish('lead.converted', {
          lead_id: lead.id,
          student_name: lead.name,
          phone: phone_number,
          course: lead.course_interested || 'Default Course',
          counselor_id: lead.counselor_id,
          organization_id: lead.organization_id,
          branch_id: lead.branch_id
        });
      } else if (admission_status === 'Not Admitted' && hasAdmissionRecord) {
        // Remove admission details
        const { error: deleteAdmError } = await db
          .from('admissions')
          .delete()
          .eq('lead_id', lead.id);
        if (deleteAdmError) throw deleteAdmError;
      }
    }

    res.json({ message: 'Lead updated successfully' });
  } catch (error) {
    console.error('Error updating lead:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
      details: error.details || null
    });
  }
});

// 3. PUT /api/leads/:id - Update an existing lead record
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { 
    student_id,
    student_name, 
    phone_number, 
    email, 
    interested_course, 
    lead_source, 
    counselor_id, 
    followup_status, 
    followup_time, 
    gender, 
    city, 
    fees_discussed, 
    remarks 
  } = req.body;

  try {
    const db = getTenantDb(req);

    const { data: currentLeads, error: getError } = await db
      .from('leads')
      .select('*')
      .eq('id', id);

    if (getError) throw getError;
    if (!currentLeads || currentLeads.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const currentLead = currentLeads[0];

    const updates = {};
    if (student_id !== undefined) updates.student_id = student_id === "" ? null : student_id;
    if (student_name !== undefined) updates.name = student_name;
    if (phone_number !== undefined) updates.phone = phone_number;
    if (email !== undefined) updates.email = email;
    if (interested_course !== undefined) updates.course_interested = interested_course;
    if (lead_source !== undefined) updates.source = lead_source;
    if (counselor_id !== undefined) updates.counselor_id = (counselor_id === "" || counselor_id === "null" || counselor_id === null) ? null : counselor_id;
    if (followup_status !== undefined) updates.status = followup_status;
    if (followup_time !== undefined) updates.followup_time = followup_time;
    if (gender !== undefined) updates.gender = gender;
    if (city !== undefined) updates.city = city;
    if (fees_discussed !== undefined) {
      if (fees_discussed === "" || fees_discussed === null || fees_discussed === "null") {
        updates.fees_discussed = null;
      } else {
        const parsed = parseFloat(fees_discussed);
        updates.fees_discussed = isNaN(parsed) ? null : parsed;
      }
    }
    if (remarks !== undefined) updates.remarks = remarks;

    const { error: updateError } = await db
      .from('leads')
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;

    // Log audit log
    await db.from('audit_logs').insert([{
      organization_id: currentLead.organization_id,
      branch_id: currentLead.branch_id,
      user_id: req.user?.id || null,
      action: 'UPDATE_LEAD',
      entity_type: 'leads',
      entity_id: id,
      old_values: currentLead,
      new_values: { ...currentLead, ...updates }
    }]);

    // Check status change or details change
    if (followup_status && followup_status !== currentLead.status) {
      // Log follow up history
      await db.from('follow_ups').insert([{
        lead_id: id,
        organization_id: currentLead.organization_id,
        branch_id: currentLead.branch_id,
        followup_date: new Date().toISOString(),
        followup_type: 'Call',
        status: followup_status === 'Pending' ? 'Pending' : 'Completed',
        remarks: remarks || `Status updated via CRM edit to ${followup_status}`,
        created_by: counselor_id || currentLead.counselor_id || req.user?.id || null
      }]);

      // Publish event
      eventBus.publish('lead.status_changed', {
        lead_id: id,
        student_name: student_name || currentLead.name,
        phone: phone_number || currentLead.phone,
        old_status: currentLead.status,
        new_status: followup_status,
        followup_time: followup_time || currentLead.followup_time,
        organization_id: currentLead.organization_id,
        branch_id: currentLead.branch_id
      });
    }

    res.json({ message: 'Lead updated successfully' });
  } catch (error) {
    console.error('Error updating lead:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
      details: error.details || null
    });
  }
});

// 4. DELETE /api/leads/:id - Soft delete a lead
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const db = getTenantDb(req);

    const { data: currentLeads, error: getError } = await db
      .from('leads')
      .select('*')
      .eq('id', id);

    if (getError) throw getError;
    if (!currentLeads || currentLeads.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const currentLead = currentLeads[0];

    // Soft delete: update deleted_at
    const { error: deleteError } = await db
      .from('leads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Log audit log
    await db.from('audit_logs').insert([{
      organization_id: currentLead.organization_id,
      branch_id: currentLead.branch_id,
      user_id: req.user?.id || null,
      action: 'DELETE_LEAD',
      entity_type: 'leads',
      entity_id: id,
      old_values: currentLead,
      new_values: { deleted_at: new Date().toISOString() }
    }]);

    res.json({ message: 'Lead soft-deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. POST /api/leads/follow-up - Create a new follow-up and update lead status
router.post('/follow-up', requireAuth, async (req, res) => {
  const { lead_id, followup_type, status, remarks, next_followup_time } = req.body;

  if (!lead_id) {
    return res.status(400).json({ error: 'Lead ID is required' });
  }

  try {
    const db = getTenantDb(req);

    const { data: leads, error: getError } = await db
      .from('leads')
      .select('*')
      .eq('id', lead_id);

    if (getError) throw getError;
    if (!leads || leads.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leads[0];
    const orgId = lead.organization_id;
    const branchId = lead.branch_id;

    // Insert follow-up record
    const { data: followUpData, error: followUpError } = await db
      .from('follow_ups')
      .insert([{
        lead_id,
        organization_id: orgId,
        branch_id: branchId,
        followup_date: new Date().toISOString(),
        followup_type: followup_type || 'Call',
        status: status || 'Completed',
        remarks: remarks || '',
        created_by: req.user?.id || lead.counselor_id || null
      }])
      .select();

    if (followUpError) throw followUpError;

    // Update lead notes / followup_time / status
    const updates = {};
    if (status && status !== lead.status) {
      updates.status = status;
    }
    if (next_followup_time) {
      updates.followup_time = next_followup_time;
    }
    if (remarks) {
      updates.remarks = remarks;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await db
        .from('leads')
        .update(updates)
        .eq('id', lead_id);

      if (updateError) throw updateError;
    }

    // Log audit log
    await db.from('audit_logs').insert([{
      organization_id: orgId,
      branch_id: branchId,
      user_id: req.user?.id || null,
      action: 'ADD_FOLLOW_UP',
      entity_type: 'follow_ups',
      entity_id: followUpData[0].id,
      new_values: { lead_id, status, remarks, next_followup_time }
    }]);

    // Publish event
    eventBus.publish('lead.status_changed', {
      lead_id,
      student_name: lead.name,
      phone: lead.phone,
      old_status: lead.status,
      new_status: status || lead.status,
      followup_time: next_followup_time || lead.followup_time,
      organization_id: orgId,
      branch_id: branchId
    });

    res.status(201).json({ message: 'Follow-up logged successfully', followUp: followUpData[0] });
  } catch (error) {
    console.error('Error logging follow-up:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. GET /api/leads/:id/timeline - Get timeline of events/followups for a lead
router.get('/:id/timeline', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);

    // Fetch follow ups for this lead
    const { data: followups, error: followupsError } = await db
      .from('active_follow_ups')
      .select('*')
      .eq('lead_id', req.params.id)
      .order('followup_date', { ascending: false });

    if (followupsError) throw followupsError;

    // Fetch audit logs for this lead
    const { data: auditLogs, error: auditError } = await db
      .from('audit_logs')
      .select('*')
      .eq('entity_id', req.params.id)
      .eq('entity_type', 'leads')
      .order('created_at', { ascending: false });

    if (auditError) throw auditError;

    // Fetch admission details to show if converted
    const { data: admissions, error: admissionError } = await db
      .from('active_admissions')
      .select('*')
      .eq('lead_id', req.params.id);

    if (admissionError) throw admissionError;

    // Merge and format into timeline events
    const timeline = [];

    // Add follow ups
    (followups || []).forEach(f => {
      timeline.push({
        id: f.id,
        type: 'followup',
        date: f.followup_date,
        title: `Follow-up (${f.followup_type})`,
        description: f.remarks,
        status: f.status
      });
    });

    // Add audit logs
    (auditLogs || []).forEach(a => {
      let title = 'Lead Modified';
      if (a.action === 'CREATE_LEAD') title = 'Lead Created';
      if (a.action === 'DELETE_LEAD') title = 'Lead Deleted';
      if (a.action === 'UPDATE_LEAD') title = 'Lead Updated';
      
      timeline.push({
        id: a.id,
        type: 'audit',
        date: a.created_at,
        title: title,
        description: `Action: ${a.action}`
      });
    });

    // Add admission if exists
    if (admissions && admissions.length > 0) {
      const adm = admissions[0];
      timeline.push({
        id: adm.id,
        type: 'admission',
        date: adm.joined_date || adm.created_at || new Date().toISOString(),
        title: 'Lead Converted to Admission 🎓',
        description: `Enrolled in ${adm.course} | Fees: ₹${parseFloat(adm.fees || 0).toLocaleString()} | Status: ${adm.payment_status}`
      });
    }

    // Sort descending by date
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(timeline);
  } catch (error) {
    console.error('Error fetching lead timeline:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
