# Asist

Araç sahipleri ile doğrulanmış emanetçileri eşleştiren vale / muayene–servis platformu (MVP). Monorepo: **NestJS API**, **Next.js admin**, **Expo (React Native) mobil**.

## Gereksinimler

- Node.js 20+
- Docker Desktop (PostgreSQL + Redis)

## Hızlı başlangıç

1. Altyapı:

   ```bash
   docker compose up -d
   ```

2. API ortamı — `apps/api/.env` oluşturun (`apps/api/.env.example` ile aynı içerik yeterlidir):

   ```bash
   copy apps\api\.env.example apps\api\.env
   ```

   (Linux/macOS: `cp apps/api/.env.example apps/api/.env`)

   Stripe test modu kullanacaksanız:

   - `PAYMENT_PROVIDER=stripe`
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - (opsiyonel) `STRIPE_TEST_DEFAULT_PAYMENT_METHOD=pm_card_visa`

3. Bağımlılıklar (kök dizinde):

   ```bash
   npm install
   ```

4. API:

   ```bash
   npm run dev:api
   ```

   Sağlık kontrolü: `http://localhost:3000/health`

5. Admin (Next.js):

   ```bash
   npm run dev:admin
   ```

6. Mobil (Expo):

   ```bash
   npm run start:mobile:customer
   npm run start:mobile:agent
   ```

## Belgeler

- Ürün: [`mvp.md`](mvp.md)
- AI bağlamı: [`AGENTS.md`](AGENTS.md)

## Testler (API)

```bash
npm run test:api
```

E2E, tam `AppModule` ile DB üzerinde auth + request + matching akışını çalıştırır:

```bash
npm run test:e2e:api
```

Neon üzerinde test verisi:

```bash
npm run seed:api
```
