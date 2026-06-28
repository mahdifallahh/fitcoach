# Data Model

The authoritative source is [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma). This document
explains the entities, relationships, and the critical **student-linking rule**.

## Entities

```
User ──1:1── CoachProfile
 │           └──< ExerciseCategory ──< Exercise
 │           └──< Program ──< ProgramDay ──< ProgramExercise >── Exercise
 │           └──< Subscription ──< Payment
 │           └──< StudentProfile (as coach's client list)
 └──1:0..1── StudentProfile (when a student claims their profiles)

OtpToken      (auth, standalone)
RefreshToken  (auth, User ──< RefreshToken)
```

### User
`id, phone? (unique), email? (unique), role (COACH|STUDENT), locale, passwordHash? (reserved), createdAt`
At least one of `phone` / `email` is present. Passwordless by default.

### CoachProfile
`userId (PK/FK), name, bio?, avatarUrl?, socialLinks (Json [{type,label,url}]), tags (String[])`
Social links are a flexible list, not fixed fields.

### StudentProfile  ← the linking pivot
`id, userId? (nullable), coachId (FK), phone?, email?, age?, heightCm?, weightKg?, createdAt`
- Created by a coach when authoring a program — keyed on the student's phone/email, `userId = null`.
- One row **per coach** (a student that two coaches train has two StudentProfile rows, both eventually
  pointing to the same `User`). This keeps each coach's client data isolated.

### ExerciseCategory
`id, coachId (FK), name` — unique `(coachId, name)`.

### Exercise
`id, coachId (FK), categoryId? (FK), name, defaultSets, defaultReps, description?, gifUrl?`

### Program
`id, coachId (FK), studentProfileId (FK), name, daysPerWeek, status (DRAFT|PUBLISHED),
studentAgeSnapshot?, studentHeightSnapshot?, studentWeightSnapshot?, pdfUrl?, pdfStaleAt?, createdAt, updatedAt`
Snapshots capture the student's stats at authoring time (they may change later).

### ProgramDay
`id, programId (FK), dayIndex` — unique `(programId, dayIndex)`.

### ProgramExercise
`id, programDayId (FK), exerciseId (FK), sets, reps, order, supersetGroupId? (uuid), supersetOrder?`
- `order` sequences items/groups within a day.
- Rows sharing a `supersetGroupId` form one superset (rendered grouped everywhere); `supersetOrder`
  sequences members inside the group.

### Subscription
`id, coachId (FK), plan (M3|M6|M12), status (TRIALING|ACTIVE|EXPIRED|CANCELED), startsAt, endsAt`
A trial subscription (`TRIALING`, `endsAt = +7d`) is created when a coach registers.

### Payment
`id, coachId (FK), subscriptionId? (FK), gateway (ZARINPAL|STRIPE), amount, currency,
status (PENDING|PAID|FAILED|REFUNDED), authority?, sessionId?, raw (Json), createdAt`

### OtpToken
`id, identifier, channel (SMS|EMAIL), codeHash, purpose (LOGIN|MAGIC_LINK), expiresAt, consumedAt?, attempts`
Codes/links are stored **hashed**; short TTL; attempts tracked for rate limiting.

### RefreshToken
`id, userId (FK), tokenHash, expiresAt, revokedAt?, userAgent?, createdAt`
Rotating refresh tokens; old token is revoked on each refresh.

## The student-linking rule (walkthrough)

1. **Coach authors ahead of time.** Coach enters `+98912xxxxxxx` (or an email) + age/height/weight and
   builds a program. Backend `upsert`s a `StudentProfile` for `(coachId, normalizedPhone)` with `userId = null`
   and attaches the `Program`.
2. **Normalization.** Phone → E.164 (`09... → +989...`), email → lowercased/trimmed. Both the stored key
   and the lookup key are normalized identically, so matching is reliable.
3. **Student registers.** Student signs up with the same phone/email. In a single transaction the backend:
   - finds or creates the student `User`,
   - selects all `StudentProfile` rows where `userId IS NULL` AND (`phone` = norm OR `email` = norm),
   - sets their `userId` to the new user.
4. **Student sees everything.** The student panel lists distinct coaches across their now-linked
   StudentProfiles, and the programs under each.

> Idempotent: re-running the claim is a no-op (only `userId IS NULL` rows are touched). If a coach adds a
> new program after the student already registered, the `upsert` finds the now-linked profile and attaches
> directly — no orphan is created.

## Indexes
FKs are indexed by Prisma relations; additionally `StudentProfile(phone)`, `StudentProfile(email)`,
`Subscription(coachId, status)`, and `Exercise(coachId, categoryId)` for hot lookups.
