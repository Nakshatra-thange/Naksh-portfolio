"""Small local server with HTML5-history route fallback for the portfolio."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit


ROUTES = {
    "/aboutme",
    "/voiceai",
    "/ai-and-me",
    "/fullstack",
    "/essays",
    "/know-me-better",
}


class PortfolioHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = urlsplit(self.path).path.rstrip("/") or "/"
        if path in ROUTES:
            self.path = "/index.html"
        return super().send_head()

    def end_headers(self):
        if urlsplit(self.path).path == "/index.html":
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("Pragma", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8000), PortfolioHandler)
    print("Portfolio ready at http://localhost:8000/")
    server.serve_forever()
