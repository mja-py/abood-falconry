"""Dev server for the game: the same static files, but never cached, so a reload always runs the code on disk.
Usage: python3 tools/serve.py [port]   (binds 127.0.0.1 only; not used in production, GitHub Pages serves the build)"""
import http.server
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

    def log_message(self, fmt, *args):  # keep the terminal quiet; errors still show
        if args and str(args[1]).startswith(('4', '5')):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8018
    http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
