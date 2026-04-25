# Печатай с Круассаном

MVP тренажера слепой печати на русском: регистрация по нику и паролю, 7-дневный курс, сохранение прогресса в SQLite.

## Запуск

```bash
npm install
npm run dev
```

Фронт: http://localhost:3000  
API: http://localhost:3001

## Переменные окружения

```bash
SESSION_SECRET=change-me
DATABASE_PATH=./data/croissant.sqlite
PORT=3001
```

Для локальной разработки есть безопасные значения по умолчанию. В продакшене нужно задать `SESSION_SECRET`.

## Проверка

```bash
npm run lint
npm run build
```

