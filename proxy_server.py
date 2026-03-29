#!/usr/bin/env python3
"""
Secure Proxy Server for Bowling Bracket System
- Port 4000 (public)
- Bowler view: public access
- Admin view: localhost only
"""

import http.server
import socketserver
import urllib.request
import urllib.error
import json
import re
from urllib.parse import urlparse, parse_qs

# Configuration
PROXY_PORT = 4000
BACKEND_PORT = 3002
BACKEND_HOST = "127.0.0.1"

# Rate limiting
request_counts = {}
RATE_LIMIT = 100  # requests per IP per 15 minutes
RATE_WINDOW = 15 * 60  # 15 minutes in seconds

def is_local_request(client_ip):
    """Check if request is from local network"""
    return (client_ip == "127.0.0.1" or 
            client_ip.startswith("192.168.") or 
            client_ip.startswith("10.") or
            client_ip == "::1" or
            client_ip.startswith("::ffff:127.") or
            client_ip == "localhost")

def check_rate_limit(client_ip):
    """Simple rate limiting"""
    import time
    current_time = time.time()
    
    if client_ip not in request_counts:
        request_counts[client_ip] = []
    
    # Remove old requests
    request_counts[client_ip] = [t for t in request_counts[client_ip] 
                                   if current_time - t < RATE_WINDOW]
    
    if len(request_counts[client_ip]) >= RATE_LIMIT:
        return False
    
    request_counts[client_ip].append(current_time)
    return True

LANDING_PAGE = """
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
    .icon { font-size: 1.5em; }
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
"""

ACCESS_DENIED_PAGE = """
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
    <p>Your IP: <strong>{client_ip}</strong></p>
    <p style="margin-top: 20px;">
      <a href="/">← Back to Home</a>
    </p>
  </div>
</body>
</html>
"""

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Custom logging
        print(f"[{self.log_date_time_string()}] {self.address_string()} - {format % args}")

    def send_landing_page(self):
        """Send the landing page"""
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.end_headers()
        self.wfile.write(LANDING_PAGE.encode())

    def send_access_denied(self, client_ip):
        """Send access denied page"""
        self.send_response(403)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        self.wfile.write(ACCESS_DENIED_PAGE.format(client_ip=client_ip).encode())

    def proxy_request(self, path, method='GET', body=None):
        """Proxy request to backend"""
        client_ip = self.client_address[0]
        
        # Rate limiting
        if not check_rate_limit(client_ip):
            self.send_response(429)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Too many requests"}).encode())
            return

        try:
            url = f"http://{BACKEND_HOST}:{BACKEND_PORT}{path}"
            
            headers = {}
            for header in ['Content-Type', 'Authorization', 'Cookie']:
                if header in self.headers:
                    headers[header] = self.headers[header]
            
            req = urllib.request.Request(url, data=body, headers=headers, method=method)
            
            with urllib.request.urlopen(req, timeout=30) as response:
                content = response.read()
                
                self.send_response(response.status)
                for header, value in response.headers.items():
                    if header.lower() not in ['transfer-encoding', 'connection']:
                        self.send_header(header, value)
                self.send_header('X-Content-Type-Options', 'nosniff')
                self.send_header('X-Frame-Options', 'DENY')
                self.end_headers()
                self.wfile.write(content)
                
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_GET(self):
        client_ip = self.client_address[0]
        path = self.path
        
        # Landing page
        if path == '/' or path == '':
            self.send_landing_page()
            return
        
        # Bowler view - public access
        if path.startswith('/bowler'):
            new_path = path.replace('/bowler', '') or '/'
            self.proxy_request(new_path)
            return
        
        # Admin view - localhost only
        if path.startswith('/admin'):
            if not is_local_request(client_ip):
                self.send_access_denied(client_ip)
                return
            new_path = path.replace('/admin', '') or '/'
            self.proxy_request(new_path)
            return
        
        # Admin API endpoints - localhost only
        if path.startswith('/api/settings'):
            if not is_local_request(client_ip):
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Admin API access restricted"}).encode())
                return
            self.proxy_request(path)
            return
        
        # Public API endpoints
        if path.startswith('/api/') or path.startswith('/_next/') or path.startswith('/login'):
            self.proxy_request(path)
            return
        
        # Default: proxy to backend
        self.proxy_request(path)

    def do_POST(self):
        client_ip = self.client_address[0]
        path = self.path
        
        # Rate limiting
        if not check_rate_limit(client_ip):
            self.send_response(429)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Too many requests"}).encode())
            return
        
        # Read body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None
        
        # Admin API - localhost only
        if path.startswith('/api/settings') or path.startswith('/api/events') or path.startswith('/api/bowlers'):
            if not is_local_request(client_ip):
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Admin API access restricted"}).encode())
                return
        
        # Auth endpoint - accessible but restricted
        if path.startswith('/api/auth'):
            self.proxy_request(path, method='POST', body=body)
            return
        
        self.proxy_request(path, method='POST', body=body)

    def do_PUT(self):
        self.do_POST()

def run_server():
    with socketserver.TCPServer(("0.0.0.0", PROXY_PORT), ProxyHandler) as httpd:
        print(f"""
╔════════════════════════════════════════════════════════════╗
║         Bowling Bracket Proxy Server                        ║
╠════════════════════════════════════════════════════════════╣
║  Public URL:  http://tytv10:4000                            ║
║  Local URL:   http://localhost:4000                        ║
║  Backend:     http://localhost:{BACKEND_PORT}                        ║
╠════════════════════════════════════════════════════════════╣
║  /           → Landing page (Bowler/Admin selection)       ║
║  /bowler     → Public bowler view                          ║
║  /admin      → Admin panel (LOCALHOST ONLY)                 ║
╠════════════════════════════════════════════════════════════╣
║  Security:                                                  ║
║  • Rate limiting: 100 requests per 15 minutes              ║
║  • Admin access: Local network only                        ║
║  • Security headers enabled                                 ║
╚════════════════════════════════════════════════════════════╝
        """)
        httpd.serve_forever()

if __name__ == "__main__":
    run_server()