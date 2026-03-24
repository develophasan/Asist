---
name: asist-mvp
description: Implements and reviews the Asist vehicle valet platform (muayene, servis, basit şoförlük) against the locked MVP scope, roles, data model, request state machine, matching rules, and compliance. Use when building or changing backend, mobile, admin, APIs, payments, GPS, or ops features for this repo; when the user mentions MVP, emanetçi, müşteri, talep, TÜVTÜRK, provizyon, or refers to mvp.md.
---

# Asist MVP

## Stack (locked for this repo)

Do not introduce alternate stacks from the generic options in the product doc.

| Layer | Choice |
|-------|--------|
| API | NestJS |
| DB | PostgreSQL |
| Cache / jobs | Redis (e.g. BullMQ for queues) |
| Realtime | WebSocket (Socket.IO or project standard) |
| Mobile | React Native (müşteri + emanetçi apps) |
| Admin web | Next.js |
| Object storage | S3-compatible |
| Maps / GPS | Google Maps or Mapbox (project config) |

## Scope guardrails

**In MVP:** Talep oluşturma, eşleşme, canlı takip, ödeme (ön provizyon → iş sonu tahsil), puanlama, bildirimler, dijital onay, basit hasar bildirimi, emanetçi KYC ve rozetler, admin doğrulama ve manuel atama, zon/sabit fiyat.

**Out of MVP (do not build unless user explicitly expands scope):** Parça pazaryeri, dinamik fiyat optimizasyonu, kurumsal filo paneli (unless later approved). Opsiyonel items (iç kamera, servis partner paneli, gelişmiş iptal cezaları) only when specified in the task.

## Roles

- **Müşteri (araç sahibi):** Kayıt/KYC, araçlar, talep, takip, ödeme özeti, yorum/puan.
- **Emanetçi:** Başvuru, belgeler, müsaitlik, kabul/red, görev akışı, kazanç geçmişi.
- **Admin:** Doğrulama, rozet, talep izleme/manuel atama, zon/tarife, şikayet/hasar, raporlar.

## Request state machine

`requests.status` must follow:

`draft → pending → matched → pickup_started → in_progress → completed → closed`

Terminal/alternate: `cancelled`, `disputed`.

Implement transitions in one place (domain service or state machine); reject invalid transitions at API level.

## Core entities (align schema to this)

Map tables to product concepts: `users`, `vehicles`, `agents`, `requests`, `assignments`, `request_events`, `payments`, `reviews`, `disputes`. Extend with new columns/tables only when needed; keep naming consistent with existing migrations.

`request_events` should capture status changes, geo, optional `media_url`, `note`, timestamp for audit and live tracking.

## Matching (MVP)

Filter: şehir/zon, müsaitlik, rozet, minimum puan, mesafe en fazla X km. **MVP rule:** notify nearest 3 eligible emanetçiler → **first accept wins**; admin may override. Do not implement full automatic dispatch optimization.

## Pricing (MVP)

Sabit başlangıç + km/zon; muayene sabit paket; yoğun saat çarpanı **manuel** (config/admin), not auto-ML.

## Trust & payments (minimum)

- Emanetçi KYC path: license, background check fields, verification workflow.
- Digital contract acceptance for müşteri and emanetçi where the flow requires it.
- Pickup/dropoff **required** photo/video hooks in the task flow.
- Payments: pre-authorization then capture/settle on completion; provider-agnostic design (iyzico/PayTR/Stripe TR per deployment).

## Implementation discipline

1. **Feature fit:** Every new endpoint or screen maps to a flow in the MVP doc; if unclear, prefer the smallest change that satisfies the spec.
2. **Idempotency:** Payment and assignment actions should be safe to retry where providers allow it.
3. **Realtime:** Location and status updates go through the agreed socket contract; persist critical state in DB, not only in memory.
4. **Compliance hooks:** Data model and APIs should support KVKK/consent and dispute records; do not log unnecessary PII.

## Full specification

Authoritative detail, Turkish product copy, and tables: [mvp.md](../../../mvp.md)

When the spec and this skill differ, **ask the user** or follow an explicit project decision recorded in repo; default to **stricter** interpretation for money, safety, and legal-adjacent flows.
