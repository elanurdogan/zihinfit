# Lumo v2 — Durum Analizi ve Yol Haritası

> Bu dosya, Lumo v2 projesinde çalışacak Claude Code oturumuna ve ekibe bağlam sağlamak için hazırlanmıştır.
> Proje klasöründe bulunması beklenen dosyalar: `index.html`, `script.js`, `style.css`
> (ve isteğe bağlı olarak `lumosity_feedbacks.txt`).

**Özet:** Mevcut site şu haliyle hiçbir oyunu ekranda gösteremiyor. Önce sağlam bir temel kurmalı, sonra
30 oyun yerine 5–6 oyunu, kullanıcıların en çok istediği özelliklerle birlikte iyi yapmalıyız.

**Çalışma rolleri:** Kıdemli frontend mühendisi, oyun sistemleri geliştiricisi ve QA mühendisi.

---

## 1. Feedback dosyası analizi

Dosyada 2014-06 ile 2026-09 arasında yazılmış **49.703 Google Play yorumu** var.
Puanların dağılımı şöyle: 32.595 yorum 5★, 8.381 yorum 4★, 2.938 yorum 3★, 1.640 yorum 2★, 4.149 yorum 1★.
Puan ortalaması 2014'te 3,86 iken 2026'da 4,55'e çıkmış.

### Oyun adının geçtiği yorumlar

| Oyun | Yorum | Ort. | 1–2★ | Kullanıcıların ana şikâyeti |
|---|---|---|---|---|
| Train of Thought | 189 | 4,19 | 20 | Renk körleri trenleri ayırt edemiyor, raylar ince ve dokunması zor, 13. seviyeden 14.'ye zorluk birden çok artıyor |
| Trouble Brewing | 70 | 3,80 | 12 | Güncellemeden sonra simgeler küçülmüş, takılmalar ve gecikme var |
| Pet Detective | 30 | 3,90 | 4 | Çok uzun sürüyor, seçilmeyen ev vurgulanıyor |
| Word Bubbles | 25 | 4,04 | 3 | Geçerli kelimeleri kabul etmiyor, hızlı yazınca harf kaçıyor (en çok beğeni alan yorum: 243👍) |
| Tidal Treasures | 23 | 3,30 | 7 | 35 öğeden sonra bozuluyor, seçilmeyen öğeyi seçilmiş sayıyor |
| Fuse Clues | 18 | 3,22 | 6 | İlerleme kaydedilmiyor, başka bir doğru cevap verince yanlış sayıyor |
| Memory Matrix | 18 | 3,39 | 5 | Tek bir hatada bütün puan gidiyor |
| Star Search | 16 | 2,62 | 7 | Yanlışlıkla bitişikteki şekli seçiyor, oyun ortasında kapanıyor |

### Konu bazlı temalar

| Tema | Yorum | Beğeni | Ort. |
|---|---|---|---|
| Hep aynı oyunların gelmesi, oyun seçememek | 376 | 2.990 | 3,03 |
| Açıklama/tutorial yetersizliği | 283 | 1.474 | 3,47 |
| Ani zorluk artışı | 146 | 1.242 | 3,44 |
| Ses/müzik sorunları | 141 | 1.190 | 3,26 |
| Küçük butonlar, dokunma hassasiyeti | 91 | 857 | **2,49** |
| Yeniden başlat/duraklat (onay sorulmadan sıfırlanma) | 73 | 642 | 2,68 |
| Renk körlüğü | 61 | 229 | **2,43** |
| Zamansız pratik ("Zen") modu isteği | 38 | 143 | 4,03 |
| Çökme / hata / gecikme | 136 / 152 / 88 | – | 2,4–3,0 |

En büyük şikâyet konusu premium ve abonelik (1.810 + 949 yorum). Bu bizim kapsamımız dışında.
Ama oradan çıkan mesaj işimize yarıyor: kullanıcılar **oyunları seçebilmek ve değiştirebilmek** istiyor.

---

## 2. Mevcut sitenin durumu

Site headless Chromium'da çalıştırılarak test edildi. Sonuçlar:

### Kritik sorunlar

1. **Hiçbir oyun açılmıyor.** 1, 7, 8, 9 ve 15. oyunlar denendi, hepsi `display: none` kalıyor.
   Sayfa açılırken `index.html` sonundaki inline script kutulara `style.display='none'` atıyor.
   `startNewGame` ise sadece `hidden` sınıfını kaldırıyor ve `style.css`'te `.hidden` diye bir kural da yok.
2. **`index.html` ile `script.js` iki farklı uygulamaya ait.** `script.js` içinde `welcome-screen`, `menuView`,
   `trainOfThought`, `tot-high` gibi elemanlar aranıyor ama `index.html`'de yoklar. Bu yüzden `window.onload`
   sırasında `Cannot read properties of null` hatası çıkıyor (`script.js` ~62. satır). Klavye ok tuşlarına basınca
   da aynı hata tekrar tekrar çıkıyor (`script.js` ~194. satır).
3. **Menüdeki 1–6. oyunların yazılmış kodu çağrılmıyor.** Train of Thought, Fuse Clues, Contextual, Eagle Eye,
   Top Secret ve Memory Match için kod mevcut, ama `startNewGame` bu fonksiyonlara bağlı değil.
4. **8. oyun:** `initFrogJump` diye bir fonksiyon tanımlı değil, `ReferenceError` veriyor. `try/catch` hatayı
   sadece gizliyor, "Anti-Bug" etiketi gerçeği yansıtmıyor.
5. **10–30. oyunlar boş kutulardan ibaret.** 30 oyunluk bir platform vaat edilmiş ama çalışan kod yok.

### Mantık hataları (QA)

- **7. oyun (Kelime Avı):** Tıklanan her kelime puan veriyor, yanlış cevap diye bir şey yok. Yani ortada bir oyun yok.
- **9. oyun (Sürekli Dikkat):** `gameInterval` yerel değişken. Oyun her başlatıldığında yeni bir interval açılıyor
  ve eskisi durmuyor. Ayrıca kaçırılan eşleşmeler cezalandırılmıyor.
- **Fuse Clues:** Sahte sayılar rastgele üretildiği için hedefe ulaşan ikinci bir doğru çift oluşabiliyor ve o çift
  seçilince yanlış sayılıyor. Feedback'teki "başka bir doğru cevap verince yanlış sayıyor" şikâyetini birebir
  tekrar ediyoruz.
- **Eagle Eye, Memory Match, Top Secret:** `end*` fonksiyonları grid/talimat alanını gizliyor, `start*`
  fonksiyonları tekrar göstermiyor. İkinci oyunda ekran boş kalıyor.
- **Analiz (`generateFullCognitiveAnalysis`):** 15 oyun oynanmadan sonuç vermiyor (şu an sadece 3 oyunun başlatma
  kodu var). Sonucu ekrana yazan satır yorum satırı yapılmış, yani sonuç sadece konsola gidiyor. Kategoriler
  `gameId % 5` ile atanıyor, bu yüzden "Hafıza Matrisi" Dikkat kategorisine düşüyor. Oyunların puanları da ortak
  bir ölçeğe getirilmeden toplanıyor.
- **Train of Thought:** 20 ms'lik `setInterval` ile çalışıyor, `requestAnimationFrame` kullanılmıyor. Tren tamamen
  renge bağlı, renk körlüğüne karşı bir destek yok.

### Teknik borç

- `lumosity_logo.png` dosyası eksik (404 hatası).
- Nunito fontu yüklenmiyor.
- Çok sayıda inline stil var.
- Global değişkenler ve kopyala-yapıştır kalıplar her yerde.
- Lumosity markası ve logosu kullanılıyor. Kendi marka kimliğimizi (Lumo v2) kullanmamız önerilir.

---

## 3. Önerilen kapsam: hangi oyun, hangi özellik

Hedef 30 yarım oyun değil, **6 çalışan oyun** olmalı. Her oyuna verideki bir şikâyete karşılık gelen en az bir
özellik eklenecek:

| Oyun | Geliştirilecek özellik | Dayandığı feedback |
|---|---|---|
| Train of Thought | **Renk körü modu:** tren ve istasyonlarda şekil ya da sembol, yüksek kontrastlı palet, daha geniş ray dokunma alanı, daha yumuşak zorluk eğrisi | Renk körlüğü (2,43★), küçük butonlar (2,49★) |
| Fuse Clues | **Tüm geçerli çiftleri kabul eden doğrulayıcı**, tek doğru çözüm garantili soru üretimi, ilerlemenin kaydedilmesi, ipucu | "Başka doğru cevabı kabul etmiyor", "ilerleme kaydolmuyor" |
| Memory Match / Matrix | **Kısmi puan:** tek hatada her şey silinmiyor, adaptif seviye (hata olursa 1 seviye geri) | "Tek hatada tüm puan gidiyor" |
| Eagle Eye | **Zen / pratik modu:** süre yok, skor kaydedilmiyor | 38 yorum, 4,03★ |
| Contextual / Word | **Genişletilmiş Türkçe sözlük** ve oyun sonunda kelimelerin anlamlarının gösterilmesi | Word Bubbles (243👍), "anlamları göster" isteği |
| Top Secret | Rota tekrar jokeri zaten var. Yanına **ilk oynayışta adım adım interaktif tutorial** | Tutorial teması (1.474👍) |

### Tüm oyunlara gelecek özellikler

- **Günlük antrenmanda oyun değiştirme ve tekrar engelleme algoritması.** Bu, fiyat dışındaki en büyük tema (2.990👍).
- Duraklatma ve yeniden başlatmada onay sorulması.
- Ses aç/kapat.
- Her oyundan önce kısa bir "nasıl oynanır" kartı.
- Kalıcı skor ve ilerleme.

---

## 4. Mimari (frontend ve oyun sistemleri)

- **Yapı:** Build adımı olmadan vanilla JS ve ES modules, `games/<oyun>.js` şeklinde ayrı modüller. Her oyun ortak
  bir arayüze uyacak: `mount(el, ctx)`, `start()`, `pause()`, `resume()`, `destroy()` ve sonucu
  `{ score, accuracy, level, durationMs }` olarak döndürecek. Böylece interval sızıntıları ve null elemanlar
  yapısal olarak ortadan kalkar.
- **GameManager:** Tek aktif oyun olacak. Oyun değişince `destroy()` çağrılacak.
  Durum makinesi şöyle: `intro → playing ⇄ paused → result`.
- **Oyun döngüsü:** Hareketli oyunlarda `requestAnimationFrame` ve delta-time kullanılacak. Sayaçlar tek bir
  zamanlayıcı servisinden yönetilecek.
- **Seeded RNG ve soru üreticileri:** Saf fonksiyonlar olacak, böylece birim testleri yazılabilir. Fuse Clues'ta tek
  doğru çözüm garantisi bu katmanda sağlanacak.
- **Servisler:** Versiyonlu anahtarlarla `StorageService` (`lumo:v2:scores`), ayarlar için `SettingsStore`
  (renk körü modu, ses, reduced motion), oyun seçimi ve tekrar engelleme için `WorkoutService`.
- **Analiz:** Her oyunun puanı 0–100 arasına normalize edilecek. Kategoriler oyun tanımında açıkça yazılacak,
  modulo ile atanmayacak.
- **UI:** Pointer Events kullanılacak, dokunma hedefleri en az 44×44 px olacak. Tasarım mobil öncelikli, klavye
  desteği ve `prefers-reduced-motion` desteği olacak. Renk tokenları `:root` altında tanımlanacak.

Önerilen klasör yapısı:

```
lumo-v2/
├─ index.html
├─ css/
│  └─ style.css
├─ js/
│  ├─ main.js
│  ├─ core/        (GameManager, timer, rng)
│  ├─ services/    (StorageService, SettingsStore, WorkoutService)
│  └─ games/       (trainOfThought.js, fuseClues.js, memoryMatch.js, eagleEye.js, contextual.js, topSecret.js)
├─ tests/
│  ├─ unit/
│  └─ e2e/
└─ RAPOR.md
```

> Not: ES modules `file://` üzerinden açılınca tarayıcıda çalışmaz. Geliştirme sırasında basit bir yerel sunucu
> kullanılmalı (ör. `npx serve .` veya VS Code "Live Server").

---

## 5. QA stratejisi

- **Birim testleri (Vitest):** Soru üreticileri, Fuse Clues doğrulayıcısı, skor normalizasyonu, tekrar engelleme
  algoritması.
- **E2E testleri (Playwright):** Her oyun için aç → oyna → bitir → tekrar oyna senaryosu. Konsolda hiç hata
  olmamasını ve ikinci oyunda ekranın boş kalmamasını kontrol edecek. Bu, bugün bulunan regresyon sınıflarını yakalar.
- **Test matrisi:** 390 px mobil ve masaüstü, Chromium ve WebKit, sadece klavye, renk körlüğü simülasyonu
  (DevTools vision deficiency), Lighthouse erişilebilirlik puanı en az 90.
- **Kabul kriterleri:** Her özellik feedback'teki bir şikâyete bağlanacak.
  Örnek: "Renk körü modunda Train of Thought yalnızca sembolle oynanabilir olmalı."

---

## 6. Fazlar

| Faz | İş | Çıktı |
|---|---|---|
| 0 – Stabilizasyon | HTML/JS uyumsuzluğunu çözmek, 1–6. oyunları bağlamak, gizleme/gösterme hatasını düzeltmek | Açılan ve oynanan 6 oyun |
| 1 – Çekirdek | Modül yapısı, GameManager, servisler, test altyapısı | Ortak oyun arayüzü |
| 2 – Oyunlar ve özellikler | 3. bölümdeki tabloyu uygulamak, her oyun için ayrı commit/PR | 6 oyun ve her birine en az 1 yeni özellik |
| 3 – Antrenman ve analiz | Oyun değiştirme, tekrar engelleme, normalize profil ekranı | Günlük antrenman ve rapor |
| 4 – QA ve cila | E2E ve erişilebilirlik turu, performans, marka kimliği | Yayına hazır sürüm |

**Karar gerektiren konu:** 10–30 arasındaki boş oyunların menüden kaldırılması önerilir. Çalışmayan butonlar,
feedback'teki "oyun bozuk" algısını bizim sitede de yaratır.

---

## Ek: Windows'ta Claude Code ile başlama

1. **PowerShell**'i aç ve Claude Code'u kur:
   ```powershell
   irm https://claude.ai/install.ps1 | iex
   ```
2. PowerShell'i kapatıp yeniden aç, kurulumu kontrol et:
   ```powershell
   claude --version
   ```
3. Proje klasörünü oluştur, `index.html`, `script.js`, `style.css` ve bu `RAPOR.md` dosyasını içine koy.
   Sonra klasöre gidip başlat:
   ```powershell
   cd $HOME\Desktop\lumo-v2
   claude
   ```
   İlk açılışta tarayıcıdan Claude hesabınla giriş yap.
4. İlk mesaj olarak şunu yazabilirsin:
   > RAPOR.md dosyasını oku. Bu projede kıdemli frontend mühendisi, oyun sistemleri geliştiricisi ve QA mühendisi
   > gibi çalış. Faz 0'ı (stabilizasyon) uygula: 1–6. oyunların menüden açılıp oynanabilir olmasını sağla, konsolda
   > hata kalmasın. Bitince ne değiştirdiğini ve nasıl test ettiğini özetle.

Resmi kurulum sayfası: https://code.claude.com/docs/en/setup

---

## 7. Uygulama durumu (19 Ekim 2026)

**Karar:** 30 yerine **15 oyun** (5 kategori × 3). Faz 0–4 uygulandı.

### Çalıştırma
- Çevrimiçi: https://elanurdogan.github.io/zihinfit/ (telefonda "Ana ekrana ekle" ile uygulama gibi açılır)
- Çift tıkla: `baslat.bat` (Node.js gerekir) → tarayıcıda `http://localhost:5173` açılır.
- Ya da: `npm start`. Birim testleri: `npm test`. E2E testleri: `npm install` sonrası `npm run test:e2e`
  (yüklü Chrome/Edge kullanılır; farklı yol için `CHROME_PATH`).

### Yapı
```
index.html · css/style.css · server.js (bağımlılıksız yerel sunucu) · baslat.bat
js/main.js                  yönlendirme (#/, #/oyun/<id>, #/antrenman/<n>, #/profil), ana sayfa, profil, ayarlar
js/core/                    gameManager (intro → playing ⇄ paused → result), clock (rAF + delta-time, duraklatılabilir,
                            tek noktadan temizlenen zamanlayıcılar), rng (tohumlanabilir), trialSession, dom
js/services/                storage (lumo:v2:*), settings, scores, workout, analysis, sound
js/games/                   15 oyun + registry.js; logic/ altında saf, test edilen üreticiler
js/data/words.js            Kelime Bağlamı Türkçe sözlüğü (12 kategori, ~230 kelime, az bilinenlerin anlamları)
tests/unit/                 node:test (bağımlılıksız)       tests/e2e/run.js   Playwright + axe-core
```

### Oyunlar ve feedback karşılıkları
| Kategori | Oyun | Feedback'e karşılık gelen özellik |
|---|---|---|
| Hafıza | Hafıza Eşleştirme | Kısmi puan, adaptif tahta boyutu, Zen modu |
| Hafıza | Hafıza Matrisi (yeni) | Tek hatada puan silinmez (tahta başına 1 hata hakkı), adaptif seviye (başarısız → 1 geri) |
| Hafıza | Gizli Rota | İlk oynayışta adım adım etkileşimli öğretici, rota tekrar jokeri |
| Dikkat | Hız Treni | Renk + sembol, renk körü paleti, büyük dokunma alanları, yumuşak zorluk eğrisi, rAF |
| Dikkat | Detay Avcısı (yeni) | Aralıklı, tam boy hücre butonları (yanlış hücre seçme şikâyeti), Zen modu |
| Dikkat | Sürekli Dikkat | Eski 9. oyun düzeltildi: tek zamanlayıcı, kaçırılan cevap cezalı, sembol tabanlı |
| Hız | Kartal Gözü | Zen/pratik modu, eşleşen sayıya tekrar dokunmak ceza vermez |
| Hız | Dur-Geç (yeni) | Şekil + yazı ile ayrılan uyaranlar, erken basma algılama |
| Hız | Sayı Fırtınası (yeni) | Seviyeyle artan işlem türleri |
| Esneklik | Renk Çatışması (yeni) | Okabe–Ito paleti, cevaplarda yazılı renk adı, kural değişimi |
| Esneklik | Kural Değiştir (yeni) | Kural değişiminde doğruluk ayrıca raporlanır |
| Esneklik | Kelime Bağlamı | Genişletilmiş Türkçe sözlük, oyun sonunda kaçırılanlar ve kelime anlamları |
| Problem | Sayı Füzyonu | Tek doğru çözüm garantisi (1.800 soruda test edildi), ipucu, ilerleme kaydı ve devam |
| Problem | Şifre Çözücü (yeni) | İpuçları renk değil sembol + yazı |
| Problem | Zihinsel Döndürme (yeni) | Kiral şekiller: her sorunun tek cevabı var (testli) |

**Tüm oyunlarda:** nasıl oynanır kartı, duraklat (P/Esc, sekme gizlenince otomatik), onaylı yeniden başlat/çıkış,
ses aç/kapat, renk körü modu, hareketi azalt, kalıcı skor/ilerleme, klavye desteği, 0–100 normalize performans.
**Antrenman:** her kategoriden bir oyun, son 2 günün oyunlarından kaçınır, az oynananı öne alır, her oyun aynı
kategoriden başka biriyle değiştirilebilir. **Profil:** kategori bazında 0–100, en güçlü/geliştirmeye açık alan.

### Test durumu
- Birim: 20/20 (rng, clock, çarpan, storage, skorlar, ayarlar, antrenman seçimi/değiştirme, profil, tüm soru üreticileri, sözlük).
- E2E: 149/149 — 15 oyunun her biri için aç/başlat/duraklat/onaylı yeniden başlat/bitir/tekrar oyna/çık; derin oynanış
  (Füzyon ilerleme kaydı, Gizli Rota öğreticisi, Matris kısmi puan, Zen modu, Dur-Geç erken basma…); antrenman, profil,
  ayarlar, yalnız klavye, 390 px'te taşma yok ve 44 px dokunma hedefleri, axe ile ciddi/kritik ihlal yok, konsolda sıfır hata.

### Açık konular
- WebKit/Safari ile test edilmedi (yalnızca Chromium). Lighthouse yerine axe-core kullanıldı.
- Kod GitHub'da: https://github.com/elanurdogan/zihinfit — site GitHub Pages ile yayında, birim testleri her push'ta GitHub Actions'ta çalışır.
- Eski `script.js`, `style.css`, `lumosity_logo.png` ve yedekler kaldırıldı. `lumosity_feedbacks.txt` kişisel veri içerdiği için depoya konmadı (.gitignore).
