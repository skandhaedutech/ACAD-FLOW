const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const supabase = require('../db');

/**
 * Helper to generate a tenant-scoped Supabase client dynamically per request.
 * This injects the active user JWT token into the client request headers,
 * which triggers Row-Level Security (RLS) policies inside PostgreSQL natively.
 */
const getTenantDb = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return supabase; // Fallback to global admin client
  }

  const token = authHeader.split(' ')[1];
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: {
      persistSession: false
    },
    realtime: {
      transport: ws
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};

/**
 * Express Middleware to validate Supabase JWT session and extract tenant/role metadata.
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For local development without token, we can mock a default user
    req.user = {
      id: null,
      email: 'local-dev@acadflow.com',
      role: 'Super Admin',
      organization_id: '00000000-0000-0000-0000-000000000001', // Fallback to Default Org
      branch_id: '00000000-0000-0000-0000-000000000002', // Fallback to Default Branch
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired auth session' });
    }

    const userMetadata = user.user_metadata || {};
    
    req.user = {
      id: user.id,
      email: user.email,
      role: userMetadata.role || 'Counselor',
      organization_id: userMetadata.organization_id || '00000000-0000-0000-0000-000000000001',
      branch_id: userMetadata.branch_id || '00000000-0000-0000-0000-000000000002',
    };

    next();
  } catch (err) {
    console.error('Authentication check failed:', err);
    return res.status(500).json({ error: 'Internal Auth Validation Server Error' });
  }
};

/**
 * Express Middleware to restrict endpoints based on counselor roles.
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User context is unauthenticated' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Role privileges exceeded' });
    }
    
    next();
  };
};

module.exports = {
  getTenantDb,
  requireAuth,
  requireRole
};
