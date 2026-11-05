# Workspace Payment Methods API

Документація API для управління платіжними методами воркспейсу. Доступ мають тільки Owner та Admin ролі.

## Базовий URL

```
/workspace/:workspaceId/payment-methods
```

## Автентифікація

Всі endpoints вимагають JWT токен в заголовку:

```
Authorization: Bearer <token>
```

## Endpoints

### 1. Створити Setup Intent для додавання платіжного методу

Створює Stripe Setup Intent, який використовується для безпечного збору даних платіжної картки на фронтенді.

**Endpoint:** `POST /workspace/:workspaceId/payment-methods/setup-intent`

**Параметри:**

- `workspaceId` (path, required) - UUID воркспейсу

**Відповідь:**

```json
{
  "clientSecret": "seti_xxx_secret_xxx",
  "setupIntentId": "seti_xxx"
}
```

**Приклад запиту:**

```bash
curl -X POST \
  https://api.example.com/workspace/123e4567-e89b-12d3-a456-426614174000/payment-methods/setup-intent \
  -H "Authorization: Bearer <token>"
```

**Приклад відповіді:**

```json
{
  "clientSecret": "seti_1ABC123_secret_XYZ789",
  "setupIntentId": "seti_1ABC123"
}
```

**Використання на фронтенді:**

```javascript
// 1. Отримати setup intent
const response = await fetch(
  `/workspace/${workspaceId}/payment-methods/setup-intent`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
const { clientSecret, setupIntentId } = await response.json();

// 2. Використати clientSecret з Stripe.js для збору даних картки
const stripe = Stripe('pk_test_...');
const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
  },
});

// 3. Якщо успішно, викликати endpoint для прикріплення методу
if (setupIntent.status === 'succeeded') {
  await attachPaymentMethod(workspaceId, setupIntentId);
}
```

---

### 2. Додати платіжний метод до воркспейсу

Прикріплює платіжний метод до воркспейсу після успішного підтвердження Setup Intent.

**Endpoint:** `POST /workspace/:workspaceId/payment-methods`

**Параметри:**

- `workspaceId` (path, required) - UUID воркспейсу

**Body:**

```json
{
  "setupIntentId": "seti_xxx"
}
```

**Відповідь:**

```json
{
  "id": "pm-method-uuid",
  "workspaceId": "workspace-uuid",
  "stripePaymentMethodId": "pm_xxx",
  "stripeCustomerId": "cus_xxx",
  "type": "card",
  "cardDetails": {
    "brand": "visa",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2025
  },
  "isDefault": true,
  "addedById": "user-uuid",
  "createdAt": "2026-02-09T10:00:00.000Z",
  "updatedAt": "2026-02-09T10:00:00.000Z"
}
```

**Приклад запиту:**

```bash
curl -X POST \
  https://api.example.com/workspace/123e4567-e89b-12d3-a456-426614174000/payment-methods \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "setupIntentId": "seti_1ABC123"
  }'
```

**Приклад відповіді:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "workspaceId": "123e4567-e89b-12d3-a456-426614174000",
  "stripePaymentMethodId": "pm_1ABC123",
  "stripeCustomerId": "cus_XYZ789",
  "type": "card",
  "cardDetails": {
    "brand": "visa",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2025
  },
  "isDefault": true,
  "addedById": "user-uuid",
  "createdAt": "2026-02-09T10:00:00.000Z",
  "updatedAt": "2026-02-09T10:00:00.000Z"
}
```

---

### 3. Отримати всі платіжні методи воркспейсу

Повертає список усіх платіжних методів воркспейсу, відсортованих за замовчуванням (default спочатку).

**Endpoint:** `GET /workspace/:workspaceId/payment-methods`

**Параметри:**

- `workspaceId` (path, required) - UUID воркспейсу

**Відповідь:**

```json
[
  {
    "id": "pm-method-uuid-1",
    "workspaceId": "workspace-uuid",
    "stripePaymentMethodId": "pm_xxx",
    "stripeCustomerId": "cus_xxx",
    "type": "card",
    "cardDetails": {
      "brand": "visa",
      "last4": "4242",
      "expMonth": 12,
      "expYear": 2025
    },
    "isDefault": true,
    "addedById": "user-uuid",
    "addedBy": {
      "id": "user-uuid",
      "email": "user@example.com"
    },
    "createdAt": "2026-02-09T10:00:00.000Z",
    "updatedAt": "2026-02-09T10:00:00.000Z"
  },
  {
    "id": "pm-method-uuid-2",
    "workspaceId": "workspace-uuid",
    "stripePaymentMethodId": "pm_yyy",
    "stripeCustomerId": "cus_xxx",
    "type": "card",
    "cardDetails": {
      "brand": "mastercard",
      "last4": "5555",
      "expMonth": 6,
      "expYear": 2026
    },
    "isDefault": false,
    "addedById": "user-uuid",
    "addedBy": {
      "id": "user-uuid",
      "email": "user@example.com"
    },
    "createdAt": "2026-02-08T10:00:00.000Z",
    "updatedAt": "2026-02-08T10:00:00.000Z"
  }
]
```

**Приклад запиту:**

```bash
curl -X GET \
  https://api.example.com/workspace/123e4567-e89b-12d3-a456-426614174000/payment-methods \
  -H "Authorization: Bearer <token>"
```

---

### 4. Встановити платіжний метод за замовчуванням

Встановлює вказаний платіжний метод як метод за замовчуванням для воркспейсу.

**Endpoint:** `PUT /workspace/:workspaceId/payment-methods/:paymentMethodId/set-default`

**Параметри:**

- `workspaceId` (path, required) - UUID воркспейсу
- `paymentMethodId` (path, required) - UUID платіжного методу

**Відповідь:**

```json
{
  "id": "pm-method-uuid",
  "workspaceId": "workspace-uuid",
  "stripePaymentMethodId": "pm_xxx",
  "stripeCustomerId": "cus_xxx",
  "type": "card",
  "cardDetails": {
    "brand": "visa",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2025
  },
  "isDefault": true,
  "addedById": "user-uuid",
  "createdAt": "2026-02-09T10:00:00.000Z",
  "updatedAt": "2026-02-09T10:00:00.000Z"
}
```

**Приклад запиту:**

```bash
curl -X PUT \
  https://api.example.com/workspace/123e4567-e89b-12d3-a456-426614174000/payment-methods/550e8400-e29b-41d4-a716-446655440000/set-default \
  -H "Authorization: Bearer <token>"
```

---

### 5. Видалити платіжний метод

Видаляє платіжний метод з воркспейсу. Якщо видаляється метод за замовчуванням, автоматично встановлюється інший метод (якщо він є).

**Endpoint:** `DELETE /workspace/:workspaceId/payment-methods/:paymentMethodId`

**Параметри:**

- `workspaceId` (path, required) - UUID воркспейсу
- `paymentMethodId` (path, required) - UUID платіжного методу

**Відповідь:**

```json
{
  "success": true
}
```

**Приклад запиту:**

```bash
curl -X DELETE \
  https://api.example.com/workspace/123e4567-e89b-12d3-a456-426614174000/payment-methods/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <token>"
```

---

## Коди помилок

### 400 Bad Request

- `Stripe is not configured` - Stripe не налаштовано
- `Setup intent is not succeeded` - Setup Intent не підтверджено
- `Payment method not found in setup intent` - Платіжний метод не знайдено

### 401 Unauthorized

- Відсутній або невалідний JWT токен

### 403 Forbidden

- Користувач не має доступу до billing (не є Owner або Admin)

### 404 Not Found

- `Workspace not found` - Воркспейс не знайдено
- `Payment method not found` - Платіжний метод не знайдено

---

## Повний приклад використання (React + Stripe.js)

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_...');

function AddPaymentMethodForm({ workspaceId, token, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Створити setup intent
      const setupIntentResponse = await fetch(
        `/workspace/${workspaceId}/payment-methods/setup-intent`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const { clientSecret, setupIntentId } = await setupIntentResponse.json();

      // 2. Підтвердити картку через Stripe
      const cardElement = elements.getElement(CardElement);
      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (error) {
        throw error;
      }

      if (setupIntent.status === 'succeeded') {
        // 3. Прикріпити платіжний метод до воркспейсу
        const attachResponse = await fetch(
          `/workspace/${workspaceId}/payment-methods`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ setupIntentId })
          }
        );

        const paymentMethod = await attachResponse.json();
        onSuccess(paymentMethod);
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe || loading}>
        {loading ? 'Adding...' : 'Add Payment Method'}
      </button>
    </form>
  );
}

// Використання
function PaymentMethodsPage({ workspaceId, token }) {
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    // Завантажити список платіжних методів
    fetch(`/workspace/${workspaceId}/payment-methods`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setPaymentMethods);
  }, [workspaceId, token]);

  const handleSetDefault = async (paymentMethodId) => {
    await fetch(
      `/workspace/${workspaceId}/payment-methods/${paymentMethodId}/set-default`,
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    // Оновити список
  };

  const handleDelete = async (paymentMethodId) => {
    await fetch(
      `/workspace/${workspaceId}/payment-methods/${paymentMethodId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    // Оновити список
  };

  return (
    <div>
      <h2>Payment Methods</h2>
      {paymentMethods.map(pm => (
        <div key={pm.id}>
          <span>{pm.cardDetails?.brand} •••• {pm.cardDetails?.last4}</span>
          {pm.isDefault && <span>(Default)</span>}
          <button onClick={() => handleSetDefault(pm.id)}>Set Default</button>
          <button onClick={() => handleDelete(pm.id)}>Delete</button>
        </div>
      ))}

      <Elements stripe={stripePromise}>
        <AddPaymentMethodForm
          workspaceId={workspaceId}
          token={token}
          onSuccess={() => {/* оновити список */}}
        />
      </Elements>
    </div>
  );
}
```

---

## Примітки

1. **Права доступу**: Тільки користувачі з ролями `Owner` або `Admin` можуть управляти платіжними методами.

2. **Stripe Customer**: При першому додаванні платіжного методу автоматично створюється Stripe Customer для воркспейсу.

3. **Метод за замовчуванням**: Перший доданий платіжний метод автоматично стає методом за замовчуванням. При видаленні методу за замовчуванням автоматично встановлюється найстаріший інший метод (якщо він є).

4. **Безпека**: Всі операції з платіжними даними виконуються через Stripe, сервер ніколи не зберігає повні дані картки.
