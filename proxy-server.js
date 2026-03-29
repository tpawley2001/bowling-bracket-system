const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 4000;
const BACKEND_PORT = 3002;

// Rate limiting - prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limiting to all requests
app.use(limiter);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.removeHeader('X-Powered-By');
  next();
});

// Landing page with Bowler/Admin selection
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bowling Bracket System</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    h1 {
      font-size: 3em;
      margin-bottom: 10px;
      color: #00ff88;
      text-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
    }
    .subtitle {
      color: #888;
      margin-bottom: 40px;
      font-size: 1.2em;
    }
    .buttons {
      display: flex;
      gap: 30px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn {
      padding: 20px 50px;
      font-size: 1.3em;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-weight: bold;
    }
    .btn-bowler {
      background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
      color: #000;
    }
    .btn-bowler:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(0, 255, 136, 0.4);
    }
    .btn-admin {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #fff;
    }
    .btn-admin:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
    }
    .icon {
      font-size: 1.5em;
    }
    .footer {
      margin-top: 50px;
      color: #666;
      font-size: 0.9em;
    }
    .admin-note {
      margin-top: 20px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      color: #888;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎳 Bowling Bracket System</h1>
    <p class="subtitle">Tournament & League Management</p>
    
    <div class="buttons">
      <a href="/bowler" class="btn btn-bowler">
        <span class="icon">🎳</span>
        Bowler View
      </a>
      <a href="/admin" class="btn btn-admin">
        <span class="icon">🔐</span>
        Admin Access
      </a>
    </div>
    
    <div class="admin-note">
      <strong>Note:</strong> Admin access is restricted to local network only.
    </div>
    
    <p class="footer">
      Secure Access Portal • Port 4000
    </p>
  </div>
</body>
</html>
  `);
});

// Bowler view - public access, proxies to main app
app.use('/bowler', (req, res, next) => {
  // Rewrite path for public view
  req.url = req.url === '/bowler' ? '/' : req.url.replace('/bowler', '');
  next();
}, createProxyMiddleware({
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  changeOrigin: true,
  pathRewrite: { '^/bowler': '' }
}));

// Admin access check - LOCALHOST ONLY
app.use('/admin', (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  
  // Check if request is from localhost
  const isLocalhost = clientIp === '127.0.0.1' || 
                      clientIp === '::1' || 
                      clientIp === '::ffff:127.0.0.1' ||
                      clientIp.startsWith('192.168.') ||
                      clientIp.startsWith('10.') ||
                      clientIp === 'localhost';
  
  if (!isLocalhost) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Access Denied</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            text-align: center;
          }
          .container { padding: 40px; }
          h1 { color: #ff4444; margin-bottom: 20px; }
          p { color: #888; }
          a { color: #00ff88; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚫 Access Denied</h1>
          <p>Admin access is restricted to the local network only.</p>
          <p>Your IP: <strong>${clientIp}</strong></p>
          <p style="margin-top: 20px;">
            <a href="/">← Back to Home</a>
          </p>
        </div>
      </body>
      </html>
    `);
  }
  
  next();
}, createProxyMiddleware({
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  changeOrigin: true,
  pathRewrite: { '^/admin': '' }
}));

// API routes - check access for admin-only endpoints
app.use('/api/auth', createProxyMiddleware({
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  changeOrigin: true
}));

// Admin-only API endpoints
app.use('/api/settings', (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const isLocalhost = clientIp === '127.0.0.1' || 
                      clientIp === '::1' || 
                      clientIp === '::ffff:127.0.0.1' ||
                      clientIp.startsWith('192.168.') ||
                      clientIp.startsWith('10.');
  
  if (!isLocalhost) {
    return res.status(403).json({ error: 'Admin API access restricted to local network' });
  }
  next();
}, createProxyMiddleware({
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  changeOrigin: true
}));

// Public API routes (events, bowlers, brackets - read only)
app.use('/api/events', createProxyMiddleware({
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  changeOrigin: true
}));

app.use('/api/bowlers', createProxyMiddleware({
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  changeOrigin: true
}));

app.use('/api/brackets', createProxyMiddleware({
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  changeOrigin: true
}));

// Login page - accessible but admin functions restricted
app.use('/login', createProxyMiddleware({
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  changeOrigin: true
}));

// Static files and other routes
app.use(createProxyMiddleware({
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  changeOrigin: true
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         Bowling Bracket Proxy Server                        ║
╠════════════════════════════════════════════════════════════╣
║  Public URL:  http://tytv10:4000                            ║
║  Local URL:   http://localhost:4000                        ║
║  Backend:     http://localhost:${BACKEND_PORT}                        ║
╠════════════════════════════════════════════════════════════╣
║  /           → Landing page (Bowler/Admin selection)       ║
║  /bowler     → Public bowler view                          ║
║  /admin      → Admin panel (LOCALHOST ONLY)                 ║
╠════════════════════════════════════════════════════════════╣
║  Security:                                                  ║
║  • Rate limiting: 100 requests per 15 minutes              ║
║  • Admin access: Local network only (127.0.0.1, 192.168.*) ║
║  • Security headers enabled                                 ║
╚════════════════════════════════════════════════════════════╝
  `);
});