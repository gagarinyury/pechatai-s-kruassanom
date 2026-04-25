# Печатай с Круассаном

Community alpha веб-тренажера слепой печати на русском: регистрация по нику и паролю, 7-дневный курс, сохранение прогресса в SQLite и базовая продуктовая аналитика через Plausible.

## Local Dev

```bash
npm install
npm run dev
```

- Фронт: http://localhost:3000
- API: http://localhost:3001

Для локальной разработки достаточно `.env.example`:

```bash
cp .env.example .env
```

## Local Production Smoke

```bash
npm run typecheck
npm run build
npm run smoke:e2e:desktop
npm run smoke:e2e:mobile
```

Или одним запуском:

```bash
npm run smoke:e2e
```

Smoke поднимает production-сервер локально и проверяет критический путь:
- регистрация нового пользователя
- открытие первого урока
- реальное прохождение упражнения через UI
- unlock следующего упражнения
- reload с сохраненным прогрессом
- logout/login с тем же аккаунтом
- отсутствие browser console errors и page errors

## Production Contract

Production `.env`:

```bash
SESSION_SECRET=replace-with-long-random-secret
DATABASE_PATH=/var/lib/croissant/croissant.sqlite
PORT=3301
COOKIE_SECURE=true
APP_BASE_URL=https://type.profy.top
VITE_PLAUSIBLE_DOMAIN=type.profy.top
VITE_PLAUSIBLE_SCRIPT_SRC=https://plausible.io/js/script.js
```

- `SESSION_SECRET` обязателен в production и не может оставаться дефолтным.
- `DATABASE_PATH` обязателен в production.
- `COOKIE_SECURE=true` обязателен для публичного HTTPS-деплоя.
- `GET /health` возвращает `200 {"ok":true}` и является единственным health endpoint.

Шаблон production env лежит в `.env.production.example`.

## Real VPS Deploy

Релизный baseline:
- домен `type.profy.top`
- DNS `A`-запись `type.profy.top -> 109.199.98.232`
- один процесс `npm run start`
- `nginx + certbot + systemd`
- SQLite вне репозитория

### 1. Подготовить сервер

```bash
mkdir -p /srv/croissant
mkdir -p /var/lib/croissant
mkdir -p /var/backups/croissant
```

Скопировать проект в `/srv/croissant`, затем:

```bash
cd /srv/croissant
npm install
npm run build
cp .env.production.example .env.production
```

Заполнить `.env.production` production-значениями.

### 2. Поднять systemd service

Использовать шаблон [deploy/systemd/croissant.service](/Users/yurygagarin/code/печатай-с-круассаном-🥐/deploy/systemd/croissant.service:1):

```bash
cp deploy/systemd/croissant.service /etc/systemd/system/croissant.service
systemctl daemon-reload
systemctl enable croissant
systemctl restart croissant
systemctl status croissant
```

### 3. Подключить nginx и HTTPS

Использовать шаблон [deploy/nginx/type.profy.top.conf](/Users/yurygagarin/code/печатай-с-круассаном-🥐/deploy/nginx/type.profy.top.conf:1):

```bash
cp deploy/nginx/type.profy.top.conf /etc/nginx/sites-available/type.profy.top
ln -s /etc/nginx/sites-available/type.profy.top /etc/nginx/sites-enabled/type.profy.top
nginx -t
systemctl reload nginx
certbot --nginx -d type.profy.top
```

### 4. Post-Deploy Verification

```bash
curl https://type.profy.top/health
```

Проверить вручную:
- HTTPS открывается без предупреждений
- secure cookie выставляется
- регистрация работает
- logout/login работает
- первый урок проходится
- progress сохраняется после reload
- progress сохраняется после повторного входа
- pageview и product events приходят в Plausible

## Backup

Создать backup:

```bash
DATABASE_PATH=/var/lib/croissant/croissant.sqlite BACKUP_DIR=/var/backups/croissant npm run backup:db
```

Ежедневный backup по cron:

```cron
0 3 * * * cd /srv/croissant && DATABASE_PATH=/var/lib/croissant/croissant.sqlite BACKUP_DIR=/var/backups/croissant npm run backup:db >> /var/log/croissant-backup.log 2>&1
```

## Restore

Перед restore остановить приложение:

```bash
systemctl stop croissant
DATABASE_PATH=/var/lib/croissant/croissant.sqlite npm run restore:db -- /var/backups/croissant/croissant-2026-01-01T10-00-00-000Z.sqlite
systemctl start croissant
```

## Privacy Note

Plausible здесь используется как легкая продуктовая аналитика без cookie-banner логики. В alpha-версии отправляются только обезличенные события использования: pageview, успешная регистрация и вход, старт урока и факт завершения урока. Ник, текст упражнений, raw key stats и другие персональные данные в аналитику не отправляются.
