// Vercel Serverless Function: /api/sync
// SpeakFlow 180 - Auto Cloud & GitHub Repository Sync Service

// Fast in-memory serverless cache store (keyed by userId/email)
const progressStore = new Map();

const GITHUB_REPO = process.env.GITHUB_SYNC_REPO || 'nguyendat260104-cyber/speakflow180';
const GITHUB_TOKEN = process.env.GITHUB_SYNC_TOKEN || '';

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

  // Handle GET: Pull user study cache
  if (req.method === 'GET') {
    const rawId = req.query.userId || req.query.email;
    if (rawId) {
      const key = cleanKey(rawId);

      // 1. Check in-memory cache first
      if (progressStore.has(key)) {
        const cached = progressStore.get(key);
        return res.status(200).json({
          success: true,
          source: 'vercel_serverless_cache',
          data: cached.state,
          lastSynced: cached.lastSynced,
          user: cached.user
        });
      }

      // 2. Fallback: Pull directly from GitHub Repository if token available
      if (GITHUB_TOKEN) {
        try {
          const ghData = await pullFromGitHubRepo(key);
          if (ghData && ghData.state) {
            progressStore.set(key, {
              state: ghData.state,
              user: ghData.user || {},
              lastSynced: ghData.lastSynced || new Date().toISOString()
            });
            return res.status(200).json({
              success: true,
              source: 'github_repository_sync',
              data: ghData.state,
              lastSynced: ghData.lastSynced,
              user: ghData.user
            });
          }
        } catch (err) {
          console.warn('Error pulling from GitHub repo:', err.message);
        }
      }

      return res.status(404).json({
        success: false,
        message: 'Chưa tìm thấy dữ liệu học tập của tài khoản này trên máy chủ.'
      });
    }

    return res.status(200).json({
      status: 'active',
      service: 'SpeakFlow 180 Cloud & GitHub Sync Service',
      repository: GITHUB_REPO,
      githubConnected: Boolean(GITHUB_TOKEN),
      timestamp: new Date().toISOString(),
      activeUsersInMemory: progressStore.size
    });
  }

  // Handle POST: Save progress, auto-push to GitHub repository
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { action, userId, email, state, user, githubToken, gistId } = body || {};

      if (!userId && !email) {
        return res.status(400).json({ error: 'Missing userId or email identifier' });
      }

      const key = cleanKey(userId || email);
      const syncTimestamp = new Date().toISOString();

      if (action === 'save' || !action) {
        // 1. Update in-memory serverless cache
        progressStore.set(key, {
          state: state || {},
          user: user || {},
          lastSynced: syncTimestamp
        });

        // 2. Automatically push user data to GitHub Repository
        let repoPushResult = null;
        if (GITHUB_TOKEN) {
          try {
            repoPushResult = await pushToGitHubRepo(key, {
              userId: key,
              user: user || { id: key },
              lastSynced: syncTimestamp,
              stats: {
                streak: state?.streak || 1,
                xp: state?.xp || 0,
                vocabCount: state?.vocabVault ? state.vocabVault.length : 0,
                activeTab: state?.activeTab || 'tab-dashboard'
              },
              state: state || {}
            });
          } catch (ghRepoErr) {
            console.warn('GitHub Repository push error:', ghRepoErr.message);
            repoPushResult = { error: ghRepoErr.message };
          }
        }

        // 3. Optional: Push to user's personal GitHub Gist if provided
        let gistResult = null;
        if (githubToken && githubToken.length > 10) {
          try {
            gistResult = await pushToGitHubGist(githubToken, gistId, {
              user: user || { id: key },
              state: state || {},
              syncedAt: syncTimestamp
            });
          } catch (gistErr) {
            console.warn('Gist sync error:', gistErr.message);
          }
        }

        return res.status(200).json({
          success: true,
          syncedAt: syncTimestamp,
          repository: GITHUB_REPO,
          repoSynced: Boolean(repoPushResult && !repoPushResult.error),
          repoDetails: repoPushResult,
          githubGist: gistResult,
          message: 'Tiến độ học tập đã được tự động lưu lên Đám mây Vercel & GitHub Repository!'
        });
      }

      if (action === 'pull') {
        if (progressStore.has(key)) {
          const cached = progressStore.get(key);
          return res.status(200).json({
            success: true,
            source: 'vercel_serverless_cache',
            data: cached.state,
            lastSynced: cached.lastSynced,
            user: cached.user
          });
        }

        if (GITHUB_TOKEN) {
          const ghData = await pullFromGitHubRepo(key);
          if (ghData && ghData.state) {
            return res.status(200).json({
              success: true,
              source: 'github_repository_sync',
              data: ghData.state,
              lastSynced: ghData.lastSynced,
              user: ghData.user
            });
          }
        }

        return res.status(404).json({
          success: false,
          message: 'Chưa có bản sao lưu nào cho tài khoản này.'
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

function cleanKey(input) {
  return String(input).toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '_');
}

// ==================== GITHUB REPOSITORY REST API HELPERS ====================

async function pushToGitHubRepo(userKey, payload) {
  if (!GITHUB_TOKEN) return { error: 'No GITHUB_SYNC_TOKEN set' };

  const filePath = `data/users/${userKey}.json`;
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

  // Step A: Check if file already exists to get its SHA
  let existingSha = undefined;
  try {
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'SpeakFlow180-Sync'
      }
    });
    if (getRes.ok) {
      const data = await getRes.json();
      existingSha = data.sha;
    }
  } catch (e) {}

  // Step B: Commit new/updated user data file
  const jsonContent = JSON.stringify(payload, null, 2);
  const base64Content = Buffer.from(jsonContent, 'utf8').toString('base64');

  const commitBody = {
    message: `sync: update study progress for ${payload.user?.email || userKey}`,
    content: base64Content,
    branch: 'main'
  };
  if (existingSha) commitBody.sha = existingSha;

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'SpeakFlow180-Sync'
    },
    body: JSON.stringify(commitBody)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    return { error: `GitHub API error (${putRes.status}): ${errText}` };
  }

  const putData = await putRes.json();

  // Step C: Update users registry index (fire and forget)
  updateUsersRegistry(payload).catch(e => console.warn('Registry update warning:', e.message));

  return {
    filePath,
    commitSha: putData.commit?.sha,
    htmlUrl: `https://github.com/${GITHUB_REPO}/blob/main/${filePath}`,
    status: existingSha ? 'updated' : 'created'
  };
}

async function pullFromGitHubRepo(userKey) {
  if (!GITHUB_TOKEN) return null;

  const filePath = `data/users/${userKey}.json`;
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'SpeakFlow180-Sync'
    }
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.content) return null;

  const decoded = Buffer.from(data.content, 'base64').toString('utf8');
  return JSON.parse(decoded);
}

async function updateUsersRegistry(userPayload) {
  if (!GITHUB_TOKEN) return;

  const registryPath = 'data/users-registry.json';
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${registryPath}`;

  let existingSha = undefined;
  let registry = {};

  try {
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'SpeakFlow180-Sync'
      }
    });
    if (getRes.ok) {
      const data = await getRes.json();
      existingSha = data.sha;
      const decoded = Buffer.from(data.content, 'base64').toString('utf8');
      registry = JSON.parse(decoded);
    }
  } catch (e) {}

  const userKey = userPayload.userId;
  registry[userKey] = {
    name: userPayload.user?.name || 'Học Viên',
    email: userPayload.user?.email || userKey,
    role: userPayload.user?.role || 'Chung',
    streak: userPayload.stats?.streak || 1,
    xp: userPayload.stats?.xp || 0,
    vocabCount: userPayload.stats?.vocabCount || 0,
    lastSynced: userPayload.lastSynced,
    dataPath: `data/users/${userKey}.json`
  };

  const jsonContent = JSON.stringify(registry, null, 2);
  const commitBody = {
    message: `registry: update active learner ${userKey}`,
    content: Buffer.from(jsonContent, 'utf8').toString('base64'),
    branch: 'main'
  };
  if (existingSha) commitBody.sha = existingSha;

  await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'SpeakFlow180-Sync'
    },
    body: JSON.stringify(commitBody)
  });
}

// ==================== GITHUB GIST HELPER (OPTIONAL PERSONAL BACKUP) ====================

async function pushToGitHubGist(token, existingGistId, payload) {
  const fileContent = JSON.stringify(payload, null, 2);
  const files = {
    'speakflow_180_cloud_progress.json': {
      content: fileContent
    }
  };

  if (existingGistId) {
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
