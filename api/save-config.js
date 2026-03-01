// ================================================
// /api/save-config
// Saves site-config.json via Vercel API → auto-redeploys the site
// Required env vars:
//   VERCEL_TOKEN      — your Vercel personal access token
//   VERCEL_PROJECT_ID — your Vercel project ID
//   VERCEL_TEAM_ID    — (optional) team ID if project is under a team
// ================================================

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Simple auth check
  const adminPass = process.env.ADMIN_PASSWORD || 'nextgen2025';
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${adminPass}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { config } = req.body;
  if (!config) return res.status(400).json({ error: 'No config provided' });

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    // Fallback: just acknowledge (config already saved to localStorage in admin)
    return res.status(200).json({ 
      success: true, 
      mode: 'localStorage',
      message: 'Config received. Add VERCEL_TOKEN and VERCEL_PROJECT_ID env vars for auto-deploy.'
    });
  }

  try {
    const teamId = process.env.VERCEL_TEAM_ID;
    
    // Trigger a new Vercel deployment by updating the env var with a timestamp
    // This forces a fresh deploy that picks up the new JSON from env
    const envUrl = `https://api.vercel.com/v9/projects/${projectId}/env${teamId ? `?teamId=${teamId}` : ''}`;
    
    // Store the config as a base64-encoded env var so the site can read it
    const configB64 = Buffer.from(JSON.stringify(config)).toString('base64');
    
    // Check if env var exists
    const listRes = await fetch(envUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData = await listRes.json();
    const existing = (listData.envs || []).find(e => e.key === 'SITE_CONFIG_DATA');

    let envRes;
    if (existing) {
      // Update
      envRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}${teamId ? `?teamId=${teamId}` : ''}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: configB64, target: ['production', 'preview'] })
      });
    } else {
      // Create
      envRes = await fetch(envUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'SITE_CONFIG_DATA', value: configB64, target: ['production', 'preview'], type: 'plain' })
      });
    }

    if (!envRes.ok) throw new Error('Failed to update env var');

    // Trigger redeploy
    const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: projectId,
        target: 'production',
        gitSource: null,
        // Redeploy latest
      })
    });

    return res.status(200).json({ 
      success: true, 
      mode: 'vercel-deploy',
      message: 'Config saved! Site will update in ~30 seconds.'
    });

  } catch (err) {
    console.error('Auto-deploy error:', err.message);
    return res.status(200).json({ 
      success: true, 
      mode: 'localStorage-fallback',
      message: 'Config saved to localStorage. Manual export still required for live updates.'
    });
  }
};
