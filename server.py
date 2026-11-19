from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import base64
import os
import secrets
from datetime import datetime
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
CONTENT_FILE = ROOT / 'content.json'
LEADS_FILE = ROOT / 'leads.json'
UPLOADS_DIR = ROOT / 'uploads'
ADMIN_PASSWORD = os.environ.get('SKANDINAV_ADMIN_PASSWORD', 'skandinav-demo')
SESSIONS = set()
DEFAULT_CONTENT = {
    'company': {'phone': '+7 495 123-45-67', 'email': 'hello@skandinav.house', 'telegram': 'https://t.me/', 'whatsapp': 'https://wa.me/74951234567', 'hours': 'Пн—Пт · 09:00—19:00', 'region': 'Москва и область'},
    'heroImage': 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1500&q=85',
    'projects': [
        {'title': 'Тихий берег', 'description': 'Дом для спокойной жизни у воды', 'location': 'Истринское водохранилище', 'details': '240 м² · 2024', 'status': 'Реализован', 'image': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', 'gallery': []},
        {'title': 'Дом в соснах', 'description': '', 'location': 'Калужская область', 'details': '180 м² · 2023', 'status': 'В работе', 'image': 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=80', 'gallery': []},
        {'title': 'Северный свет', 'description': '', 'location': 'Новорижское ш.', 'details': '320 м² · 2022', 'status': 'Реализован', 'image': 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80', 'gallery': []},
    ],
}

def read_content():
    if not CONTENT_FILE.exists():
        return DEFAULT_CONTENT
    try:
        return json.loads(CONTENT_FILE.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return DEFAULT_CONTENT

def read_leads():
    if not LEADS_FILE.exists():
        return []
    try:
        return json.loads(LEADS_FILE.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return []

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path == '/api/session':
            self.send_json({'authenticated': self.is_authenticated()})
            return
        if self.path == '/api/content':
            self.send_json(read_content())
            return
        if self.path == '/api/leads':
            if not self.is_authenticated():
                self.send_error(401)
                return
            self.send_json(read_leads())
            return
        super().do_GET()

    def do_PUT(self):
        if self.path != '/api/content' or not self.is_authenticated():
            self.send_error(404)
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            content = json.loads(self.rfile.read(length).decode('utf-8'))
            CONTENT_FILE.write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding='utf-8')
            self.send_json({'ok': True})
        except (ValueError, json.JSONDecodeError, OSError):
            self.send_error(400, 'Invalid content payload')

    def do_POST(self):
        if self.path == '/api/leads':
            length = int(self.headers.get('Content-Length', '0'))
            try:
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
                if not payload.get('name') or not payload.get('phone'):
                    raise ValueError('name and phone are required')
                leads = read_leads()
                leads.insert(0, {'id': secrets.token_urlsafe(10), 'name': str(payload['name'])[:120], 'phone': str(payload['phone'])[:80], 'type': str(payload.get('type', ''))[:120], 'status': 'Новая', 'createdAt': datetime.now().isoformat(timespec='minutes')})
                LEADS_FILE.write_text(json.dumps(leads, ensure_ascii=False, indent=2), encoding='utf-8')
                self.send_json({'ok': True})
            except (ValueError, json.JSONDecodeError, OSError):
                self.send_error(400, 'Invalid lead payload')
            return
        if self.path == '/api/login':
            length = int(self.headers.get('Content-Length', '0'))
            try:
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
            except (ValueError, json.JSONDecodeError):
                self.send_error(400)
                return
            if payload.get('password') != ADMIN_PASSWORD:
                self.send_json({'ok': False}, status=401)
                return
            token = secrets.token_urlsafe(32)
            SESSIONS.add(token)
            self.send_json({'ok': True}, headers={'Set-Cookie': f'skandinav_session={token}; Path=/; HttpOnly; SameSite=Lax'})
            return
        if self.path == '/api/logout':
            token = self.cookies().get('skandinav_session')
            SESSIONS.discard(token)
            self.send_json({'ok': True}, headers={'Set-Cookie': 'skandinav_session=; Path=/; Max-Age=0'})
            return
        if self.path == '/api/upload':
            if not self.is_authenticated():
                self.send_error(401)
                return
            length = int(self.headers.get('Content-Length', '0'))
            try:
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
                data = payload['data'].split(',', 1)[1]
                extension = payload.get('extension', 'jpg').lower().replace('.', '')
                if extension not in {'jpg', 'jpeg', 'png', 'webp', 'gif'}:
                    raise ValueError('unsupported extension')
                filename = f'{secrets.token_hex(12)}.{extension}'
                UPLOADS_DIR.mkdir(exist_ok=True)
                (UPLOADS_DIR / filename).write_bytes(base64.b64decode(data))
                self.send_json({'ok': True, 'url': f'/uploads/{filename}'})
            except (ValueError, KeyError, base64.binascii.Error, OSError):
                self.send_error(400, 'Invalid image payload')
            return
        self.send_error(404)

    def do_PATCH(self):
        if self.path.startswith('/api/leads/') and self.is_authenticated():
            lead_id = self.path.rsplit('/', 1)[-1]
            try:
                length = int(self.headers.get('Content-Length', '0'))
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
                leads = read_leads()
                for lead in leads:
                    if lead.get('id') == lead_id:
                        status = payload.get('status', lead.get('status', 'Новая'))
                        if status not in {'Новая', 'В работе', 'Закрыта'}:
                            raise ValueError('Invalid lead status')
                        lead['status'] = status
                        break
                LEADS_FILE.write_text(json.dumps(leads, ensure_ascii=False, indent=2), encoding='utf-8')
                self.send_json({'ok': True})
            except (ValueError, json.JSONDecodeError, OSError):
                self.send_error(400)
            return
        self.send_error(404)

    def cookies(self):
        raw = self.headers.get('Cookie', '')
        return dict(item.strip().split('=', 1) for item in raw.split(';') if '=' in item)

    def is_authenticated(self):
        return self.cookies().get('skandinav_session') in SESSIONS

    def send_json(self, payload, status=200, headers=None):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    port = 8000
    print(f'Skandinav site: http://localhost:{port}')
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
