# Swap Request Payment API - Frontend інструкція

Документація для інтеграції оплати swap request на frontend.

## Огляд

При оплаті swap request є два сценарії:
1. **Оплата через організацію** - якщо менеджер в організації і передано `paymentMethodId`
2. **Оплата карткою** - якщо менеджер не в організації або не передано `paymentMethodId`

В обох випадках використовується механізм **hold** (резервування коштів) - кошти резервуються, але не списуються до тих пір, поки обидва менеджери не зроблять hold. Після цього кошти автоматично списуються з обох.

## Endpoint

```
POST /swap-request/:id/payment-intent
```

### Параметри

- `id` (path, required) - UUID swap request
- `paymentMethodId` (body, optional) - UUID payment method з організації (якщо менеджер в організації)

### Відповідь

```typescript
{
  clientSecret: string;           // Client secret для Stripe.js
  paymentIntentId: string;        // ID payment intent
  requiresPaymentMethod: boolean; // Чи потрібно ввести дані картки
  status: string;                 // Статус payment intent
}
```

## Сценарій 1: Оплата через організацію

Якщо менеджер в організації і є payment methods:

```typescript
// 1. Отримати список payment methods організації
const paymentMethods = await fetch(
  `/workspace/${workspaceId}/payment-methods`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
).then(res => res.json());

// 2. Створити payment intent з payment method
const response = await fetch(
  `/swap-request/${swapRequestId}/payment-intent`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentMethodId: selectedPaymentMethod.id, // ID з workspace payment methods
    }),
  }
).then(res => res.json());

// 3. Перевірити чи потрібно ввести дані картки
if (response.requiresPaymentMethod) {
  // Це не повинно статися при оплаті через організацію
  // Але якщо сталося - використати clientSecret для підтвердження
  await handleCardPayment(response.clientSecret);
} else {
  // Payment intent вже підтверджений через payment method
  // Кошти в hold, чекаємо поки другий менеджер зробить hold
  console.log('Payment hold successful! Waiting for other manager...');
}
```

## Сценарій 2: Оплата карткою

Якщо менеджер не в організації або не передано `paymentMethodId`:

```typescript
// 1. Створити payment intent без payment method
const response = await fetch(
  `/swap-request/${swapRequestId}/payment-intent`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}), // Або не передавати paymentMethodId
  }
).then(res => res.json());

// 2. Перевірити чи потрібно ввести дані картки
if (response.requiresPaymentMethod) {
  // Використати clientSecret для підтвердження через Stripe.js
  await handleCardPayment(response.clientSecret);
} else {
  // Payment intent вже підтверджений (не повинно статися без payment method)
  console.log('Payment intent already confirmed');
}
```

## Підтвердження payment intent через Stripe.js

Якщо `requiresPaymentMethod: true`, потрібно використати Stripe.js для підтвердження:

```typescript
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_...'); // Ваш Stripe publishable key

function PaymentForm({ clientSecret, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);

    // Підтверджуємо payment intent з даними картки
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Customer Name', // Можна отримати з профілю користувача
          },
        },
      }
    );

    if (error) {
      // Помилка підтвердження
      console.error('Payment confirmation error:', error);
      onError(error);
    } else if (paymentIntent) {
      // Успішно підтверджено
      if (paymentIntent.status === 'requires_capture' || 
          paymentIntent.status === 'succeeded') {
        // Кошти в hold (requires_capture) або вже захоплені (succeeded)
        console.log('Payment hold successful!', paymentIntent);
        onSuccess(paymentIntent);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
            },
          },
        }}
      />
      <button type="submit" disabled={!stripe}>
        Confirm Payment
      </button>
    </form>
  );
}

// Використання
function SwapRequestPayment({ swapRequestId }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);

  const createPaymentIntent = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/swap-request/${swapRequestId}/payment-intent`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}), // Без paymentMethodId для оплати карткою
        }
      );
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error('Error creating payment intent:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!clientSecret ? (
        <button onClick={createPaymentIntent} disabled={loading}>
          {loading ? 'Creating...' : 'Pay $50'}
        </button>
      ) : (
        <Elements stripe={stripePromise}>
          <PaymentForm
            clientSecret={clientSecret}
            onSuccess={(paymentIntent) => {
              console.log('Payment successful!', paymentIntent);
              // Оновити UI, показати повідомлення про успіх
            }}
            onError={(error) => {
              console.error('Payment error:', error);
              // Показати помилку користувачу
            }}
          />
        </Elements>
      )}
    </div>
  );
}
```

## Статуси payment intent

- `requires_payment_method` - потрібно ввести дані картки на frontend (використати `clientSecret` з Stripe.js)
- `requires_confirmation` - потрібно підтвердити payment intent
- `requires_capture` - кошти зарезервовані (hold), очікується capture. `amount_capturable > 0` означає що кошти в hold
- `succeeded` - payment intent успішний (може бути в hold якщо `amount_capturable > 0`)

### Важливо про `amount_capturable`

- `amount_capturable: 0` - кошти **не в hold**, payment intent ще не підтверджений
- `amount_capturable > 0` - кошти **в hold** (зарезервовані), можна захопити через `capture`
- Після підтвердження payment intent через Stripe.js, `amount_capturable` стане рівним сумі платежу (5000 = $50.00)

## Статуси swap request після оплати

Після створення payment intent, статус swap request може змінитися:

- `PAYMENT_PENDING` - очікується оплата
- `PAYMENT_A_HOLD` - менеджер A зробив hold
- `PAYMENT_B_HOLD` - менеджер B зробив hold
- `PAYMENT_BOTH_HOLD` - обидва зробили hold, кошти автоматично списуються
- `COMPLETED` - обидва оплатили, swap request завершено

## Перевірка статусу swap request

Для перевірки статусу swap request після оплати:

```typescript
const checkSwapRequestStatus = async (swapRequestId) => {
  const response = await fetch(
    `/swap-request/${swapRequestId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const swapRequest = await response.json();
  
  console.log('Swap request status:', swapRequest.status);
  console.log('Payment A hold:', swapRequest.paymentAHold);
  console.log('Payment B hold:', swapRequest.paymentBHold);
  
  return swapRequest;
};
```

## Обробка webhook (опціонально)

Якщо потрібно отримувати оновлення в реальному часі, можна використати WebSocket або polling:

```typescript
// Polling для перевірки статусу
const pollSwapRequestStatus = async (swapRequestId, interval = 2000) => {
  const intervalId = setInterval(async () => {
    const swapRequest = await checkSwapRequestStatus(swapRequestId);
    
    if (swapRequest.status === 'COMPLETED') {
      clearInterval(intervalId);
      console.log('Swap request completed!');
      // Оновити UI
    }
  }, interval);
  
  return intervalId;
};
```

## Приклад повної інтеграції

```typescript
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function SwapRequestPaymentFlow({ swapRequestId, workspaceId, token }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Завантажити payment methods організації (якщо є)
  useEffect(() => {
    if (workspaceId) {
      fetch(`/workspace/${workspaceId}/payment-methods`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => setPaymentMethods(data))
        .catch(err => console.error('Error loading payment methods:', err));
    }
  }, [workspaceId, token]);

  const handleCreatePaymentIntent = async () => {
    setLoading(true);
    setError(null);

    try {
      const body = selectedPaymentMethod
        ? { paymentMethodId: selectedPaymentMethod.id }
        : {};

      const response = await fetch(
        `/swap-request/${swapRequestId}/payment-intent`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const data = await response.json();

      console.log('Payment intent created:', {
        status: data.status,
        requiresPaymentMethod: data.requiresPaymentMethod,
        paymentIntentId: data.paymentIntentId,
      });

      if (data.requiresPaymentMethod) {
        // Потрібно ввести дані картки
        // status буде 'requires_payment_method'
        // amount_capturable буде 0 (кошти ще не в hold)
        setClientSecret(data.clientSecret);
      } else {
        // Payment intent вже підтверджений через payment method
        // status буде 'requires_capture' або 'succeeded'
        // amount_capturable буде > 0 (кошти в hold)
        alert('Payment hold successful! Waiting for other manager...');
        // Оновити UI, перезавантажити swap request
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Pay $50 for Swap Request</h3>

      {/* Вибір payment method (якщо є) */}
      {paymentMethods.length > 0 && (
        <div>
          <label>Select Payment Method:</label>
          <select
            value={selectedPaymentMethod?.id || ''}
            onChange={(e) => {
              const pm = paymentMethods.find(p => p.id === e.target.value);
              setSelectedPaymentMethod(pm);
            }}
          >
            <option value="">Pay with new card</option>
            {paymentMethods.map(pm => (
              <option key={pm.id} value={pm.id}>
                {pm.cardDetails?.brand?.toUpperCase()} •••• {pm.cardDetails?.last4}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Кнопка для створення payment intent */}
      {!clientSecret && (
        <button onClick={handleCreatePaymentIntent} disabled={loading}>
          {loading ? 'Processing...' : 'Create Payment Intent'}
        </button>
      )}

      {/* Форма для введення картки (якщо потрібно) */}
      {clientSecret && (
        <Elements stripe={stripePromise}>
          <CardPaymentForm
            clientSecret={clientSecret}
            onSuccess={() => {
              alert('Payment hold successful!');
              setClientSecret(null);
              // Оновити UI
            }}
            onError={(err) => {
              setError(err.message);
              setClientSecret(null);
            }}
          />
        </Elements>
      )}

      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}

function CardPaymentForm({ clientSecret, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);

    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Customer Name', // Отримати з профілю
          },
        },
      }
    );

    if (error) {
      onError(error);
    } else if (paymentIntent) {
      console.log('Payment intent confirmed:', {
        status: paymentIntent.status,
        amount_capturable: paymentIntent.amount_capturable,
      });

      // Після підтвердження payment intent має бути в стані hold
      if (
        paymentIntent.status === 'requires_capture' ||
        (paymentIntent.status === 'succeeded' && paymentIntent.amount_capturable > 0)
      ) {
        // Кошти в hold (amount_capturable > 0)
        // Webhook автоматично обробить це і оновить статус swap request
        onSuccess(paymentIntent);
      } else {
        // Неочікуваний статус
        console.warn('Unexpected payment intent status:', paymentIntent.status);
        onError(new Error('Payment confirmed but not in hold state'));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>
        Confirm Payment
      </button>
    </form>
  );
}

export default SwapRequestPaymentFlow;
```

## Важливі моменти

1. **Hold механізм**: Кошти резервуються, але не списуються до тих пір, поки обидва менеджери не зроблять hold
2. **Автоматичний capture**: Коли обидва зробили hold, кошти автоматично списуються з обох
3. **Статуси**: Слідкуйте за статусами swap request для відображення правильного UI
4. **Помилки**: Обробляйте помилки від Stripe та API
5. **UX**: Показуйте користувачу прогрес оплати та статус swap request

## Тестування

Для тестування використовуйте тестові картки Stripe:
- Успішна оплата: `4242 4242 4242 4242`
- Помилка: `4000 0000 0000 0002`
- Потрібна 3D Secure: `4000 0025 0000 3155`

CVV: будь-які 3 цифри
Expiry: будь-яка майбутня дата
