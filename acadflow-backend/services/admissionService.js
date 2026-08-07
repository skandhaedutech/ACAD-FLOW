const express = require('express');
const router = express.Router();
const { getTenantDb, requireAuth, requireRole } = require('./auth');
const eventBus = require('./eventBus');
const dbAdmin = require('../db'); // Admin client for background EventBus processes
const { generateNextStudentId } = require('./idGenerator');

function getCourseFee(courseName) {
  if (!courseName) return 35000;
  const name = courseName.toLowerCase();
  if (name.includes('python')) return 30000;
  if (name.includes('ui/ux') || name.includes('design')) return 32000;
  if (name.includes('data science') || name.includes('ai')) return 40000;
  if (name.includes('digital marketing')) return 30000;
  return 35000;
}

// 📥 Decoupled Subscriber: Create admission record when a lead is converted
eventBus.subscribe('lead.converted', async (payload) => {
  console.log(`[AdmissionService] 📥 Auto-enrolling converted lead: ${payload.student_name}`);
  try {
    const { lead_id, course, organization_id, branch_id } = payload;
    
    // Ensure we don't insert duplicates
    const { data: existing } = await dbAdmin
      .from('admissions')
      .select('id')
      .eq('lead_id', lead_id);
      
    if (existing && existing.length > 0) {
      console.log(`[AdmissionService] Admission record already exists for lead: ${lead_id}`);
      return;
    }
    
    const defaultFees = getCourseFee(course);
    
    // Create baseline admission record in PostgreSQL
    const { error } = await dbAdmin
      .from('admissions')
      .insert([{
        lead_id,
        organization_id,
        branch_id,
        course,
        fees: defaultFees,
        payment_status: 'Pending'
      }]);
      
    if (error) throw error;
    
    // Broadcast event downstream
    eventBus.publish('admission.created', payload);
  } catch (err) {
    console.error('[AdmissionService] Error processing auto-enrollment event:', err);
  }
});

// 1. GET /api/admissions - Fetch all admitted student details scoped by organization
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);
    const { data: admissions, error } = await db
      .from('active_admissions')
      .select(`
        id,
        course,
        fees,
        payment_status,
        joined_date,
        leads (
          id,
          student_id,
          name,
          phone,
          email,
          notes,
          created_at,
          counselors (
            name
          )
        )
      `)
      .order('joined_date', { ascending: false });

    if (error) throw error;

    const formattedAdmissions = (admissions || []).map(adm => {
      const lead = adm.leads || {};
      const counselor = lead.counselors || {};
      
      let meta = {};
      try {
        if (lead.notes && typeof lead.notes === 'string' && lead.notes.startsWith('{')) {
          meta = JSON.parse(lead.notes);
        }
      } catch (e) {}

      const defaultFee = getCourseFee(adm.course);
      const rawFees = parseFloat(adm.fees);
      const feesVal = (rawFees && rawFees > 0) ? rawFees : (meta.final_fees || meta.course_fees || defaultFee);
      
      // Dynamic emi-status calculation
      let emiStatus = adm.payment_status || 'Pending';
      
      let amountPaid = meta.amount_paid !== undefined && meta.amount_paid !== null && meta.amount_paid !== "" ? parseFloat(meta.amount_paid) : null;
      let pendingAmount = meta.pending_amount !== undefined && meta.pending_amount !== null && meta.pending_amount !== "" ? parseFloat(meta.pending_amount) : null;

      if (amountPaid === null || isNaN(amountPaid)) {
        if (emiStatus === 'Paid') {
          amountPaid = feesVal;
          pendingAmount = 0;
        } else {
          amountPaid = Math.round(feesVal * 0.35);
          pendingAmount = Math.max(feesVal - amountPaid, 0);
        }
      } else if (pendingAmount === null || isNaN(pendingAmount)) {
        pendingAmount = Math.max(feesVal - amountPaid, 0);
      }

      // Ensure emiStatus accurately reflects the calculated amounts to prevent desync errors
      if (pendingAmount > 0) {
        emiStatus = 'Pending';
      } else if (pendingAmount <= 0 && amountPaid >= feesVal) {
        emiStatus = 'Paid';
      }

      return {
        id: adm.id,
        student_id: lead.student_id || '',
        student_name: lead.name || 'Unknown',
        phone_number: lead.phone || '',
        email: lead.email || '',
        course: adm.course || '',
        total_fee: feesVal,
        amount_paid: amountPaid,
        pending_amount: pendingAmount,
        emi_status: emiStatus,
        counselor_name: counselor.name || 'Unassigned',
        admission_date: adm.joined_date,
        custom_emis: meta.custom_emis || null
      };
    });

    res.json(formattedAdmissions);
  } catch (error) {
    console.error('Error fetching admissions list:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. POST /api/admissions - Register a new manual admission enrollment
router.post('/', requireAuth, async (req, res) => {
  const {
    student_id,
    student_name,
    phone_number,
    email,
    gender,
    date_of_birth,
    address,
    course,
    course_duration,
    batch,
    trainer,
    course_fees,
    discount,
    final_fees,
    amount_paid,
    pending_amount,
    payment_mode,
    transaction_id,
    installment_option,
    college_name,
    degree,
    year_of_study,
    skill_level,
    lead_source,
    counselor_name,
    notes,
    admission_date,
    custom_emis
  } = req.body;

  if (!student_name || !phone_number || !course) {
    return res.status(400).json({ error: 'Student Name, Phone Number, and Course are required fields' });
  }

  try {
    const db = getTenantDb(req);
    const orgId = req.user.organization_id;
    const branchId = req.user.branch_id;

    // A. Create/Find Counselor
    let counselorId = null;
    if (counselor_name) {
      const { data: existingCounselors } = await db
        .from('counselors')
        .select('id')
        .eq('name', counselor_name);

      if (existingCounselors && existingCounselors.length > 0) {
        counselorId = existingCounselors[0].id;
      } else {
        const cEmail = `${counselor_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@acadflow.com`;
        const { data: newCounselors } = await db
          .from('counselors')
          .insert([{ name: counselor_name, email: cEmail, role: 'Counselor', organization_id: orgId, branch_id: branchId }])
          .select('id');
        if (newCounselors && newCounselors.length > 0) {
          counselorId = newCounselors[0].id;
        }
      }
    }

    // Generate student ID automatically
    const nextId = await generateNextStudentId();
    let finalStudentId = '';

    const metadata = {
      gender,
      date_of_birth,
      address,
      course_duration,
      batch,
      trainer,
      discount,
      final_fees,
      amount_paid,
      pending_amount,
      payment_mode,
      transaction_id,
      installment_option,
      college_name,
      degree,
      year_of_study,
      skill_level,
      notes: notes || '',
      custom_emis
    };
    const notesJsonStr = JSON.stringify(metadata);

    // C. Check Lead
    let leadId = null;
    const { data: existingLeads } = await db
      .from('leads')
      .select('id, student_id')
      .eq('phone', phone_number);

    if (existingLeads && existingLeads.length > 0) {
      leadId = existingLeads[0].id;
      finalStudentId = existingLeads[0].student_id || nextId; // reuse or generate if missing
      await db
        .from('leads')
        .update({ 
          status: 'Converted', 
          email: email || undefined,
          student_id: finalStudentId,
          notes: notesJsonStr,
          counselor_id: counselorId || undefined
        })
        .eq('id', leadId);
    } else {
      finalStudentId = nextId;
      const { data: newLeads } = await db
        .from('leads')
        .insert([{
          name: student_name,
          student_id: finalStudentId,
          phone: phone_number,
          email: email || null,
          course_interested: course,
          source: lead_source || 'Direct Walk-In',
          status: 'Converted',
          notes: notesJsonStr,
          counselor_id: counselorId,
          lead_score: 100,
          organization_id: orgId,
          branch_id: branchId
        }])
        .select('id');
      if (newLeads && newLeads.length > 0) {
        leadId = newLeads[0].id;
      }
    }

    // D. Create Admission record
    const { data: existingAdmissions } = await db
      .from('admissions')
      .select('id')
      .eq('lead_id', leadId);

    const hasAdmissionRecord = existingAdmissions && existingAdmissions.length > 0;
    const paymentStatus = parseFloat(pending_amount || 0) > 0 ? 'Pending' : 'Paid';

    if (hasAdmissionRecord) {
      // Update admission and get admission id
      await db
        .from('admissions')
        .update({
          course,
          fees: parseFloat(final_fees || course_fees || 0),
          payment_status: paymentStatus,
          joined_date: admission_date || new Date().toISOString()
        })
        .eq('lead_id', leadId);

      // find the admission id for further processing
      const { data: admRows } = await db.from('admissions').select('id').eq('lead_id', leadId).limit(1);
      var admissionId = admRows && admRows.length > 0 ? admRows[0].id : null;
    } else {
      // Insert admission and capture id
      const { data: insertedAdmissions, error: insertErr } = await db
        .from('admissions')
        .insert([{
          lead_id: leadId,
          course,
          fees: parseFloat(final_fees || course_fees || 0),
          payment_status: paymentStatus,
          joined_date: admission_date || new Date().toISOString(),
          organization_id: orgId,
          branch_id: branchId
        }])
        .select('id');

      if (insertErr) throw insertErr;
      var admissionId = insertedAdmissions && insertedAdmissions.length > 0 ? insertedAdmissions[0].id : null;
    }

    // Persist custom EMIs into installments table if provided
    try {
      if (admissionId && Array.isArray(custom_emis) && custom_emis.length > 0) {
        // remove existing installments for admission (replace semantics)
        const { error: delErr } = await db.from('installments').delete().eq('admission_id', admissionId);
        if (delErr) throw delErr;

        const rows = custom_emis.map(i => ({ admission_id: admissionId, amount: i.amount || 0, due_date: i.due_date || null }));
        const { error: insErr } = await db.from('installments').insert(rows).select('*');
        if (insErr) throw insErr;
      }
    } catch (emiErr) {
      console.error('Failed to persist custom_emis/installments:', emiErr);
    }

    // E. Emit decoupled events to the Event Bus
    eventBus.publish('manual_admission.completed', {
      student_id: finalStudentId,
      student_name,
      phone: phone_number,
      course,
      pending_amount,
      installment_option,
      organization_id: orgId,
      branch_id: branchId
    });

    res.json({ success: true, student_id: finalStudentId, lead_id: leadId });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. PUT /api/admissions/:id/pay - Mark student EMI payment status as Paid (Accounts only)
router.put('/:id/pay', requireAuth, requireRole(['Super Admin', 'Accounts']), async (req, res) => {
  const { id } = req.params;
  try {
    const db = getTenantDb(req);
    const { data: admissions, error: fetchErr } = await db
      .from('admissions')
      .select('*, leads(name, phone, notes)')
      .eq('id', id);

    if (fetchErr || !admissions || admissions.length === 0) {
      return res.status(404).json({ error: 'Admission details not found' });
    }

    const adm = admissions[0];

    // Mark paid
    const { error: updateErr } = await db
      .from('admissions')
      .update({ payment_status: 'Paid' })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // Trigger decoupled payment completion event
    eventBus.publish('payment.completed', {
      admission_id: id,
      student_name: adm.leads?.name || 'student',
      course: adm.course,
      organization_id: req.user.organization_id,
      branch_id: req.user.branch_id
    });

    res.json({ success: true, message: 'Fee collection updated to Paid successfully' });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. PUT /api/admissions/:id - Edit an admission record
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const {
    student_name,
    phone_number,
    email,
    course,
    course_fees,
    discount,
    final_fees,
    amount_paid,
    pending_amount,
    payment_mode,
    counselor_name,
    gender,
    date_of_joining,
    address,
    course_duration,
    batch,
    trainer,
    transaction_id,
    installment_option,
    college_name,
    degree,
    year_of_study,
    skill_level,
    notes,
    custom_emis
  } = req.body;

  try {
    const db = getTenantDb(req);

    // Fetch the admission to get linked lead_id
    const { data: admissions, error: fetchErr } = await db
      .from('admissions')
      .select('*, leads(id, name, phone)')
      .eq('id', id);

    if (fetchErr || !admissions || admissions.length === 0) {
      return res.status(404).json({ error: 'Admission record not found' });
    }

    const adm = admissions[0];
    const leadId = adm.lead_id || adm.leads?.id;

    // Update admission table fields
    const paymentStatus = parseFloat(pending_amount || 0) > 0 ? 'Pending' : 'Paid';
    const { error: admErr } = await db
      .from('admissions')
      .update({
        course: course || adm.course,
        fees: parseFloat(final_fees || course_fees || adm.fees),
        payment_status: paymentStatus
      })
      .eq('id', id);

    if (admErr) throw admErr;

    // Update linked lead record with new metadata
    if (leadId) {
      const metadata = {
        gender, date_of_joining: date_of_joining, address,
        course_duration, batch, trainer, discount, final_fees,
        amount_paid, pending_amount, payment_mode, transaction_id,
        installment_option, college_name, degree, year_of_study,
        skill_level, notes: notes || '',
        custom_emis
      };

      // Find counselor ID
      let counselorId = undefined;
      if (counselor_name) {
        const { data: counselors } = await db
          .from('counselors')
          .select('id')
          .eq('name', counselor_name);
        if (counselors && counselors.length > 0) {
          counselorId = counselors[0].id;
        }
      }

      const leadUpdate = {
        name: student_name || undefined,
        phone: phone_number || undefined,
        email: email || undefined,
        course_interested: course || undefined,
        notes: JSON.stringify(metadata),
        ...(counselorId ? { counselor_id: counselorId } : {})
      };

      // Remove undefined values
      Object.keys(leadUpdate).forEach(k => leadUpdate[k] === undefined && delete leadUpdate[k]);

      await db.from('leads').update(leadUpdate).eq('id', leadId);
    }

    // Update installments table if custom_emis provided (replace semantics)
    try {
      if (Array.isArray(custom_emis)) {
        const { error: delErr } = await db.from('installments').delete().eq('admission_id', id);
        if (delErr) throw delErr;
        if (custom_emis.length > 0) {
          const rows = custom_emis.map(i => ({ admission_id: id, amount: i.amount || 0, due_date: i.due_date || null }));
          const { error: insErr } = await db.from('installments').insert(rows).select('*');
          if (insErr) throw insErr;
        }
      }
    } catch (emiErr) {
      console.error('Failed to update installments for admission:', emiErr);
    }

    res.json({ success: true, message: 'Admission updated successfully' });
  } catch (error) {
    console.error('Error updating admission:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. DELETE /api/admissions/:id - Soft delete an admission record
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getTenantDb(req);

    // Perform soft delete by setting deleted_at to current timestamp
    const { error: softErr } = await db
      .from('admissions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (softErr) throw softErr;

    res.json({ success: true, message: 'Admission deleted successfully' });
  } catch (error) {
    console.error('Error deleting admission:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

module.exports = router;
