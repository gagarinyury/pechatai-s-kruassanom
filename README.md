# Печатай с Круассаном

Community alpha веб-тренажера слепой печати на русском. Пользователь может зарегистрироваться, пройти уроки недели 1, сохранить прогресс и вернуться позже с того же аккаунта.

Демо: [type.profy.top](https://type.profy.top)

## Что внутри

- 7-дневный курс по русской раскладке
- регистрация по нику и паролю
- сохранение прогресса в SQLite
- mobile и desktop UI
- product analytics через Plausible без PII
- production baseline: `React + Vite + Express + SQLite`

## Локальный запуск

```bash
npm install
cp .env.example .env
npm run dev
```

- фронт: `http://localhost:3000`
- API: `http://localhost:3001`

## Проверки перед релизом

```bash
npm run typecheck
npm run build
npm run smoke:e2e
```

`smoke:e2e` поднимает production-сервер локально и проверяет критический путь:
- регистрация нового пользователя
- открытие первого урока
- реальное прохождение упражнения через UI
- unlock следующего упражнения
- reload с сохраненным прогрессом
- logout/login с тем же аккаунтом
- отсутствие browser console errors и page errors

## Production Contract

Пример production env:

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
- `GET /health` возвращает `200 {"ok":true}`.

Шаблон production env: [`./.env.production.example`](./.env.production.example)

## Деплой на VPS

Релизный baseline:
- домен `type.profy.top`
- `nginx + certbot + systemd`
- один процесс `npm run start`
- SQLite вне репозитория

Подготовить директории:

```bash
mkdir -p /srv/croissant
mkdir -p /var/lib/croissant
mkdir -p /var/backups/croissant
```

Скопировать проект и собрать:

```bash
cd /srv/croissant
npm install
npm run build
cp .env.production.example .env.production
```

Systemd unit: [`./deploy/systemd/croissant.service`](./deploy/systemd/croissant.service)

```bash
cp deploy/systemd/croissant.service /etc/systemd/system/croissant.service
systemctl daemon-reload
systemctl enable croissant
systemctl restart croissant
systemctl status croissant
```

Nginx config: [`./deploy/nginx/type.profy.top.conf`](./deploy/nginx/type.profy.top.conf)

```bash
cp deploy/nginx/type.profy.top.conf /etc/nginx/sites-available/type.profy.top
ln -s /etc/nginx/sites-available/type.profy.top /etc/nginx/sites-enabled/type.profy.top
nginx -t
systemctl reload nginx
certbot --nginx -d type.profy.top
```

## Backup и Restore

Создать backup:

```bash
DATABASE_PATH=/var/lib/croissant/croissant.sqlite BACKUP_DIR=/var/backups/croissant npm run backup:db
```

Пример cron:

```cron
0 3 * * * cd /srv/croissant && DATABASE_PATH=/var/lib/croissant/croissant.sqlite BACKUP_DIR=/var/backups/croissant npm run backup:db >> /var/log/croissant-backup.log 2>&1
```

Restore:

```bash
systemctl stop croissant
DATABASE_PATH=/var/lib/croissant/croissant.sqlite npm run restore:db -- /var/backups/croissant/croissant-2026-01-01T10-00-00-000Z.sqlite
systemctl start croissant
```

## Post-Deploy Checklist

- `curl https://type.profy.top/health`
- HTTPS открывается без предупреждений
- secure cookie выставляется
- регистрация работает
- logout/login работает
- первый урок проходится
- progress сохраняется после reload
- progress сохраняется после повторного входа
- pageview и product events приходят в Plausible

## Privacy Note

Plausible используется как легкая продуктовая аналитика без cookie-banner логики. В alpha-версии отправляются только обезличенные события использования: pageview, успешная регистрация и вход, старт урока и факт завершения урока. Ник, текст упражнений, raw key stats и другие персональные данные в аналитику не отправляются.
