# Налаштування Stripe Webhook для Localhost

Для тестування webhook на localhost потрібно використовувати Stripe CLI, який пересилає події з Stripe на ваш локальний сервер.

## Встановлення Stripe CLI

### macOS
```bash
brew install stripe/stripe-cli/stripe
```

### Linux
```bash
# Завантажити з https://github.com/stripe/stripe-cli/releases
# Або через snap
snap install stripe
```

### Windows
Завантажити з https://github.com/stripe/stripe-cli/releases

## Авторизація в Stripe CLI

```bash
stripe login
```

Це відкриє браузер для авторизації.

## Пересилання webhook подій на localhost

```bash
stripe listen --forward-to localhost:3000/swap-request/webhook/stripe
```

Або якщо ваш сервер працює на іншому порту:

```bash
stripe listen --forward-to localhost:5000/swap-request/webhook/stripe
```

Після запуску Stripe CLI покаже `webhook signing secret`, який виглядає як `whsec_...`

## Налаштування .env

Додайте webhook signing secret в `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Важливо:** Цей secret відрізняється від `STRIPE_SECRET_KEY` і використовується тільки для верифікації підпису webhook подій.

## Перевірка webhook подій

Після запуску `stripe listen`, всі події з Stripe будуть пересилатися на ваш localhost endpoint.

Для тестування можна відправити тестову подію:

```bash
stripe trigger payment_intent.succeeded
```

## Endpoint для webhook

Ваш endpoint має бути доступний за адресою:
```
POST /swap-request/webhook/stripe
```

Він вже налаштований в `SwapRequestController` і обробляє події типу `payment_intent.succeeded`.

## Повний процес налаштування

1. **Встановити Stripe CLI:**
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Авторизуватися:**
   ```bash
   stripe login
   ```

3. **Запустити пересилання webhook:**
   ```bash
   stripe listen --forward-to localhost:3000/swap-request/webhook/stripe
   ```

4. **Скопіювати webhook signing secret** (показується після запуску `stripe listen`)

5. **Додати в .env:**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

6. **Перезапустити сервер** щоб завантажити новий .env

7. **Тестувати:** Створіть payment intent і підтвердіть його - webhook має спрацювати

## Альтернатива: Stripe Dashboard (для production)

Для production використовуйте Stripe Dashboard:

1. Перейдіть в Stripe Dashboard → Developers → Webhooks
2. Натисніть "Add endpoint"
3. Введіть URL вашого production сервера: `https://yourdomain.com/swap-request/webhook/stripe`
4. Виберіть події: `payment_intent.succeeded`
5. Скопіюйте "Signing secret" і додайте в production .env

## Перевірка що webhook працює

Після налаштування, коли ви створюєте і підтверджуєте payment intent, в логах має з'явитися:

```
[Webhook] Received event: payment_intent.succeeded
[Webhook] Payment intent metadata: { swapRequestId: '...', side: 'A' or 'B', ... }
```

Якщо цього немає - перевірте:
- Чи запущений `stripe listen`
- Чи правильний URL в `--forward-to`
- Чи правильний `STRIPE_WEBHOOK_SECRET` в .env
- Чи endpoint доступний (сервер запущений)
