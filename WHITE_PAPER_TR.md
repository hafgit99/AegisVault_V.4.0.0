# Aegis Vault V.4.0.0 Teknik Whitepaper

## 1. Yönetici Özeti
Aegis Vault V.4.0.0, çoklu platformda hassas veri yönetimi (şifreler, belgeler ve özel kimlik bilgileri) sağlamak üzere tasarlanmış yeni nesil, yüksek güvenlikli bir dijital kasadır. **Sıfır Bilgi Mimarisi (Zero-Knowledge Architecture)** üzerine kurulu olan Aegis Vault, kullanıcının verilerinin depolanmadan önce kendi cihazında yerel olarak şifrelenmesini sağlar. Bu teknik doküman (whitepaper), Aegis Vault'u en güvenli ve görsel açıdan en gelişmiş kişisel güvenlik çözümlerinden biri yapan teknik temelleri, kriptografik ilkeleri ve mimari kararları ayrıntılı olarak açıklamaktadır.

## 2. Temel Mimari Prensipler
Aegis Vault, herhangi bir sunucunun veya depolama katmanının asla çözülmüş verilere veya kullanıcının ana şifresine (Master Password) erişemediği bir istemci tarafı uygulaması olarak tasarlanmıştır.

*   **Sıfır Bilgi Uygulaması (Zero-Knowledge)**: Tüm şifreleme ve deşifreleme işlemleri yalnızca kullanıcının tarayıcısında veya Electron ana sürecinde (Main Process) gerçekleşir. Hiçbir düz metin verisi veya şifreleme anahtarı ağ üzerinden iletilmez.
*   **Çoklu Platform Ayrışımı**: Temel mantık (`VaultService.ts`), Web Uygulaması, Tarayıcı Uzantısı (WXT) ve Masaüstü Uygulaması (Electron) genelinde paylaşılarak tutarlı bir güvenlik duruşu sağlar.
*   **Estetik-Güvenlik İkilisi**: Aegis Vault, alt düzey kriptografik işlemlerin titizliğinden ödün vermeden, premium bir kullanıcı arayüzüne ve deneyimine (React 19 ve Framer Motion ile oluşturulmuş) öncelik verir.

## 3. Kriptografik Çerçeve
Aegis Vault, veri gizliliğini ve bütünlüğünü sağlamak için endüstri standardı ve hakemli kriptografik algoritmalar kullanır.

### 3.1. Anahtar Türetme Fonksiyonu (KDF): Argon2id
Kaba kuvvet (brute-force) ve donanım hızlandırmalı (ASIC/GPU) saldırıları azaltmak için Aegis Vault, ana anahtar türetimi için **Argon2id** (`hash-wasm` via) kullanır.
*   **Bellek-Yoğun Süreç (Memory-Hard)**: 64 MB bellek, 3 yineleme (iterations) ve 1 paralellik faktörü ile yapılandırılmıştır.
*   **Birleşik Materyal (Combined Material)**: Anahtar, hem kullanıcının **Ana Şifresinden** hem de **Cihaza Özel Güvenli Bir Anahtardan** türetilerek çift katmanlı bir koruma mekanizması oluşturur.
*   **Dinamik Tuzlama (Dynamic Salt)**: Her kasa örneği, gökkuşağı tablosu (rainbow table) saldırılarını önlemek için kriptografik olarak güvenli, rastgele 16 baytlık bir tuz (`crypto.getRandomValues`) üretir.

### 3.2. Simetrik Şifreleme: AES-256-GCM
Duran veriler (data-at-rest), 256 bitlik bir anahtara sahip **Galois/Counter Mode (GCM)** modunda **Gelişmiş Şifreleme Standardı (AES)** kullanılarak korunur.
*   **Kimlik Doğrulamalı Şifreleme (Authenticated Encryption)**: AES-GCM hem gizlilik hem de veri bütünlüğü (kurcalamaya karşı korumalı şifreleme) sağlar. Şifreli metin değiştirilirse, şifre çözme otomatik olarak başarısız olur.
*   **Başlatma Vektörü (IV)**: Web Crypto API kullanılarak her bir giriş ve ek için benzersiz bir 12 baytlık IV oluşturulur; bu da aynı şifrelerin farklı şifreli metinlerle sonuçlanmasını sağlar.

### 3.3. Kimlik Doğrulama: SHA-256 ile PBKDF2
Yerel kasa kilidini açmak için, doğrulama amacıyla ana şifrenin ayrı bir **PBKDF2** karması (hash) kullanılır.
*   **Parametreler**: SHA-256 HMAC ile 100.000 yineleme.
*   **Dışa Aktarılamayan Anahtarlar**: Web Crypto Subtle API'sine aktarılan CryptoKey'ler `{ extractable: false }` olarak işaretlenir ve bellek tarama araçlarının ham ana anahtarı dışa aktarması engellenir.

## 4. Depolama Mimarisi (OPFS ve SQLCipher Simülasyonu)
Aegis Vault, veri kalıcılığını ve performansını sağlamak için modern tarayıcı depolama API'lerinden yararlanır.
*   **Diske Doğrudan Erişim (OPFS)**: Desteklenen ortamlarda Aegis Vault, yüksek performanslı ve özel veri depolaması için **Origin Private File System (OPFS)** mimarisini hedefler.
*   **IndexedDB (IDB) Geri Dönüşü**: Daha geniş uyumluluk için Aegis Vault, sağlam bir depolama katmanını simüle etmek üzere `idb` kütüphanesini kullanır.
*   **SQLCipher Mantığı**: Uygulama, SQLCipher'a benzer mantıksal yapılar uygulayarak tüm veritabanı düzeyindeki bölümlerin (şifreler, meta veriler, ekler) şifreli kalmasını sağlar.

## 5. Güvenlik Sıkılaştırma ve Bellek Yönetimi
Aegis Vault birkaç "derinlemesine savunma" (defense-in-depth) önlemi uygular:
*   **Bellek Temizliği (Sanitization)**: Kasa kilitlendiğinde, hassas anahtar materyali (Uint8Array), bellekten temizlenmeden önce rastgele değerlerle (`crypto.getRandomValues`) açıkça üzerine yazılır.
*   **Otomatik Kilitleme Mekanizması**: Sistem, belirli bir süre işlem yapılmadığında veya manuel kilitleme sonrasında aktif veritabanı bağlantılarını otomatik olarak sonlandırır ve oturuma özel CryptoKey'leri temizler.
*   **Eski Sürüm Geçiş Mantığı**: Aegis Vault, eski statik tuzlu kasaları veri kaybı olmadan yeni dinamik tuz standardına yükseltme mantığını içerir ve gelişmiş güvenlikle geriye dönük uyumluluk sağlar.

## 6. Genişletilmiş Özellikler
*   **Güvenli Dosya Ekleri**: 50 MB'a kadar olan dosyalar, IndexedDB'de Blob olarak saklanmadan önce aynı AES-256-GCM mantığı kullanılarak şifrelenir.
*   **QR Veri Senkronizasyonu**: Şifrelenmiş kasa verilerinin QR kodları aracılığıyla güvenli, yalnızca yerel olarak senkronize edilmesi; merkezi bir bulut merkezine olan ihtiyacı ortadan kaldırır.
*   **Akıllı Çöp Kutusu**: Silinen öğeler için 30 günlük bir saklama sistemi, kalıcı kriptografik silme işleminden önce güvenli kurtarmaya olanak tanır.

## 7. Teknik Yığın (Tech Stack)
| Katman | Teknoloji |
| :--- | :--- |
| **Mantık** | TypeScript 5.x |
| **Arayüz Framework** | React 19 |
| **Animasyon** | Framer Motion |
| **Kriptografi** | Web Crypto API, hash-wasm |
| **Derleme Sistemi** | Vite 7, Electron 40 |
| **Platform** | Windows, Web, Chrome/Edge/Firefox |

## 8. Sonuç
Aegis Vault V.4.0.0, dijital güvenliğe modern bir yaklaşımı temsil eder. Argon2id'in bellek-yoğun direncini AES-256-GCM'nin verimliliği ve bütünlüğü ile birleştirerek bireyler ve profesyoneller için "Askeri Düzeyde" bir ortam sunar. Sıfır Bilgi mimarisi, gizliliğin sadece bir politika değil, teknik matematiksel bir kesinlik olmasını sağlar.

---
*© 2026 Aegis Vault Projesi. Teknik Dokümantasyon Versiyon 1.0.0.*
