# Asist — AI / geliştirici bağlamı

Bu depo **Asist** MVP’sine göre geliştirilir: araç sahibi talebi, doğrulanmış emanetçi eşleşmesi, canlı takip, ödeme ve puanlama.

## Belgeler

| Dosya | Amaç |
|--------|------|
| [`mvp.md`](mvp.md) | Ürün kapsamı, akışlar, veri modeli, durum makinesi (birincil kaynak) |
| [`system_prompt.md`](system_prompt.md) | Kısa rol + yığın + kod beklentisi |
| [`.cursor/skills/asist-mvp/SKILL.md`](.cursor/skills/asist-mvp/SKILL.md) | MVP’nin uygulanabilir özeti ve kısıtlar |
| [`.cursor/rules/asist-core.mdc`](.cursor/rules/asist-core.mdc) | Cursor’da her oturumda uygulanan çekirdek kurallar |

## Yığın

NestJS, PostgreSQL, Redis, WebSocket, React Native (iki mobil uygulama), Next.js (admin).

## Monorepo

| Dizin | Uygulama |
|--------|-----------|
| `apps/api` | NestJS REST + Socket.IO (`/live`) |
| `apps/admin` | Next.js operasyon paneli |
| `apps/mobile` | Expo (React Native) |

Yerel çalıştırma: kök [`README.md`](README.md).

Örnek veya geçici demo kodu yazılmaz; üretim kalitesi hedeflenir.
