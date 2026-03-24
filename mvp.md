1. MVP Amaç Tanımı

Hedef: Araç sahiplerinin “muayene/servis vale” talebi oluşturup doğrulanmış emanetçiyle eşleşmesi ve işlemin uçtan uca takip edilmesi.
Kapsam (MVP):

TÜVTÜRK muayene götürme
Servise götürme / geri getirme
Basit şoförlük (kısa teslim alma–bırakma)
Talep oluşturma, eşleşme, takip, ödeme, puanlama

Hariç (ilk sürümde):

Parça tedarik pazaryeri
Dinamik fiyat optimizasyonu (ilk etapta sabit/zon bazlı)
Kurumsal filo paneli (sonraya bırakılabilir)
2. Kullanıcı Rolleri
Araç Sahibi (Müşteri)
Emanetçi (Sürücü/vale)
Operasyon Yöneticisi (Admin)
(Opsiyonel) Servis Partneri
3. Temel Kullanım Akışları
3.1 Müşteri
Kayıt / kimlik doğrulama
Araç ekleme (plaka, marka, model, yakıt, kasko durumu)
Hizmet seçimi (Muayene / Servis)
Detay formu (adres, tarih-saat, özel notlar, servis seçimi)
Fiyat önizleme → talep oluştur
Emanetçi atama bildirimi
Canlı konum ve durum takibi
İşlem özeti + fatura
Puanlama/yorum
3.2 Emanetçi
Başvuru (ehliyet, sabıka, referans, deneyim)
Doküman yükleme ve doğrulama
Müsaitlik aç/kapat
Talep kabul/ret
Görev akışı:
Aracı teslim al (foto/video kayıt)
Yolda (GPS)
Muayene/servis teslim
İşlem tamam
Aracı geri teslim (foto/video)
Kazanç ve geçmiş görevler
3.3 Admin
Emanetçi doğrulama ve rozet atama
Talep izleme ve manuel atama
Fiyat zonları/sabit tarifeler
Şikayet ve hasar yönetimi
Raporlama (tamamlanma, iptal, puanlar)
4. Özellik Listesi (MVP)
Zorunlu
Kimlik doğrulama (SMS OTP)
Rol bazlı hesaplar
Talep formu ve durum makinesi
Emanetçi eşleşmesi (ilk sürüm: yarı manuel/kurallı)
GPS canlı takip
Medya kaydı (teslim alma/bırakma fotoğrafları)
Bildirimler (push/SMS)
Ödeme altyapısı (ön provizyon + iş bitince tahsil)
Puanlama ve rozet (≥4.8 “Süper Emanetçi”)
Sözleşme/dijital onay ekranı
Basit hasar bildirimi
Önemli ama opsiyonel
Araç içi kamera entegrasyonu
Sigorta poliçe numarası eşleme
Servis partner paneli
İptal/ceza kuralları
5. Sistem Mimarisi (Öneri)
İstemci
Mobil: Flutter / React Native (tek kod tabanı)
Web Admin: React / Next.js
Backend
API: Node.js (NestJS) veya Python (FastAPI)
Auth: JWT + refresh token
Gerçek zamanlı: WebSocket (Socket.IO) veya Firebase RTDB
Bildirim: Firebase Cloud Messaging + SMS gateway
Ödeme: iyzico / PayTR / Stripe TR uyumlu sağlayıcı
Harita/GPS: Google Maps / Mapbox
Veri
DB: PostgreSQL
Dosya: S3 uyumlu obje depolama
Kuyruk: Redis + BullMQ (görevler/bildirimler)
DevOps
Docker, CI/CD
Bulut: AWS / GCP / Azure TR bölgesi tercih
İzleme: Prometheus + Grafana / Sentry
6. Veri Modeli (Çekirdek Tablolar)
users(id, role, phone, kyc_status, rating_avg, created_at)
vehicles(id, user_id, plate, brand, model, fuel, notes)
agents(id, user_id, license_no, background_check, badge, status)
requests(id, user_id, vehicle_id, service_type, pickup_addr, drop_addr, scheduled_at, price_est, status)
assignments(id, request_id, agent_id, accepted_at, started_at, completed_at)
request_events(id, request_id, status, geo, media_url, note, ts)
payments(id, request_id, amount, currency, status, provider_ref)
reviews(id, request_id, from_user, to_user, rating, comment)
disputes(id, request_id, type, description, status)

Durum Makinesi (requests.status):
draft → pending → matched → pickup_started → in_progress → completed → closed

cancelled / disputed
7. Eşleşme Mantığı (MVP)
Filtreler: şehir/zon, müsaitlik, rozet, minimum puan
Mesafe < X km
İlk sürüm: en yakın 3 emanetçiye teklif → ilk kabul eden
Admin override
8. Güven ve Hukuki Katman (MVP minimum)
Emanetçi KYC: ehliyet doğrulama, sabıka kaydı, yüz doğrulama
Dijital sözleşme onayı (müşteri/emanetçi)
Teslim alma/bırakma zorunlu foto/video
Ön provizyon + hasar depozitosu opsiyonu
Sigorta partneri entegrasyonu için alanlar (policy_no)
9. Fiyatlama (Basit)
Sabit başlangıç + km/zon ek ücreti
Muayene için sabit paket
Yoğun saat çarpanı (manuel)
10. Analitik ve KPI
Talep→eşleşme oranı
Tamamlanma/iptal
Ortalama görev süresi
Emanetçi puan ortalaması
Hasar/itiraz oranı
CAC vs. görev başı kâr
11. Test Planı
Birim testleri (durum makinesi, ödeme akışı)
Entegrasyon (GPS, ödeme, bildirim)
Saha pilotu: 10–20 emanetçi, tek şehir/zon
Güven testleri: sahte medya, konum sapması
12. Yayın Öncesi Kontrol Listesi
KVKK aydınlatma ve açık rıza
Hizmet sözleşmeleri
İptal/hasar politikası
Müşteri destek akışı (in-app chat veya çağrı)
13. MVP Çıktıları
iOS/Android müşteri uygulaması
iOS/Android emanetçi uygulaması
Web admin paneli
API ve dokümantasyon
Operasyon el kitabı (teslim alma protokolü)

Gerekirse: API uç noktaları listesi veya durum makinesi diyagramı çıkarılabilir.