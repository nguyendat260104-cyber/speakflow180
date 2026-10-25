// Vercel Serverless Function: /api/sync
// SpeakFlow 180 - Cloud Sync & Study Cache Service

// In-memory serverless cache store (keyed by userId/email)
const progressStore = new Map();

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const userId = req.query.userId || req.query.email;
    if (userId && progressStore.has(userId)) {
      const data = progressStore.get(userId);
      return res.status(200).json({
        success: true,
        source: 'vercel_serverless_cache',
        data: data.state,
        lastSynced: data.lastSynced,
        user: data.user
      });
    }
    return res.status(200).json({
      status: 'active',
      service: 'SpeakFlow 180 Cloud Sync API',
      timestamp: new Date().toISOString(),
      registeredUsers: progressStore.size
    });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { action, userId, email, state, user, githubToken, gistId } = body || {};

      if (!userId && !email) {
        return res.status(400).json({ error: 'Missing userId or email identifier' });
      }

      const key = (userId || email).toLowerCase().trim();

      // Action 1: Save progress to Vercel Serverless Cache
      if (action === 'save' || !action) {
        const syncTimestamp = new Date().toISOString();
        progressStore.set(key, {
          state: state || {},
          user: user || {},
          lastSynced: syncTimestamp
        });

        // If GitHub Token is supplied, push directly to GitHub Gist
        let githubResult = null;
        if (githubToken && githubToken.length > 10) {
          try {
            githubResult = await pushToGitHubGist(githubToken, gistId, {
              user: user || { id: key },
              state: state || {},
              syncedAt: syncTimestamp
            });
          } catch (ghErr) {
            console.warn('GitHub sync error in API:', ghErr);
          }
        }

        return res.status(200).json({
          success: true,
          syncedAt: syncTimestamp,
          itemsCount: state ? Object.keys(state).length : 0,
          github: githubResult,
          message: 'Tiến độ học tập đã được đồng bộ lên Đám mây Vercel thành công!'
        });
      }

      // Action 2: Pull progress from Vercel Serverless Cache
      if (action === 'pull') {
        if (!progressStore.has(key)) {
          return res.status(404).json({
            success: false,
            message: 'Chưa có bản sao lưu đám mây nào cho tài khoản này trên máy chủ.'
          });
        }
        const cached = progressStore.get(key);
        return res.status(200).json({
          success: true,
          data: cached.state,
          lastSynced: cached.lastSynced,
          user: cached.user
        });
      }

      return res.status(400).json({ error: 'Invalid action: ' + action });
    } catch (err) {
      console.error('Sync API Error:', err);
      return res.status(500).json({ error: 'Server error: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// GitHub Gist API Helper
async function pushToGitHubGist(token, existingGistId, payload) {
  const fileContent = JSON.stringify(payload, null, 2);
  const files = {
    'speakflow_180_cloud_progress.json': {
      content: fileContent
    }
  };

  if (existingGistId) {
    // Update existing Gist
    const resp = await fetch(`https://api.github.com/gists/${existingGistId}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'SpeakFlow-180-Sync'
      },
      body: JSON.stringify({
        description: `SpeakFlow 180 Study Progress Backup [Auto-synced: ${payload.syncedAt}]`,
        files
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      return { gistId: data.id, htmlUrl: data.html_url, status: 'updated' };
    }
  }

  // Create new Secret Gist
  const createResp = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'SpeakFlow-180-Sync'
    },
    body: JSON.stringify({
      description: `SpeakFlow 180 Study Progress Backup [Created: ${payload.syncedAt}]`,
      public: false,
      files
    })
  });

  if (createResp.ok) {
    const data = await createResp.json();
    return { gistId: data.id, htmlUrl: data.html_url, status: 'created' };
  }

  return { error: 'GitHub API call returned ' + createResp.status };
}
