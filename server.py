#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

PORT = 8000
HOST = "127.0.0.1"


class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Expires', '0')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        super().end_headers()


class ReuseAddrTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


os.chdir(os.path.dirname(os.path.abspath(__file__)))

try:
    with ReuseAddrTCPServer((HOST, PORT), MyHTTPRequestHandler) as httpd:
        print(f"Server running at http://{HOST}:{PORT}/")
        print(f"Open http://{HOST}:{PORT}/ in your browser")
        print("Press Ctrl+C to stop")
        httpd.serve_forever()
except OSError as exc:
    if exc.errno == 98:
        print(f"Error: port {PORT} is already in use.", file=sys.stderr)
        print(f"Stop the other process with: fuser -k {PORT}/tcp", file=sys.stderr)
        print(f"Or find it with: ss -tlnp | grep ':{PORT}'", file=sys.stderr)
    raise SystemExit(1) from exc
