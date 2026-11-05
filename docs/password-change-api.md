# Зміна пароля

**POST** `{{url}}/user-auth/change-password`

- Body: `{ "email": "...", "code": "код_з_листа", "newPassword": "новий_пароль" }`
- Код спочатку надсилається на пошту через **POST** `{{url}}/user-auth/send-recovery-code` (body: `{ "email": "..." }`).
- Відповідь: `{ "message": "Password changed" }`
- Помилки: `400` — немає полів / "User not found" / "Invalid code"

```javascript
await fetch(`${API_URL}/user-auth/change-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, code, newPassword }),
});
```
