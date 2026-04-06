# Aegis Vault - Yayın Doğrulama Rehberi (Draft)

Aegis Vault, kullanıcı güvenliğini en üst düzeyde tutmak için yayınlarını dijital olarak imzalar ve doğrulanabilir build (reproducible build) süreçlerini destekler. Bu rehber, indirdiğiniz Aegis Vault kopyasının orijinal olup olmadığını nasıl kontrol edebileceğinizi anlatır.

## 1. Kod İmzası Doğrulama (Code Signing)

Aegis masaüstü uygulamaları her platformda resmi sertifikalarla imzalanmıştır.

### Windows (.exe / .msi)

1. İndirdiğiniz `.exe` dosyasına sağ tıklayın ve **Özellikler** (Properties) seçeneğini seçin.
2. **Dijital İmzalar** (Digital Signatures) sekmesine gidin.
3. İmza listesinde `Aegis Vault` veya sertifika sağlayıcısını (örn: `Hafgit99 / DigiCert`) görmelisiniz.
4. **Ayrıntılar** (Details) butonuna tıklayarak "Bu dijital imza tamam" (This digital signature is OK) ibaresini kontrol edin.

### macOS (.dmg / .zip)

macOS, imzalanmamış ve Notarize edilmemiş uygulamaları çalıştırmaz. Yine de manuel kontrol için terminalde:

```bash
codesign -vvv --deep --strict "/Applications/Aegis Vault.app"
```

Doğrulama başarılıysa "valid on disk" ve "satisfies its Designated Requirement" çıktılarını görmelisiniz.

### Linux (.AppImage)

Aegis AppImage dosyaları GPG ile imzalanmıştır.

1. `.AppImage` ve eşlik eden `.asc` veya `.sig` dosyasını indirin.
2. Aegis GPG anahtarını içe aktarın:

```bash
gpg --keyserver keyserver.ubuntu.com --recv-keys [AEGIS_GPG_KEY_ID]
```

3. Doğrulayın:

```bash
gpg --verify aegis-vault-4.2.0.AppImage.asc
```

## 2. Hash Kontrolü (SHA-256)

Her sürümle birlikte yayınlanan `SHA256SUMS` dosyasını kullanarak dosya bütünlüğünü doğrulayabilirsiniz.

```bash
# Windows (PowerShell)
Get-FileHash .\AegisVault-Setup-4.2.0.exe -Algorithm SHA256

# Linux / macOS
sha256sum AegisVault-4.2.0.AppImage
```

## 3. GitHub Attestation ve SLSA (Yeni)

Aegis 4.2+, GitHub Actions tarafından imzalanmış "Build Attestation" belgelerini içerir.
GitHub web arayüzündeki release sayfasından "Attestation" sekmesine tıklayarak, binary'nin gerçekten GitHub altyapısında ve hangi commit ile üretildiğini cryptographic olarak doğrulayabilirsiniz.

## 4. Otonom Doğrulama (Build Trust Panel)

Uygulamanın içindeki **Ayarlar > Yayın Güven Zinciri (Release Trust)** panelinden, aktif çalışan kopyanın bütünlük durumunu ve signing sertifikası bilgilerini canlı olarak görebilirsiniz.
