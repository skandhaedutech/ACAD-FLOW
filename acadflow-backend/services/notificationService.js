const express = require('express');
const router = express.Router();
const { getTenantDb, requireAuth } = require('./auth');
const eventBus = require('./eventBus');
const supabase = require('../db');

// Helper to save notifications in background events
const addNotification = async (notif) => {
  const orgId = notif.organization_id || '00000000-0000-0000-0000-000000000001';
  const newNotif = {
    organization_id: orgId,
    branch_id: notif.branch_id || '00000000-0000-0000-0000-000000000002',
    title: notif.title,
    message: notif.message,
    type: notif.type || 'SYSTEM_ALERT',
    priority: notif.priority || 'Low',
    is_read: false,
    is_resolved: false,
    action_url: notif.action_url || ''
  };

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([newNotif])
      .select();
    if (error) throw error;
    console.log(`[NotificationService] Database notification logged: ${notif.title}`);
    return data[0];
  } catch (err) {
    console.error('[NotificationService] Failed to save notification to database:', err);
    return null;
  }
};

/**
 * Centrally registers and logs notifications in PostgreSQL database
 */
const initNotificationService = (io) => {
  // ===================================================================
  // 📥 EVENT BUS SUBSCRIBERS (Decoupled Automated System Alerts)
  // ===================================================================

  // 1. Auto Alert for Manual Enrollments
  eventBus.subscribe('manual_admission.completed', async (payload) => {
    const { student_name, student_id, course, pending_amount, installment_option, organization_id } = payload;
    
    await addNotification({
      organization_id,
      title: "New admission completed 🎓",
      message: `${student_name} enrolled in ${course} (ID: ${student_id}).`,
      type: "ADMISSION_ALERT",
      priority: "Medium",
      action_url: "/admissions"
    });

    if (parseFloat(pending_amount || 0) > 0) {
      await addNotification({
        organization_id,
        title: "Installment generated 💰",
        message: `Pending balance of ₹${parseFloat(pending_amount).toLocaleString()} for ${student_name} (${installment_option || 'EMI'}).`,
        type: "PAYMENT_ALERT",
        priority: "High",
        action_url: "/admissions"
      });
    }

    // AI trends trigger alert
    await addNotification({
      organization_id,
      title: `${course} conversion boost 📈`,
      message: `AI Insight: ${course} enrollments showed a surge after campaign adjustments.`,
      type: "AI_INSIGHT",
      priority: "Medium",
      action_url: "/ai-insights"
    });
  });

  // 2. Alert for Payment Completions
  eventBus.subscribe('payment.completed', async (payload) => {
    const { student_name, course, organization_id } = payload;
    await addNotification({
      organization_id,
      title: "Fee payment completed ✅",
      message: `Received final fee payment installment from ${student_name} for course: ${course}.`,
      type: "PAYMENT_ALERT",
      priority: "Medium",
      action_url: "/admissions"
    });
  });

  // 3. Alert for Real-time counselor lead updates
  eventBus.subscribe('lead.status_changed', async (payload) => {
    const { student_name, new_status, organization_id } = payload;
    
    if (new_status === 'Pending') {
      await addNotification({
        organization_id,
        title: "Follow-up Overdue Alert 🔴",
        message: `Lead ${student_name} followup has expired. Action required.`,
        type: "SYSTEM_ALERT",
        priority: "High",
        action_url: "/leads"
      });
    }
  });

  return { addNotification };
};

// ===================================================================
// REST API Routes
// ===================================================================

// GET /api/notifications - Fetch all active notifications scoped by active tenant
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);
    const { data, error } = await db
      .from('active_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/:id/read - Mark alert as read
router.put('/:id/read', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getTenantDb(req);
    const { error } = await db
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to mark notification read:', error);
    res.status(500).json({ error: 'Failed to update alert log status' });
  }
});

// PUT /api/notifications/:id/resolve - Resolve active notification checklist item
router.put('/:id/resolve', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getTenantDb(req);
    const { error } = await db
      .from('notifications')
      .update({ is_resolved: true, is_read: true })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to resolve notification:', error);
    res.status(500).json({ error: 'Failed to resolve notification logs' });
  }
});

// POST /api/notifications/mark-all-read - Clear all unread notifications
router.post('/mark-all-read', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);
    const { error } = await db
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to mark all notifications read:', error);
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

module.exports = {
  router,
  initNotificationService
};
