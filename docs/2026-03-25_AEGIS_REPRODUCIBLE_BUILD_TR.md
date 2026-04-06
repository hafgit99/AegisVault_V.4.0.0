# Aegis Vault: Reproducible Build Guide

## 1. Amac

Aegis Vault, kullanicilarin yayınlanan binary'lerin (exe, dmg, AppImage) gercekten kaynak kodundan üretildigini bagimsiz olarak dogrulayabilmesini saglar.

## 2. Reproducible Build Nedir?

Aynı kaynak kodu, aynı build ortamı ve aynı bagımlılıklar kullanıldıgında, bit-seviyesinde aynı binary'nin üretilmesi işlemidir.

## 3. Adim Adim Dogrulama

### 1. Kaynak Kodu Alin

Yayinlanan sürümün tag'ini indirin:

```bash
git clone https://github.com/hafgit99/AegisVault.git
cd AegisVault
git checkout v4.2.0
```

### 2. Docker ile Build Ortami Kurun

Aegis, deterministic buildler icin Docker kullanir:

```bash
docker build -t aegis-build .
```

### 3. Binary'i Bildirin

```bash
docker run --rm -v $(pwd)/release:/app/release aegis-build
```

### 4. Hash Karsilastirmasi

Build tamamlandığında `release/` dizininde üretilen dosyaların SHA256 hash'lerini, GitHub'da yayınlanan `aegis-release-manifest.json` içindeki hash'lerle karşılaştırın.

```bash
sha256sum release/AegisVault-Setup.exe
```

## 4. Bilinen Sapmalar (Variations)

Bazı durumlarda (örneğin imzalama zaman damgası) hash'ler farklılık gösterebilir. Bu durumlar `aegis-release-provenance.json` dosyasında detaylandırılır.
