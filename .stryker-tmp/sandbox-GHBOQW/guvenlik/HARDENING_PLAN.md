# Aegis Vault 10 Maddelik Sertleştirme Planı

## Amaç

Bu belge, Aegis Vault'un güvenlik mimarisini hızlı ama profesyonel şekilde sertleştirmek için uygulanabilir 10 maddelik bir plan sunar. Maddeler etki, zorluk ve önceliğe göre sıralanmıştır.

## Uygulanan İyileştirmeler (2026-03-12)

Bu planın Faz 1 kapsamındaki bazı maddeleri için ilk üretim adımları uygulanmıştır:

1. Domain dışı credential fallback davranışı kaldırıldı (yalnızca ilgili site kayıtları gösteriliyor).
2. Content script veri isteme modeli `GET_VAULT` yerine `GET_DOMAIN_CREDS` olacak şekilde daraltıldı.
3. Background tarafında domain doğrulamalı minimal yanıt modeli eklendi (`sender.tab.url` ile eşleşme zorunlu).
4. Extension cache'e alınan kayıtlar sanitize edilmeye başlandı (website ve parola zorunlu).
5. PWA tarafındaki periyodik plaintext sync kaldırıldı; sync yalnızca kayıt değiştiğinde tetikleniyor.
6. Extension overlay mesajları iki dilliliğe uygun şekilde locale tabanlı hale getirildi (TR/EN).
7. Domain-scoped credential çağrılarına request nonce zorunluluğu eklendi.
8. Domain-scoped çağrılara tab+domain bazlı kısa aralık rate-limit eklendi.
9. Legacy `GET_VAULT` endpointi varsayılan olarak kapatıldı.
10. Popup katmanı da domain-scoped istek modeline taşındı; domain dışı fallback listeleme kaldırıldı.
11. Electron sync server için tek kullanimlik challenge endpointi eklendi (`/api/challenge`).
12. Extension -> Electron isteklerinde HMAC-SHA256 challenge imzasi zorunlu hale getirildi.
13. Challenge nonce tek kullanimli ve TTL sinirli olacak şekilde replay korumasi uygulandi.
14. `X-Aegis-Extension-Id` allowlist dogrulamasi desktop bridge'e eklendi.
15. Extension ID sabiti runtime/env tabanli modele tasindi (hardcoded kimlik azaltildi).
16. Electron allowlist konfiguru env degiskenleriyle yonetilebilir hale getirildi.
17. Metadata encryption Faz-3 iskeleti eklendi (title/username/website at-rest sifreleme).
18. Legacy kayitlar icin lazy metadata migration eklendi; veri okuma akisi bozulmadan kademeli gecis saglandi.
19. HMAC tabanli blind `search_index` yapisi eklendi (private search index Faz-1).
20. Arama filtreleme akisi `search_index` hash karsilastirma ile daraltildi; metadata plaintext index ihtiyaci azaltildi.
21. Metadata encryption kapsami `category` ve `tags` alanlarini da icerecek sekilde genisletildi.
22. Attachment metadata (name/type) at-rest sifreli saklama modeline tasindi.
23. `vaultService` tarafina private index + lazy migration + attachment metadata regression testleri eklendi.
24. PWA bridge tarafinda challenge-response + HMAC imzali request kontrati devreye alindi.
25. Auth verifier katmani Argon2id (`argon2id-v1`) modeline tasindi; PBKDF2 sadece legacy gecis icin tutuldu.
26. Legacy PBKDF2 credential giris sirasinda otomatik Argon2id migration ve dual-store metadata guncellemesi eklendi.
27. Search index performans takibi icin benchmark testi ve npm script eklendi.
28. Passkey payload profile/db baglama kontrolu eklendi (yanlis vault baglaminda risk azaltildi).
29. Passkey metadata + 90 gun rotasyon uyarisi + manuel revoke aksiyonu eklendi.
30. Deep wipe akisinda passkey metadata artefact temizligi tamamlandi.
31. Passkey binding depolamasi profil-bazli merkezi modele tasindi (`aegis_passkey_bindings_v1`).
32. Passkey recovery export/import (sifreli paket + profil/db uyum dogrulamasi) eklendi.
33. Watchtower HIBP taramasi privacy opt-in toggle ile kontrol edilir hale getirildi.
34. HIBP network hatalarinda `unknown` sonuc modeli ve kullanici bildirimi eklendi.
35. localStorage audit/cleanup aksiyonu ayarlar paneline eklendi.
36. TOTP icin "same vault" / "separate 2FA vault" profil modu eklendi.
37. Ayrik 2FA modunda ana kasada TOTP yazimi engellendi (veri akisi policy enforcement).
38. Ayrik moda gecis icin migration uyarisi ve 2FA kasasina hizli gecis aksiyonu eklendi.
39. Passkey recovery/revocation regression test kapsamı genişletildi (`PasskeyBindingService.test.ts`).
40. TOTP vault policy regression testleri eklendi (`TotpVaultPolicy.test.ts`).
41. HIBP privacy unknown-state regression testleri eklendi (`HIBPService.test.ts`).

Bu sürümde henüz tamamlanmayan ama sıradaki adımlar:

- ✅ Köprü kimlik doğrulamasını challenge-response/HMAC ile güçlendirme.
- ✅ Metadata encryption ve private search index mimarisine geçiş.
- ✅ PBKDF2 doğrulama katmanını Argon2id migration ile kapatma.

## Durum Özeti (Check İşaretli)

### Tamamlanan Maddeler

- ✅ Madde 1: Loopback bridge sertleştirme (challenge/HMAC/replay koruması)
- ✅ Madde 2: Full vault plaintext sync kaldırma (domain-scoped veri modeli)
- ✅ Madde 3: Metadata encryption + private search index katmanı
- ✅ Madde 4: Auth verifier Argon2id migration + legacy PBKDF2 auto-migration
- ✅ Madde 9: Security regression test genişletmeleri (vault + extension)
- ✅ Ek: Search index benchmark script/test altyapısı

### Kısmen Başlanan / Bekleyen Maddeler

- ✅ Madde 5: Passkey ve local recovery model sertleştirmesi (recovery transfer + profil-bazli revoke dahil)
- ✅ Madde 6: TOTP güvenlik profilleri (ayrı 2FA vault modu + migration uyarıları)
- ✅ Madde 7: HIBP privacy-first iyileştirmeleri (opt-in + unknown fallback + bildirim)
- ✅ Madde 8: localStorage/plain UI state denetimi (audit cleanup aksiyonu eklendi)
- ✅ Madde 10: Whitepaper + threat model + disclosure + external audit prep dokumanlari hazirlandi

### Madde 10 Durum Notu

- ✅ Whitepaper hazirlandi: `guvenlik/SECURITY_WHITEPAPER.md`
- ✅ Threat model dokumani: `guvenlik/THREAT_MODEL.md`
- ✅ Disclosure policy dokumani: `guvenlik/SECURITY_DISCLOSURE.md`
- ✅ External audit prep checklist: `guvenlik/EXTERNAL_AUDIT_PREP.md`

## Sıradaki Adımlar (Uygulamaya Hazır)

1. Passkey recovery-revocation ve çoklu cihaz senaryolarını finalize et.
2. HIBP için opt-in/unknown-state/policy metnini ayar ekranına taşı.
3. TOTP için ayrı 2FA vault profilini devreye al ve iki dilde metinleri güncelle.
4. localStorage veri sınıflandırması + temizleme politikası uygula.
5. Threat model + security whitepaper + disclosure policy taslaklarını tamamla.

---

## 1. Loopback Bridge'i Kapat veya Native Messaging'e Geç

### Neden

Mevcut localhost bridge, uygulamanın en riskli bölgelerinden biri.

### Ne yapılmalı

- Birincil hedef: native messaging
- Alternatif:
  - session secret
  - HMAC signing
  - nonce replay koruması
  - request expiry
  - rate limiting
  - endpoint minimization

### Etki

Çok yüksek

### Zorluk

Yüksek

### Öncelik Puanı

10/10

---

## 2. Full Vault Plaintext Sync'i Sonlandır

### Neden

Unlock sonrası tüm kasa plaintext olarak farklı süreçlere taşınıyor.

### Ne yapılmalı

- Tüm vault yerine seçili domain kayıtları
- Kullanıcı aksiyonlu decrypt
- Kısa ömürlü cache
- Fill sonrası anında wipe

### Etki

Çok yüksek

### Zorluk

Orta-yüksek

### Öncelik Puanı

10/10

---

## 3. Metadata Encryption Katmanı Ekle

### Neden

Bugün saldırgan storage dump alırsa site listesi ve kullanıcı adı gibi çok şey öğrenebilir.

### Ne yapılmalı

- title, username, website, tags, category, attachment metadata şifrele
- arama için blind index kur
- private search mode ekle

### Etki

Çok yüksek

### Zorluk

Yüksek

### Öncelik Puanı

9.5/10

---

## 4. Auth Verifier'ı Argon2id'e Taş

### Neden

Vault key derivation güçlü ama verifier katmanında PBKDF2 kalıyorsa seviye dengesiz oluyor.

### Ne yapılmalı

- Yeni vault'larda Argon2id verifier
- Eski vault'lar için migration
- Versioned credential format

### Etki

Yüksek

### Zorluk

Orta

### Öncelik Puanı

8/10

---

## 5. Passkey ve Local Recovery Modelini Sertleştir

### Neden

PRF tabanlı model çok iyi fikir ama operational güvenlik ve recovery tarafı daha net olmalı.

### Ne yapılmalı

- passkey binding modelini belgelemek
- localStorage'da tutulan passkey related state'i minimuma indirmek
- revoke / reset akışı eklemek
- multi-device passkey senaryolarını netleştirmek

### Etki

Yüksek

### Zorluk

Orta

### Öncelik Puanı

7.5/10

---

## 6. TOTP Güvenlik Profilleri Ekle

### Neden

Aynı kasada parola + TOTP saklamak kullanışlı ama maksimum ayrışma sağlamaz.

### Ne yapılmalı

- standard mode: aynı kasada tut
- paranoid mode: ayrı 2FA vault öner
- kullanıcıya risk açıklaması sun

### Etki

Orta

### Zorluk

Düşük

### Öncelik Puanı

6.5/10

---

## 7. HIBP ve Network Özelliklerini Privacy-First Hale Getir

### Neden

K-anonymity iyi ama hata, izin ve kullanıcı farkındalığı akışları daha iyi olabilir.

### Ne yapılmalı

- varsayılan opt-in
- "safe" yerine "unknown" fallback
- kullanıcıya net privacy metni
- manuel/otomatik scan ayrımı

### Etki

Orta

### Zorluk

Düşük-orta

### Öncelik Puanı

6/10

---

## 8. localStorage ve Plain UI State'i Gözden Geçir

### Neden

Bazı profil ve durum bilgileri plaintext UI storage'da kalıyor.

### Ne yapılmalı

- localStorage'daki tüm Aegis anahtarlarını audit et
- hassas/yarım hassas alanları sıfırla veya şifrele
- güvenlik ayarları için daha net veri sınıflandırması yap

### Etki

Orta

### Zorluk

Düşük-orta

### Öncelik Puanı

6/10

---

## 9. Security Regression ve Abuse Test Paketi Yaz

### Neden

Güvenlik özellikleri sadece implement edilmekle kalmamalı, kırılmadıkları sürekli test edilmeli.

### Ne yapılmalı

- malicious origin tests
- replay attack tests
- loopback abuse tests
- lock sonrası residue tests
- metadata leak tests
- corrupted migration tests

### Etki

Yüksek

### Zorluk

Orta

### Öncelik Puanı

5.5/10

---

## 10. Audit, Whitepaper ve Disclosure Programı Başlat

### Neden

Teknik kaliteyi güvenilirlik ve pazar algısına çevirmek için dış doğrulama gerekir.

### Ne yapılmalı

- security whitepaper
- public threat model
- responsible disclosure policy
- bug bounty veya coordinated disclosure
- dış audit planlaması

### Etki

Çok yüksek

### Zorluk

Orta-yüksek

### Öncelik Puanı

8/10

---

# Uygulama Sırası

## Faz 1

1. Bridge redesign
2. Full-vault plaintext sync removal
3. Metadata encryption tasarımı

## Faz 2

4. Argon2id verifier migration
5. Passkey sertleştirme
6. localStorage audit
7. HIBP privacy refinements

## Faz 3

8. Security regression suite
9. Whitepaper + threat model
10. External audit hazırlığı

---

# Beklenen Sonuç

Bu plan uygulanırsa Aegis Vault:

- teknik olarak daha savunulabilir olur
- rakiplerle karşılaştırmada daha ciddi görünür
- privacy odaklı kullanıcılar için daha güvenilir hale gelir
- offline-first kategorisinde güçlü bir fark yaratır

Bugünkü en büyük kazançlar:

- attack surface daralması
- metadata gizliliği
- plaintext yayılımın azalması
- ürün güvenilirliğinin artması

Uzun vadeli en büyük kazançlar:

- audit hazırlığı
- pazar güveni
- profesyonel ürün seviyesine geçiş
