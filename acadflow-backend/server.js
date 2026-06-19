const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { requireAuth, getTenantDb } = require('./services/auth');
const dbAdmin = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// --- Modular Routing Blocks ---
const leadRouter = require('./services/leadService');
const admissionRouter = require('./services/admissionService');
const aiRouter = require('./services/aiService');
const counselorRouter = require('./services/counselorService');
const publicRouter = require('./services/publicService');
const whatsappRouter = require('./services/whatsappService');
const courseRouter = require('./services/courseService');
const { router: notificationRouter, initNotificationService } = require('./services/notificationService');

// Initialize decoupled event subscribers for database auditing and real-time triggers
initNotificationService();

// Legacy compatibility route rewrite for /api/update-lead
app.put('/api/update-lead', (req, res, next) => {
  req.url = '/update-lead';
  leadRouter(req, res, next);
});

// Mount Scoped API Sub-routers
app.use('/api/leads', leadRouter);
app.use('/api/admissions', admissionRouter);
app.use('/api/ai-insights', aiRouter);
app.use('/api/insights', aiRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/counselors', counselorRouter);
app.use('/api/public', publicRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/courses', courseRouter);

// GET /api/stats - Dashboard KPI metrics scoped strictly by active organization
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);
    
    // Fetch active leads, admissions, counselors, and activities in parallel
    const [leadsRes, admissionsRes, counselorsRes, activitiesRes] = await Promise.all([
      db.from('active_leads').select('id, status, followup_time, course_interested, counselor_id'),
      db.from('active_admissions').select('id, fees, course, lead_id'),
      db.from('active_counselors').select('id, name'),
      db.from('lead_activities').select('activity_type, description')
    ]);

    if (leadsRes.error) throw leadsRes.error;
    if (admissionsRes.error) throw admissionsRes.error;
    if (counselorsRes.error) throw counselorsRes.error;

    const leads = leadsRes.data || [];
    const admissions = admissionsRes.data || [];
    const counselors = counselorsRes.data || [];
    const activities = (activitiesRes && !activitiesRes.error) ? activitiesRes.data : [];

    const totalLeads = leads.length;
    const activeLeads = leads.filter(l => !['Not Interested', 'Converted', 'Lost'].includes(l.status)).length;
    const lostLeads = leads.filter(l => ['Not Interested', 'Lost'].includes(l.status)).length;
    const admissionsCount = admissions.length;
    const revenue = admissions.reduce((sum, adm) => sum + parseFloat(adm.fees || 0), 0);

    // Follow-ups due today/immediate or pending
    const followupsDue = leads.filter(l => l.status === 'Pending' || l.followup_time === 'Today' || l.followup_time === 'Immediate').length;

    // Trending courses list
    const courseCounts = {};
    leads.forEach(l => {
      if (l.course_interested) {
        courseCounts[l.course_interested] = (courseCounts[l.course_interested] || 0) + 1;
      }
    });
    const trendingCourses = Object.entries(courseCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Counselor stats
    const counselorStats = counselors.map(c => {
      const cLeads = leads.filter(l => l.counselor_id === c.id);
      const cAdmissions = admissions.filter(a => cLeads.some(l => l.id === a.lead_id));
      const conversionRate = cLeads.length > 0 ? Math.round((cAdmissions.length / cLeads.length) * 100) : 0;
      return {
        name: c.name,
        leadsAssigned: cLeads.length,
        conversions: cAdmissions.length,
        conversionRate
      };
    });

    // WhatsApp Stats
    const whatsappTotal = activities.filter(a => a.activity_type === 'WhatsApp Follow-up Sent').length;
    const whatsappFollowups = activities.filter(a => a.description && a.description.includes('Follow-up Reminder')).length;
    const whatsappAdmissions = activities.filter(a => a.description && a.description.includes('Admission Reminder')).length;

    res.json({
      totalLeads,
      activeLeads,
      lostLeads,
      admissions: admissionsCount,
      revenue,
      followupsDue,
      trendingCourses,
      counselorStats,
      whatsappStats: {
        totalSent: whatsappTotal,
        followupReminders: whatsappFollowups,
        admissionReminders: whatsappAdmissions
      }
    });
  } catch (error) {
    console.error('Error fetching KPI metrics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/sync-sheet - Keep sync endpoint strictly for manual importing if requested
app.post('/api/sync-sheet', requireAuth, async (req, res) => {
  try {
    const { syncSheetsToDB } = require('./services/googleSheets');
    await syncSheetsToDB(null);
    res.json({ message: 'Sheets sync completed successfully' });
  } catch (error) {
    console.error('Sheets sync failed:', error);
    res.status(500).json({ error: 'Sheets sync failed' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Production API Gateway running on port ${PORT}`);
});
