# Aegis Vault Sade ve Modern Tasarım Yol Haritası

Tarih: 2026-05-18  
Hedef: Aegis Vault arayüzünü daha sade, modern, okunabilir ve profesyonel bir ürün deneyimine dönüştürmek.

## Tasarım Vizyonu

Aegis Vault özellik olarak güçlü bir güvenlik ürünü. Mevcut arayüzde ise bilgi yoğunluğu, rozet sayısı, renk çeşitliliği ve görsel vurgu katmanları yer yer fazla hissediliyor. Yeni yön, daha sakin bir güvenlik ürünü dili olmalı:

- Daha az görsel gürültü
- Daha net hiyerarşi
- Daha profesyonel metin dili
- Ölçülü animasyon
- Koyu ve açık modda aynı kalite hissi
- Türkçe ve İngilizce metinlerde kısa, güven veren ve teknik olmayan ifade standardı

1Password benzeri ürünlerde güçlü görünen taraf çok efektli bir arayüz değil; net navigasyon, sakin kartlar, hızlı arama, güvenlik merkezinin anlaşılır sunumu ve kullanıcıya ne yapacağını söyleyen temiz metinlerdir.

## Faz 1 - Tasarım Sistemi Sadeleştirme

Amaç: Ana dashboard ekranında ilk bakış karmaşasını azaltmak.

Öncelikli işler:

1. Dashboard üst barını sadeleştir.
2. Kayıt kartlarını minimal liste/kart hibritine yaklaştır.
3. Sağ paneldeki gözetleme ve kategori alanlarını daha sakin hale getir.
4. Uyarı, boş durum ve hata metinlerini daha profesyonel bir tona taşı.
5. Animasyon ve hover davranışlarını kısa, ölçülü ve premium hale getir.

Başarı kriterleri:

- Üst alanda buton kalabalığı azalır.
- Ana aksiyonlar ve yardımcı aksiyonlar görsel olarak ayrılır.
- Kart başlıkları, kullanıcı bilgisi ve güvenlik durumu daha rahat okunur.
- Kırmızı/turuncu renkler yalnızca gerçek riskte güçlü görünür.
- Koyu modda yüzeyler daha sakin, açık modda formlar daha seçilebilir olur.

## Faz 2 - Dashboard Bilgi Mimarisi

Amaç: Kullanıcı ilk ekranda sadece en önemli bilgileri görmeli.

Yapılacaklar:

- Üst bar: marka, skor, birincil aksiyon ve yardımcı araçlar olarak gruplanacak.
- Arama: ayrı ve sakin bir satırda kalacak, kapsam filtreleri daha küçük segment kontroller olacak.
- Kasa paneli: başlık, kayıt sayısı ve yeni kayıt aksiyonu dışında ekstra vurgu azaltılacak.
- Sağ panel: güvenlik özeti ilk sırada, kategoriler ikinci sırada sade ikonlu liste olarak duracak.

## Faz 3 - Kayıt Kartları

Amaç: Çok fazla detayın kart içinde aynı anda yarışmasını engellemek.

Yapılacaklar:

- Başlık ve güvenlik rozeti ana satırda kalacak.
- Site, kategori, TOTP, alias ve ek bilgileri küçük yardımcı satıra alınacak.
- Parola alanı daha sade ve tek satır kontrollü görünecek.
- Düzenle, kopyala, sil gibi aksiyonlar kompakt bir araç grubuna taşınacak.
- Riskli kayıtlar görünür olacak ama tüm kart kırmızı/turuncuya boğulmayacak.

## Faz 4 - Metin ve Mikro Kopya

Amaç: Güvenlik ürününe yakışan sakin ve profesyonel dil.

Örnek dönüşümler:

- "WASM SQLCipher Active" yerine "Yerel şifreli kasa aktif"
- "Kasanız hazır" yerine "Kasanız kullanıma hazır"
- "Şifre kullanılamıyor" yerine "Bu kayıt mevcut anahtarla çözülemedi"
- Teknik detaylar ana metne değil, bilgi ipucuna taşınacak.

## Faz 5 - Animasyon Standardı

Amaç: Modern his vermek ama dikkat dağıtmamak.

Standartlar:

- Sayfa geçişleri: 120-180ms fade/slide
- Hover: hafif yüzey tonu değişimi
- Click: kısa scale veya basma hissi
- Modal: opacity + küçük scale
- Yanıp sönen veya parlak risk efektleri yalnızca kritik uyarılarda kullanılacak.

## Faz 6 - Geniş Ekranlar

Bu fazda aşağıdaki ekranlar aynı sade tasarım sistemine bağlanacak:

- Ayarlar
- İçe/dışa aktarma
- Kurtarma provası
- Kripto kasa
- Hızlı maskeli e-posta
- Bağış ekranı
- Passkey envanteri

## Uygulama Notu

Tasarım iyileştirmeleri küçük, doğrulanabilir adımlar halinde yapılmalıdır. Her fazdan sonra açık mod, koyu mod, Türkçe ve İngilizce metinler kontrol edilmelidir.

## Uygulama Günlüğü

### 2026-05-18 - Faz 1 Başlangıç

- Dashboard üst aksiyonları sadeleştirildi.
- Kayıt kartlarındaki rozet yoğunluğu azaltıldı.
- Gözetleme Kulesi ve kategori paneli daha sakin yüzeylere bağlandı.
- Hover, gölge ve vurgu davranışları daha ölçülü hale getirildi.

### 2026-05-18 - Faz 2 Başlangıç

- Dashboard üst alanı marka, yardımcı araçlar, ana araçlar ve arama satırı olarak ayrıştırıldı.
- Arama alanı bağımsız ve geniş bir satırda konumlandırıldı.
- Arama kapsamı ve sıralama kontrolleri tek bir yardımcı araç grubu altında toplandı.
- Sağ panel sırası güvenlik özeti önce, kategoriler sonra olacak şekilde sabitlendi.
- Kasa paneli başlığı daha temiz bir ayırıcı ve daha az görsel vurgu ile düzenlendi.

### 2026-05-18 - Faz 3 Başlangıç

- Kayıt kartları daha sakin bir liste-kart hibritine yaklaştırıldı.
- Başlık, güvenlik rozeti, bağlam bilgileri ve gizli parola satırı birbirinden daha net ayrıldı.
- Sağ aksiyon alanı sabit genişlikli kompakt bir araç grubuna dönüştürüldü.
- Parola, alias, not ve ek dosya satırlarında taşma/üst üste binme riskini azaltan genişlik kuralları eklendi.
- Tablet ve mobil kırılımlarda aksiyonların alta akması sağlandı.

### 2026-05-18 - Faz 4 Başlangıç

- Giriş ekranı, dashboard ve kayıt kartlarındaki teknik mikro kopyalar daha sade ürün diline taşındı.
- "WASM SQLCipher / Active" gibi teknik ifadeler kullanıcı dostu i18n anahtarlarına alındı.
- Şifre çözülememe durumları daha anlaşılır ve panik yaratmayan bir metne dönüştürüldü.
- Boş durum metinleri daha güven veren ve aksiyon odaklı hale getirildi.
- Türkçe ve İngilizce metinlerde aynı anlam hiyerarşisi korundu.

### 2026-05-18 - Faz 5 Başlangıç

- Kayıt kartlarında kopyalama sonrası kalıcı yeşil vurgu kaldırıldı.
- Kopyalama geri bildirimi yalnızca ilgili buton içinde, kısa ve sakin bir başarı durumuna dönüştürüldü.
- Kart hover ve buton basma davranışları 160ms civarında ölçülü bir hareket standardına bağlandı.
- Gereksiz büyüme, parlama ve parçacık efekti azaltıldı.
- Hareket hassasiyeti olan kullanıcılar için `prefers-reduced-motion` desteği güçlendirildi.

### 2026-05-18 - Faz 6 Başlangıç

- Hızlı Maskeli E-posta modalı ortak sade tasarım sistemine yaklaştırıldı.
- Dekoratif arka plan parlaması kaldırıldı; modal yüzeyi daha sakin ve okunabilir hale getirildi.
- Form, sağlayıcı kartı, sonuç kartı ve aksiyon butonlarında radius/gölge/hareket yoğunluğu azaltıldı.
- Koyu mod yüzeyleri dashboard ve ayarlar panelleriyle daha tutarlı token değerlerine bağlandı.
- Hover davranışları Faz 5 hareket standardıyla uyumlu hale getirildi.

### 2026-05-18 - Faz 6 Bağış Ekranı

- Bağış modalı daha sade iki kolonlu ürün paneli görünümüne taşındı.
- Hero alanındaki yoğun gradient ve cam efekti azaltıldı.
- Kripto adres kartlarında gölge/radius/boşluk dili dashboard kartlarıyla uyumlu hale getirildi.
- QR kod kutusunun beyaz arka planı ve keskin render davranışı korunarak çevre yüzeyi sadeleştirildi.
- Koyu mod yüzeyleri aynı token sistemiyle daha dengeli hale getirildi.

### 2026-05-18 - Faz 6 Kripto Kasa Paneli

- Ortak yüzey token kullanımında `--aegis-surface` alias'ı tanımlanarak açık ve koyu mod tutarlılığı güçlendirildi.
- Kripto Kasa güvenlik bandı, hero alanı, form yüzeyi ve watch-only kartları daha sade yüzeylere bağlandı.
- Kart rozetleri, public adres kutuları, meta alanları ve aksiyon butonlarında gölge/gradient yoğunluğu azaltıldı.
- Watch-only güvenlik mesajları korunurken panelin genel dili daha sakin ve profesyonel hale getirildi.
- Geniş ekran ve dar ekran kırılımlarında kripto kartlarının daha okunabilir tek/çift kolon davranışı güçlendirildi.

### 2026-05-18 - Faz 6 Veri Yönetimi ve QR Transfer

- İçeri/dışarı aktarma, kurtarma provası, QR transfer ve denetim kartları ortak sade yüzey tokenlarına bağlandı.
- Export/import kartlarında eski gradient, yoğun gölge ve cam etkisi azaltılarak daha net görev kartları oluşturuldu.
- Kurtarma provası metrikleri ve sonuç alanı daha sakin, okunabilir ve güven veren bir kart yapısına taşındı.
- QR transfer başlangıç ve yapılandırma yüzeyleri açık/koyu modda aynı profesyonel kontrast standardına alındı.
- Mobil kırılımda veri yönetimi akış şeridi iki kolonlu, taşmayan ve okunabilir bir düzene alındı.

### 2026-05-18 - Faz 6 Passkey Envanteri

- Passkey envanteri modalı ortak yüzey, border ve gölge tokenlarına bağlanarak daha sakin bir ürün paneline dönüştürüldü.
- Filtre, sıralama, seçim özeti ve triage kutuları daha az görsel gürültüyle okunabilir hale getirildi.
- Passkey kayıt kartlarında RP ID, origin, credential ID, risk ve export hazırlığı bilgileri daha net ayrıştırıldı.
- Önerilen sonraki adım kutuları, kart içindeki yardımcı bilgi olarak daha düşük yoğunluklu yüzeye taşındı.
- Mobil görünümde modal tam ekran davranışına ve taşmayan kart akışına yaklaştırıldı.

### 2026-05-18 - Faz 6 Ayarlar Ana Kabuğu

- Ayarlar modalının ana yüzeyi, üst başlık alanı ve özet kartları daha düz, token tabanlı bir kabuğa taşındı.
- Sol navigasyonda aktif ve hover durumları daha az dramatik, daha okunabilir ve profesyonel hale getirildi.
- Sayfa başlığı, bölüm metrikleri ve durum satırı aynı sade yüzey diliyle hizalandı.
- Genel ayarlar panellerinde gölge/gradient yoğunluğu azaltılarak alt panellerle tutarlı bir görünüm sağlandı.
- Mobilde ayarlar kabuğu tam ekran davranışına yaklaştırıldı ve özet kartları tek kolonlu akışa alındı.

### 2026-05-18 - Faz 7 Tasarım Kalite Kilidi

- Dashboard, ayarlar, bağış, hızlı alias ve passkey envanteri için ortak focus-visible standardı güçlendirildi.
- Disabled buton/input davranışları tek görsel dile bağlanarak tıklanabilir görünme riski azaltıldı.
- Custom scrollbar açık/koyu modda daha ince, sakin ve ürün paletiyle uyumlu hale getirildi.
- Metin seçimi, tap highlight ve küçük geçiş süreleri aynı sade tasarım standardına bağlandı.
- Hareket hassasiyeti olan kullanıcılar için modal ve panel yüzeylerinde reduced-motion kapsamı genişletildi.

### 2026-05-19 - Faz 8 Dashboard Arama Araçları

- Dashboard arama alanının büyüteç ikonu iki modda daha net ve sabit hizalı hale getirildi.
- Arama focus durumu yeşil çizgi yerine daha nötr, sakin ve profesyonel bir yüzey vurgusuna taşındı.
- Arama kapsamı butonları ve sıralama seçimi aynı yükseklik, border ve yüzey standardına bağlandı.
- Koyu modda arama araçlarının kontrastı artırıldı; açık modda ise kontrol grubu daha temiz ve belirgin hale getirildi.
- Dar ekranlarda arama araç satırının taşma riski azaltıldı ve yatay kontrol akışı daha stabil hale getirildi.

### 2026-05-19 - Faz 9 Sağ Panel Sadelik Standardı

- Gözetleme Kulesi ve kategori panelindeki satır kartları aynı sakin rail item standardına bağlandı.
- Risk özeti rozetleri daha düşük yoğunluklu yüzey, border ve renk sistemiyle sadeleştirildi.
- HIBP tarama aksiyonu yoğun gradient uyarı görünümünden kontrollü güvenlik aksiyonu görünümüne taşındı.
- Kategori aktif/hover durumları daha az dramatik, daha okunur ve koyu modla uyumlu hale getirildi.
- Sayısal watchtower değerleri tabular hizaya alınarak panelin taranabilirliği artırıldı.
