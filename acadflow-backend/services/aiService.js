const express = require('express');
const router = express.Router();
const { requireAuth, getTenantDb } = require('./auth');
const eventBus = require('./eventBus');
const { calculateLeadScore, generateAdvancedInsights } = require('./aiEngine');
const dbAdmin = require('../db');

// Helper to inject counselor-specific insights and pipeline statuses dynamically
const enrichPersonalRecommendation = async (db, user, payload) => {
  try {
    const userEmail = user?.email || '';
    const { data: counselor } = await db
      .from('counselors')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle();

    let counselorName = user?.role || 'Counselor';
    let personalMsg = '';
    let personalMetrics = { activeLeads: 0, overdueLeads: 0, bestCourse: 'None' };

    if (counselor) {
      counselorName = counselor.name;
      const { data: cLeads } = await db
        .from('leads')
        .select('*')
        .eq('counselor_id', counselor.id);
      
      const activeLeads = (cLeads || []).filter(l => !['Converted', 'Not Interested', 'Lost'].includes(l.status));
      
      let overdueLeads = 0;
      activeLeads.forEach(l => {
        if (l.status === 'Pending') {
          const date = new Date(l.created_at);
          let days = 1;
          switch (l.followup_time) {
            case 'Today': case 'Immediate': days = 0; break;
            case 'One Day': days = 1; break;
            case 'Two Days': days = 2; break;
            case '3 Days': days = 3; break;
            case 'Within a Week': days = 7; break;
            case 'Within a Month': days = 30; break;
          }
          date.setDate(date.getDate() + days);
          if (new Date() > date) overdueLeads++;
        }
      });

      const courseCounts = {};
      activeLeads.forEach(l => {
        if (l.course_interested) {
          courseCounts[l.course_interested] = (courseCounts[l.course_interested] || 0) + 1;
        }
      });
      let bestCourse = 'None';
      let maxCount = 0;
      for (const course in courseCounts) {
        if (courseCounts[course] > maxCount) {
          maxCount = courseCounts[course];
          bestCourse = course;
        }
      }

      personalMetrics = {
        activeLeads: activeLeads.length,
        overdueLeads,
        bestCourse
      };

      if (overdueLeads > 0) {
        personalMsg = `Hi ${counselorName}, you have ${activeLeads.length} active leads assigned, but ${overdueLeads} follow-up tasks are currently overdue. We recommend prioritizing contacts to these students today to prevent lead drop-off.`;
      } else if (activeLeads.length > 0) {
        personalMsg = `Hi ${counselorName}, your pipeline is looking strong with ${activeLeads.length} active leads. Your assigned students are most interested in "${bestCourse}". Focusing conversion efforts on these leads could yield the best outcomes this week!`;
      } else {
        personalMsg = `Hi ${counselorName}, you have no active leads assigned currently. Please coordinate with the admissions director to assign new prospective student inquiries.`;
      }
    } else {
      // Fallback for Admin
      const { data: allLeads } = await db.from('leads').select('status');
      const activeCount = (allLeads || []).filter(l => !['Converted', 'Not Interested', 'Lost'].includes(l.status)).length;
      personalMsg = `Hi Admin, AcadFlow overall enrollment pipelines have ${activeCount} active leads. Ensure counselor workloads are balanced to maintain optimal response times.`;
    }

    payload.personalRecommendation = {
      counselorName,
      message: personalMsg,
      metrics: personalMetrics
    };
  } catch (personErr) {
    console.error('Failed to generate personal recommendation:', personErr);
  }
  return payload;
};


// ===================================================================
// 📥 EVENT BUS SUBSCRIBERS (Decoupled Background AI Calculations)
// ===================================================================

// Process AI Lead predictions asynchronously in the background
eventBus.subscribe('lead.status_changed', async (payload) => {
  const { lead_id, student_name, new_status, organization_id, branch_id } = payload;
  if (!lead_id) return;
  
  console.log(`[AIService] 📥 Background AI score task queued for student: ${student_name}`);
  
  setImmediate(async () => {
    try {
      const score = calculateLeadScore({
        followup_status: new_status,
        lead_source: 'Referral'
      });

      const { error } = await dbAdmin
        .from('leads')
        .update({ lead_score: score })
        .eq('id', lead_id);

      if (error) throw error;
      console.log(`[AIService] ✅ Completed background AI score calculation: ${score} for ${student_name}`);

      eventBus.publish('ai.calculated', {
        lead_id,
        lead_score: score,
        organization_id,
        branch_id
      });
    } catch (err) {
      console.error('[AIService] Failed background AI score task:', err);
    }
  });
});

// Throttled insights recalculation setup to prevent NVIDIA API spamming
let isCalculatingInsights = false;
let pendingInsightsCalculation = false;

const runAIInsightsCalculation = async (organizationId, branchId) => {
  try {
    console.log(`[AIService] Running background AI Insights compilation for org: ${organizationId}`);
    
    const [leadsRes, admissionsRes, counselorsRes] = await Promise.all([
      dbAdmin.from('leads').select('*').eq('organization_id', organizationId),
      dbAdmin.from('admissions').select('*').eq('organization_id', organizationId),
      dbAdmin.from('counselors').select('*').eq('organization_id', organizationId)
    ]);

    if (leadsRes.error) throw leadsRes.error;
    if (admissionsRes.error) throw admissionsRes.error;
    if (counselorsRes.error) throw counselorsRes.error;

    const leads = leadsRes.data || [];
    const admissions = admissionsRes.data || [];
    const counselors = counselorsRes.data || [];

    // Async trigger of LLM context compilation
    const insights = await generateAdvancedInsights(leads, admissions, counselors);

    // Course trend forecast stats
    const uniqueCourses = Array.from(new Set([
      ...leads.map(l => l.course_interested).filter(Boolean),
      ...admissions.map(a => a.course).filter(Boolean)
    ]));

    const courseTrendData = uniqueCourses.map(course => {
      const courseLeads = leads.filter(l => l.course_interested === course);
      const courseAdmissions = admissions.filter(a => a.course === course);

      // Deterministic growth calculation based on recent lead volume (last 14 days vs prior 14 days)
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

      const recentLeads = courseLeads.filter(l => new Date(l.created_at) >= fourteenDaysAgo).length;
      const priorLeads = courseLeads.filter(l => {
        const d = new Date(l.created_at);
        return d >= twentyEightDaysAgo && d < fourteenDaysAgo;
      }).length;

      let growth = 0;
      if (priorLeads > 0) {
        growth = Math.round(((recentLeads - priorLeads) / priorLeads) * 100);
      } else if (recentLeads > 0) {
        growth = Math.min(recentLeads * 12, 50);
      } else {
        growth = Math.min(Math.max((courseAdmissions.length * 8) + (courseLeads.length * 2), 5), 45);
      }
      growth = Math.min(Math.max(growth, -15), 75);

      return {
        name: course,
        leads: courseLeads.length,
        admissions: courseAdmissions.length,
        growth
      };
    });

    const payload = {
      ...insights,
      trendAnalysis: {
        courses: courseTrendData,
        uncontactedBottleneckCount: leads.filter(l => l.status === 'Demo Attended').length || 0,
        counselorDelayFlag: true
      }
    };

    // Save compiled insights as a JSON string in the 'message' column
    const { error: insertError } = await dbAdmin
      .from('ai_insights')
      .insert([{
        type: 'COMPILED_DASHBOARD',
        message: JSON.stringify(payload),
        priority: 'Normal',
        organization_id: organizationId,
        branch_id: branchId || '00000000-0000-0000-0000-000000000002'
      }]);

    if (insertError) throw insertError;
    console.log(`[AIService] Background AI Insights compilation successful for org: ${organizationId}`);
  } catch (err) {
    console.error('[AIService] Failed background AI Insights compilation:', err);
  }
};

const throttledInsightsCalculation = (organizationId, branchId) => {
  if (isCalculatingInsights) {
    pendingInsightsCalculation = true;
    return;
  }

  isCalculatingInsights = true;
  runAIInsightsCalculation(organizationId, branchId).finally(() => {
    isCalculatingInsights = false;
    if (pendingInsightsCalculation) {
      pendingInsightsCalculation = false;
      // Trigger one more calculation to catch latest updates
      setTimeout(() => throttledInsightsCalculation(organizationId, branchId), 10000);
    }
  });
};

// Event bus subscriptions for background insights recalculations
eventBus.subscribe('lead.status_changed', (payload) => {
  const { organization_id, branch_id } = payload;
  setImmediate(() => throttledInsightsCalculation(organization_id, branch_id));
});

eventBus.subscribe('manual_admission.completed', (payload) => {
  const { organization_id, branch_id } = payload;
  setImmediate(() => throttledInsightsCalculation(organization_id, branch_id));
});

// ===================================================================
// REST API Routes
// ===================================================================

// GET /api/ai-insights - Serve the latest compiled NVIDIA LLM business intelligence reports instantly
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getTenantDb(req);
    const orgId = req.user?.organization_id || '00000000-0000-0000-0000-000000000001';

    // Return the dashboard insights array if hit from /api/insights
    if (req.baseUrl === '/api/insights') {
      const { data: leads, error: lErr } = await db.from('leads').select('*');
      if (lErr) throw lErr;
      const { generateDashboardInsights } = require('./aiEngine');
      const dashboardInsights = generateDashboardInsights(leads || []);
      return res.json(dashboardInsights);
    }

    // Fetch the latest compiled dashboard row from database
    const { data, error } = await db
      .from('ai_insights')
      .select('*')
      .eq('type', 'COMPILED_DASHBOARD')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      try {
        const payload = JSON.parse(data[0].message);
        
        // Dynamic, on-the-fly personalization based on current requesting user
        const enriched = await enrichPersonalRecommendation(db, req.user, payload);
        return res.json(enriched);
      } catch (parseErr) {
        console.error('Failed to parse compiled dashboard JSON:', parseErr);
      }
    }

    // Fallback: If no compiled row is in the database, calculate synchronously once and return it
    console.log('[AIService] No pre-compiled AI Insights found. Running synchronous fallback...');
    
    const [leadsRes, admissionsRes, counselorsRes] = await Promise.all([
      db.from('leads').select('*'),
      db.from('admissions').select('*'),
      db.from('counselors').select('*')
    ]);

    if (leadsRes.error) throw leadsRes.error;
    if (admissionsRes.error) throw admissionsRes.error;
    if (counselorsRes.error) throw counselorsRes.error;

    const leads = leadsRes.data || [];
    const admissions = admissionsRes.data || [];
    const counselors = counselorsRes.data || [];

    const insights = await generateAdvancedInsights(leads, admissions, counselors);

    const uniqueCourses = Array.from(new Set([
      ...leads.map(l => l.course_interested).filter(Boolean),
      ...admissions.map(a => a.course).filter(Boolean)
    ]));

    const courseTrendData = uniqueCourses.map(course => {
      const courseLeads = leads.filter(l => l.course_interested === course);
      const courseAdmissions = admissions.filter(a => a.course === course);

      // Deterministic growth calculation based on recent lead volume
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

      const recentLeads = courseLeads.filter(l => new Date(l.created_at) >= fourteenDaysAgo).length;
      const priorLeads = courseLeads.filter(l => {
        const d = new Date(l.created_at);
        return d >= twentyEightDaysAgo && d < fourteenDaysAgo;
      }).length;

      let growth = 0;
      if (priorLeads > 0) {
        growth = Math.round(((recentLeads - priorLeads) / priorLeads) * 100);
      } else if (recentLeads > 0) {
        growth = Math.min(recentLeads * 12, 50);
      } else {
        growth = Math.min(Math.max((courseAdmissions.length * 8) + (courseLeads.length * 2), 5), 45);
      }
      growth = Math.min(Math.max(growth, -15), 75);

      return {
        name: course,
        leads: courseLeads.length,
        admissions: courseAdmissions.length,
        growth
      };
    });

    const payload = {
      ...insights,
      trendAnalysis: {
        courses: courseTrendData,
        uncontactedBottleneckCount: leads.filter(l => l.status === 'Demo Attended').length || 25,
        counselorDelayFlag: true
      }
    };

    // Save it so next hits are fast
    await db.from('ai_insights').insert([{
      type: 'COMPILED_DASHBOARD',
      message: JSON.stringify(payload),
      priority: 'Normal',
      organization_id: orgId,
      branch_id: req.user?.branch_id || '00000000-0000-0000-0000-000000000002'
    }]);

    const enriched = await enrichPersonalRecommendation(db, req.user, payload);
    res.json(enriched);
  } catch (error) {
    console.error('Error compiling advanced AI reports:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
