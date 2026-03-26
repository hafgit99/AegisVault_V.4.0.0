# Aegis Vault Security Disclosure Policy

Version: 1.0 (Draft)
Date: 2026-03-12
Status: Pre-Audit Public Policy

## 1) Policy Statement

Aegis Vault, guvenlik aciklarinin sorumlu ve koordineli sekilde bildirilmesini destekler.
Bu politika, guvenlik arastirmacilari ile urun ekibi arasinda net bir iletisim ve duzeltme sureci tanimlar.

## 2) Preferred Reporting Channel

Geçici kanal (audit oncesi):

- E-posta: security@aegisvault.local (placeholder)

Not:
- Uretim alan adi uzerinden resmi kanal ve PGP anahtari yayinlandiginda bu dokuman guncellenecektir.

## 3) Scope

In-scope:

- Authentication bypass
- Vault data exposure (plaintext/metadata)
- Bridge abuse (extension/electron/pwa)
- Crypto misuse ve key handling hatalari
- Privilege escalation ve isolation bypass

Out-of-scope:

- Social engineering
- Physical access gerektiren saldirilar
- Bilinen third-party library issue (upstream only, no exploit path)
- DDoS / availability-only testleri

## 4) Rules of Engagement

- Kullanicilara zarar verecek aktif exploit yapmayin
- Veri yok etmeyin, degistirmeyin veya aciga cikarmayin
- Sadece minimum gerekli PoC kullanin
- Testlerinizi yasal ve etik cercevede gerceklestirin

## 5) Report Format

Lutfen raporda su alanlari ekleyin:

- Baslik
- Etkilenen surum ve bilesen
- Technical reproduction adimlari
- Beklenen vs gercek davranis
- Etki analizi (confidentiality/integrity/availability)
- PoC (mümkünse)
- Onerilen duzeltme (opsiyonel)

## 6) Triage and SLA Targets

Hedef sureler:

- Ilk yanit: 3 is gunu
- Triaging tamamlanmasi: 7 is gunu
- Severity tayini: 10 is gunu

Hedef remediasyon pencereleri:

- Critical: 7-14 gun
- High: 30 gun
- Medium: 60 gun
- Low: 90 gun

Not: Sureler issue karmaşıkligina ve regression riskine gore degisebilir.

## 7) Severity Classification

Genel siniflandirma:

- Critical: Yetkisiz plaintext vault erisimi / full auth bypass
- High: Ciddi guvenlik zafiyeti, pratik exploit mevcut
- Medium: Kisitli kosullarda exploit, kontrollu etki
- Low: Dusuk etki veya zor exploit edilebilir bulgu

## 8) Coordinated Disclosure

- Duzeltme yayinlanmadan exploit detayinin public aciklanmasi ertelenmelidir
- Fix release + advisory yayin plani birlikte koordine edilir
- Arastirmaci onayi ile credit verilir

## 9) Safe Harbor (Intent)

Bu politika kapsaminda iyi niyetli ve sorumlu guvenlik arastirmasi yapan kisilere karsi
hukuki yaptirim niyeti yoktur. Ancak bu niyet, yasal muafiyet taahhudu yerine gecmez.

## 10) Hall of Thanks (Planned)

Onayli raporlar icin, arastirmaci izniyle katkilar security acknowledgements listesinde yayinlanir.
