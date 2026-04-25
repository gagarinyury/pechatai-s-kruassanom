# Release Notes

## Community Alpha 1.0

Публичный alpha-релиз тренажера слепой печати на русском.

### Что вошло

- стабильный веб-тренажер без лендинга и маркетинговой обвязки
- исправленная прогрессия `week1`
- регистрация и повторный вход с сохранением прогресса
- production-конфиг для `SESSION_SECRET`, `DATABASE_PATH`, `COOKIE_SECURE`, `APP_BASE_URL`
- `health` endpoint
- SQLite backup/restore сценарий
- Plausible pageview и продуктовые события без PII
- smoke e2e для desktop и mobile
- отдельный UX-момент завершения дня: можно сделать паузу или перейти дальше

### Public URL

- [type.profy.top](https://type.profy.top)

### Что пока вне scope

- лендинг
- соцлогин
- платные функции
- админка
- email-функции
- восстановление пароля
