# API для дашборду та організації — інструкція для фронту

Усі запити потребують **JWT** в заголовку: `Authorization: Bearer <token>`.

---

## Дашборд (swap-request)

**Базовий URL:** `/swap-request` (або повний URL бекенду + цей шлях).

### Загальна статистика (лише по тій організації, де ти член)

```
GET /swap-request/dashboard/statistics?organizationId=:organizationId
```

**Query:** `organizationId` (обовʼязковий) — id організації. Враховуються лише swap-реквести, де ця організація є workspace A або B. Користувач має бути членом організації.

**Відповідь:**

```json
{
  "pending": 5,
  "active": 12,
  "completed": 48,
  "averageProcessingTimeHours": 72.5,
  "averageProcessingTimeFormatted": "3 дн. 0 год."
}
```

- `pending` — очікують дії
- `active` — в роботі (не завершені, не відмінені)
- `completed` — завершені угоди
- `averageProcessingTimeHours` / `averageProcessingTimeFormatted` — середній час обробки завершених

---

### Статистика по менеджерах (лише по тій організації)

```
'GET /swap-request/dashboard/statistics/by-managers?organizationId=:organizationId'
```

**Query:** `organizationId` (обовʼязковий) — id організації. У статистику входять лише менеджери з swap-реквестів, де ця організація є workspace A або B.

**Відповідь:**

```json
{
  "items": [
    {
      "manager": {
        "id": "uuid",
        "email": "hr@example.com",
        "firstName": "Іван",
        "lastName": "Петренко",
        "isDeleted": false
      },
      "pending": 2,
      "active": 5,
      "completed": 10,
      "averageProcessingTimeHours": 48.25,
      "averageProcessingTimeFormatted": "2 дн. 0 год."
    }
  ]
}
```

- Якщо менеджера видалено: `manager.isDeleted === true`, `email`/`firstName`/`lastName` можуть бути порожні; показуй позначку «Видалений».

---

## Організація: запрошення та учасники

**Базовий URL:** `/organization`.

### Список pending-запрошень (хто ще не прийняв)

```
GET /organization/:organizationId/invitations/pending
```

Потрібне право: **MANAGE_TEAM_USERS** (Owner/Admin).

**Відповідь:** масив запрошень з `workspace_invitation` (id, email, role, code, expiresAt, createdAt, workspace, invitedBy тощо).

---

### Відмінити запрошення

```
DELETE /organization/:organizationId/invitations/:invitationId
```

Потрібне право: **MANAGE_TEAM_USERS**.

**Відповідь:** `{ "deleted": true }`.

---

### Видалити учасника з організації

```
DELETE /organization/:organizationId/members/:memberId
```

Потрібне право: **MANAGE_TEAM_USERS**.  
`memberId` — це **id запису** в `workspace_member` (не `userId`). Список членів і їх id дає `GET /organization/:organizationId/members`.

**Відповідь:** `{ "success": true }`.

---

## Альтернатива через workspace

Ті самі кейси через префікс **workspace** (workspace має бути в режимі organization):

- `GET /workspace/:workspaceId/invitations/pending`
- `DELETE /workspace/:workspaceId/invitations/:invitationId`
- `DELETE /workspace/:workspaceId/members/:memberId`

Поведінка та права — як для `/organization/...`.
