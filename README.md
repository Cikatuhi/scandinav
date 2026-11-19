# Скандинав

Сайт и локальная админка строительной компании «Скандинав».

## Запуск

Требуется Python 3.9+.

```bash
git clone https://github.com/Cikatuhi/scandinav.git
cd scandinav
SKANDINAV_ADMIN_PASSWORD="замените-на-сильный-пароль" python3 server.py
```

Открыть сайт: `http://localhost:8000/index.html`  
Открыть админку: `http://localhost:8000/admin.html`

## Перед публикацией

- запускать только за HTTPS через reverse proxy;
- задать `SKANDINAV_ADMIN_PASSWORD` и не использовать пароль по умолчанию;
- обеспечить постоянное хранилище для `content.json` и `uploads/`;
- настроить резервное копирование `content.json` и загруженных файлов;
- заменить встроенный demo backend на production WSGI/ASGI-сервер или CMS;
- ограничить доступ к `/admin.html` и API дополнительным firewall/rate limit.

GitHub хранит исходный код, но не запускает Python backend и не хранит пользовательские изменения, потому что `content.json` и `uploads/` исключены из Git.
