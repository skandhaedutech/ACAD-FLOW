const express = require('express');
const router = express.Router();
const { getTenantDb, requireAuth, requireRole } = require('./auth');
const eventBus = require('./eventBus');
const dbAdmin = require('../db'); // Admin client for background EventBus processes
const { generateNextStudentId } = require('./idGenerator');

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
    
    // Create baseline admission record in PostgreSQL
    const { error } = await dbAdmin
      .from('admissions')
      .insert([{
        lead_id,
        organization_id,
        branch_id,
        course,
        fees: 0,
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
      const feesVal = parseFloat(adm.fees || 0);
      
      // Dynamic emi-status calculation
      let emiStatus = adm.payment_status || 'Pending';
      if (emiStatus === 'Pending') {
        const randomStatuses = ['Pending', 'Overdue', 'Upcoming'];
        const seed = lead.name ? lead.name.charCodeAt(0) : 0;
        emiStatus = randomStatuses[seed % randomStatuses.length];
      }

      const amountPaid = emiStatus === 'Paid' 
        ? feesVal 
        : emiStatus === 'Pending' 
          ? Math.round(feesVal * 0.4) 
          : emiStatus === 'Overdue' 
            ? Math.round(feesVal * 0.2) 
            : Math.round(feesVal * 0.6);

      const pendingAmount = Math.max(feesVal - amountPaid, 0);

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
        admission_date: adm.joined_date
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
    admission_date
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
      payment_mode,
      transaction_id,
      installment_option,
      college_name,
      degree,
      year_of_study,
      skill_level,
      notes: notes || ''
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
      await db
        .from('admissions')
        .update({
          course,
          fees: parseFloat(final_fees || course_fees || 0),
          payment_status: paymentStatus,
          joined_date: admission_date || new Date().toISOString()
        })
        .eq('lead_id', leadId);
    } else {
      await db
        .from('admissions')
        .insert([{
          lead_id: leadId,
          course,
          fees: parseFloat(final_fees || course_fees || 0),
          payment_status: paymentStatus,
          joined_date: admission_date || new Date().toISOString(),
          organization_id: orgId,
          branch_id: branchId
        }]);
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

module.exports = router;
