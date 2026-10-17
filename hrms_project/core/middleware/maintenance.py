"""Middleware that puts the whole platform into read-only maintenance mode."""
from django.http import HttpResponse, JsonResponse

from core.maintenance import read_maintenance

# Paths that must keep working while the system is being updated.
ALLOWED_PREFIXES = (
    '/api/health/',
    '/api/auth/login/',
    '/api/auth/refresh/',
    '/api/auth/login-users/',
    '/api/auth/login-companies/',
    '/api/system/',
    '/admin/',
    '/static/',
    '/media/',
)

MAINTENANCE_HTML = """<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8">
<title>در حال به‌روزرسانی — Kian ERP</title>
<meta http-equiv="refresh" content="30">
<style>
 body{font-family:Vazirmatn,Tahoma,sans-serif;background:#f8fafc;color:#1e293b;
      display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
 .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px 40px;
       box-shadow:0 20px 50px rgba(99,102,241,.12);text-align:center;max-width:520px}
 h1{font-size:20px;margin:0 0 8px;color:#6366f1}
 p{margin:6px 0;color:#475569;font-size:14px;line-height:1.9}
 .hint{font-size:12px;color:#94a3b8;margin-top:18px}
</style></head>
<body><div class="card">
  <h1>سیستم در حال به‌روزرسانی است</h1>
  <p>لطفاً چند لحظه صبر کنید. این صفحه هر ۳۰ ثانیه خودکار بازخوانی می‌شود.</p>
  <p class="hint">Kian ERP — سامانه یکپارچه مدیریت کسب و کار</p>
</div></body></html>
"""


class MaintenanceModeMiddleware:
    """Return 503 (JSON for the API, HTML for browsers) while maintenance is on."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        info = read_maintenance()
        if not info:
            return self.get_response(request)

        path = request.path or '/'
        if any(path.startswith(prefix) for prefix in ALLOWED_PREFIXES):
            return self.get_response(request)

        payload = {
            'maintenance': True,
            'message': info.get('message') or 'سیستم در حال به‌روزرسانی است.',
            'version': info.get('version', ''),
            'started_at': info.get('started_at'),
            'ends_at': info.get('ends_at'),
        }

        wants_html = 'text/html' in (request.headers.get('Accept') or '')
        if wants_html and not path.startswith('/api/'):
            return HttpResponse(MAINTENANCE_HTML, status=503, content_type='text/html; charset=utf-8')

        response = JsonResponse(payload, status=503)
        response['Retry-After'] = '30'
        return response
