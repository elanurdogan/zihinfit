# Lumo — Günlük Zihin Antrenmanı

Hafıza, dikkat, hız, esneklik ve problem çözme için **15 bilişsel oyun**. Telefonda ve bilgisayarda çalışır, kurulum gerektirmez.

**▶ Hemen oyna:** https://elanurdogan.github.io/zihinfit/

Telefonda tarayıcı menüsünden **"Ana ekrana ekle"** seçilirse uygulama gibi tam ekran açılır.

## Özellikler
- **Günlük antrenman:** her kategoriden bir oyun; son günlerde oynananlar tekrar gelmez, istenen oyun "Değiştir" ile aynı kategoriden başkasıyla değiştirilir.
- **Bilişsel profil:** her sonuç 0–100 arasına normalize edilir; kategori bazında güçlü ve geliştirmeye açık alanlar.
- **Erişilebilirlik:** renk körü modu (renkler her zaman sembolle de ayrılır), hareketi azalt, ses aç/kapat, tam klavye desteği, en az 44 px dokunma hedefleri.
- Her oyunda "nasıl oynanır" kartı, duraklatma, onaylı yeniden başlatma, kalıcı skor; bazı oyunlarda Zen (süresiz) modu.

| Kategori | Oyunlar |
|---|---|
| 🧠 Hafıza | Hafıza Eşleştirme · Hafıza Matrisi · Gizli Rota |
| 🎯 Dikkat | Hız Treni · Detay Avcısı · Sürekli Dikkat |
| ⚡ Hız | Kartal Gözü · Dur-Geç · Sayı Fırtınası |
| 🔀 Esneklik | Renk Çatışması · Kural Değiştir · Kelime Bağlamı |
| 🧩 Problem Çözme | Sayı Füzyonu · Şifre Çözücü · Zihinsel Döndürme |

## Yerelde çalıştırma
Node.js 18+ gerekir (ES modules `file://` üzerinden açılmaz, bu yüzden küçük bir yerel sunucu kullanılır).

```bash
npm start          # http://localhost:5173 açılır  (Windows: baslat.bat'a çift tıkla)
npm test           # birim testleri (bağımlılık gerektirmez)
npm install && npm run test:e2e   # tarayıcı testleri (yüklü Chrome/Edge kullanılır; yol için CHROME_PATH)
```

## Yapı
```
index.html, css/style.css, manifest.webmanifest
js/main.js            yönlendirme (#/, #/oyun/<id>, #/antrenman/<n>, #/profil), ana sayfa, profil, ayarlar
js/core/              gameManager (intro → oyun ⇄ duraklat → sonuç), clock, rng, trialSession, dom
js/services/          storage, settings, scores, workout, analysis, sound
js/games/             her oyun ayrı modül + registry.js;  logic/ altında saf, testli soru üreticileri
js/data/words.js      Türkçe kelime sözlüğü
tests/unit, tests/e2e
```

### Yeni oyun eklemek
1. `js/games/yeniOyun.js` içinde `{ id, title, category, icon, description, howTo, scoreRef, create(ctx) }` dışa aktar.
   `create` bir `{ start(), getResult() }` nesnesi döndürür; DOM, zamanlayıcı, klavye ve kayıt yalnızca `ctx` üzerinden kullanılır
   (`ctx.stage`, `ctx.clock`, `ctx.onKey`, `ctx.hud`, `ctx.countdown`, `ctx.progress`, `ctx.finish`).
2. `js/games/registry.js` içindeki `GAMES` listesine ekle. Saf mantığı `js/games/logic/` altına koyup `tests/unit/` ile test et.

Tasarım ve ürün kararlarının gerekçesi: [RAPOR.md](RAPOR.md).
