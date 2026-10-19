// Lumo E2E testleri (Playwright + yüklü Chrome/Edge). Çalıştırma: npm run test:e2e
// Her oyun için: aç → nasıl oynanır → başla → etkileşim → duraklat/devam → onaylı yeniden başlat → bitir → tekrar oyna.
// Ayrıca: derin oynanış senaryoları, antrenman, profil, ayarlar, klavye, 390 px mobil, axe erişilebilirlik taraması.
// Tüm senaryolarda konsolda hata/uyarı ve başarısız istek olmaması şarttır.

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 5299;
const BASE = `http://localhost:${PORT}/`;
const BROWSERS = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const AXE_SOURCE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

const results = [];
const consoleProblems = [];
function check(name, ok, extra = '') {
    results.push({ name, ok: !!ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  — ${extra}` : ''}`);
}
async function scenario(name, fn) {
    try { await fn(); } catch (error) { check(`${name}: senaryo hatasız tamamlandı`, false, error.message.split('\n').slice(0, 3).join(' ')); }
}

function watch(page, label) {
    page.on('pageerror', e => consoleProblems.push(`[${label}] pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleProblems.push(`[${label}] console.${m.type()}: ${m.text()}`); });
    page.on('requestfailed', r => consoleProblems.push(`[${label}] requestfailed: ${r.url()}`));
    page.on('response', r => { if (r.status() >= 400) consoleProblems.push(`[${label}] HTTP ${r.status()}: ${r.url()}`); });
}

const debug = (page, fn, arg) => page.evaluate(fn, arg);
const instanceDebug = page => page.evaluate(() => window.__lumo.manager.instance?.debug?.());

let loadCount = 0;
async function openGame(page, id) {
    // Her açılışta yeni sayfa yüklemesi: aynı URL'ye goto yapınca hashchange tetiklenmez
    await page.goto(`${BASE}?debug=1&seed=e2e&n=${++loadCount}#/oyun/${id}`);
    await page.waitForSelector('.intro-card');
}
async function startGame(page) {
    await page.click('.intro-card .btn-primary');
    await page.waitForSelector('.stage-wrap:not([hidden])');
}
async function confirm(page, accept) {
    await page.waitForSelector('#confirm-dialog[open]');
    await page.click(accept ? '#confirm-ok' : '#confirm-cancel');
    await page.waitForSelector('#confirm-dialog[open]', { state: 'detached' });
}
async function endViaPause(page) {
    await page.click('.game-actions .btn:has-text("Duraklat")');
    await page.click('.pause-overlay .btn:has-text("Bitir")');
    await page.waitForSelector('.result-card');
}

// ---------- 1. Her oyun için yaşam döngüsü ----------
async function lifecycle(page, games) {
    for (const game of games) {
        await scenario(`[${game.id}]`, async () => {
            await openGame(page, game.id);
            const howTo = await page.locator('.howto li').count();
            check(`[${game.id}] intro: nasıl oynanır kartı (${howTo} adım)`, howTo >= 3);
            await startGame(page);
            await page.waitForTimeout(1800);
            // etkileşim: sahnedeki ilk birkaç etkin butona dokun, ok tuşuna bas
            const buttons = page.locator('.stage button:enabled');
            for (let i = 0; i < Math.min(3, await buttons.count()); i++) await buttons.nth(i).click({ timeout: 800 }).catch(() => {});
            await page.keyboard.press('ArrowRight');
            if (await page.locator('.stage-wrap:not([hidden])').count()) {
                await page.keyboard.press('p');
                const pausedHidden = await page.$eval('.stage', el => el.classList.contains('is-paused'));
                const clockBefore = await debug(page, () => window.__lumo.manager.clock.now);
                await page.waitForTimeout(400);
                const clockAfter = await debug(page, () => window.__lumo.manager.clock.now);
                check(`[${game.id}] duraklat: sahne gizli, zaman durdu`, pausedHidden && clockBefore === clockAfter);
                await page.click('.pause-overlay .btn:has-text("Yeniden başlat")');
                await confirm(page, false);
                check(`[${game.id}] yeniden başlatma onayı "Vazgeç" ile iptal ediliyor`, await page.locator('.pause-overlay:not([hidden])').count() === 1);
                await page.click('.pause-overlay .btn:has-text("Yeniden başlat")');
                await confirm(page, true);
                const restarted = await page.waitForFunction(() => window.__lumo.manager.state === 'playing', null, { timeout: 3000 }).then(() => true, () => false);
                check(`[${game.id}] onaylı yeniden başlatma oyunu sıfırdan açıyor`, restarted && await page.locator('.pause-overlay[hidden]').count() === 1);
                await endViaPause(page);
            } else {
                await page.waitForSelector('.result-card');
            }
            check(`[${game.id}] sonuç ekranı: skor ve performans puanı`, await page.locator('.result-number').count() === 1 && await page.locator('.meter').count() === 1);
            await page.click('.result-card .btn:has-text("Tekrar oyna")');
            await page.waitForTimeout(1800);
            const stageChildren = await page.$eval('.stage', el => el.children.length);
            const visibleButtons = await page.locator('.stage button:visible').count();
            check(`[${game.id}] ikinci oyunda sahne dolu (boş ekran regresyonu yok)`, stageChildren > 0 && (visibleButtons > 0 || game.id === 'hafiza-matrisi'));
            await page.click('.game-top .btn:has-text("Oyunlar")');
            await confirm(page, true);
            await page.waitForSelector('#view-home:not([hidden])');
            check(`[${game.id}] oyundan onaylı çıkış ana sayfaya dönüyor, oyun duruyor`, await debug(page, () => window.__lumo.manager.state) === 'idle');
        });
    }
}

// ---------- 2. Derin oynanış senaryoları ----------
async function deepGameplay(page) {
    await scenario('Sayı Füzyonu', async () => {
        await page.evaluate(() => localStorage.clear());
        await openGame(page, 'sayi-fuzyonu');
        await startGame(page);
        for (let i = 0; i < 3; i++) {
            await page.waitForFunction(() => window.__lumo.manager.instance?.debug().accepting);
            const { puzzle } = await instanceDebug(page);
            await page.locator('.fc-num').nth(puzzle.answer[0]).click();
            await page.keyboard.press(String(puzzle.answer[1] + 1)); // klavyeyle ikinci sayı
            await page.waitForTimeout(700);
        }
        const progress = await debug(page, () => window.__lumo.storage.get('progress', {})['sayi-fuzyonu']);
        check('[sayi-fuzyonu] 3 doğru çift: ilerleme seviye 4 olarak kaydedildi', progress?.level === 4, JSON.stringify(progress));
        await page.waitForFunction(() => window.__lumo.manager.instance?.debug().accepting);
        await page.click('.btn:has-text("İpucu")');
        check('[sayi-fuzyonu] ipucu bir sayıyı işaretliyor', await page.locator('.fc-num.hint').count() === 1);
        const { puzzle } = await instanceDebug(page);
        const wrong = [0, 1, 2, 3, 4, 5].filter(i => !puzzle.answer.includes(i)).slice(0, 2);
        for (const i of wrong) await page.locator('.fc-num').nth(i).click();
        check('[sayi-fuzyonu] yanlışta doğru çift gösteriliyor', await page.locator('.fc-num.reveal').count() === 2 && /Doğru çift/.test(await page.textContent('.fc-feedback')));
        await endViaPause(page);
        await openGame(page, 'sayi-fuzyonu');
        await startGame(page);
        check('[sayi-fuzyonu] tekrar açınca "kaldığın yerden devam" seçeneği', /Seviye 4/.test(await page.textContent('.choice-card')));
        await page.click('.choice-card .btn-primary');
        check('[sayi-fuzyonu] devam: seviye 4\'ten başlıyor', /4/.test(await page.textContent('.hud')));
    });

    await scenario('Gizli Rota öğreticisi', async () => {
        await openGame(page, 'gizli-rota');
        await startGame(page);
        check('[gizli-rota] ilk oynayışta öğretici başlıyor', /Adım 1/.test(await page.textContent('.ts-instruction')));
        await page.waitForSelector('.ts-btn.hint', { timeout: 8000 });
        await page.locator('.ts-btn:not(.hint)').first().click();
        check('[gizli-rota] öğreticide yanlış tuş ceza yerine yönlendirme veriyor', /Çerçeveli/.test(await page.textContent('.ts-instruction')));
        for (let i = 0; i < 2; i++) await page.click('.ts-btn.hint');
        await page.click('.btn:has-text("Anladım")');
        check('[gizli-rota] öğretici bitince oyun başlıyor ve kaydediliyor', await debug(page, () => window.__lumo.storage.get('progress', {})['gizli-rota']?.tutorialDone) === true);
        await page.waitForFunction(() => window.__lumo.manager.instance?.debug().mode === 'input', null, { timeout: 10000 });
        const { sequence } = await instanceDebug(page);
        const keys = { UP: 'ArrowUp', LEFT: 'ArrowLeft', RIGHT: 'ArrowRight', DOWN: 'ArrowDown' };
        for (const dir of sequence) await page.keyboard.press(keys[dir]);
        await page.waitForTimeout(200);
        check('[gizli-rota] klavyeyle doğru rota: puan', /30/.test(await page.textContent('.hud')));
        await page.waitForFunction(() => window.__lumo.manager.instance?.debug().mode === 'input', null, { timeout: 10000 });
        await page.keyboard.press('r');
        check('[gizli-rota] joker (R) rotayı yeniden gösteriyor', /tekrar gösteriliyor/.test(await page.textContent('.ts-instruction')));
        await endViaPause(page);
        await page.click('.result-card .btn:has-text("Tekrar oyna")');
        check('[gizli-rota] ikinci oyunda öğretici tekrar çıkmıyor', !/Adım 1/.test(await page.textContent('.ts-instruction')));
    });

    await scenario('Hafıza Matrisi kısmi puan', async () => {
        await openGame(page, 'hafiza-matrisi');
        await startGame(page);
        await page.waitForFunction(() => window.__lumo.manager.instance?.debug().accepting, null, { timeout: 5000 });
        const { targets } = await instanceDebug(page);
        const size = await page.locator('.mx-cell').count();
        const wrong = [...Array(size).keys()].find(i => !targets.includes(i));
        await page.locator('.mx-cell').nth(targets[0]).click();
        await page.locator('.mx-cell').nth(wrong).click();
        check('[hafiza-matrisi] bir hata tahtayı bitirmiyor, puan korunuyor', await debug(page, () => window.__lumo.manager.instance.debug().accepting) && /10/.test(await page.textContent('.hud')));
        for (const t of targets.slice(1)) await page.locator('.mx-cell').nth(t).click();
        check('[hafiza-matrisi] hatalı ama tamamlanan tahta: aynı seviyede devam', /Tamamlandı/.test(await page.textContent('.mx-info')));
    });

    await scenario('Hız Treni', async () => {
        await openGame(page, 'hiz-treni');
        await startGame(page);
        for (let i = 0; i < 2; i++) {
            await page.waitForFunction(() => { const d = window.__lumo.manager.instance?.debug(); return d && !d.passed && d.y < 20; }, null, { timeout: 8000 });
            const { targetIdx } = await instanceDebug(page);
            await page.keyboard.press(targetIdx === 0 ? 'ArrowLeft' : 'ArrowRight');
            await page.waitForFunction(n => /Skor/.test(document.querySelector('.hud').textContent) && Number(document.querySelector('.hud .pill b').textContent) >= n, (i + 1) * 10, { timeout: 8000 });
        }
        check('[hiz-treni] klavyeyle doğru yönlendirilen 2 tren puan veriyor', true);
        const symbols = await page.$$eval('.tot-station .tot-symbol', els => els.map(e => e.textContent));
        check('[hiz-treni] istasyonlarda renk yanında sembol var', symbols.length === 2 && symbols.every(s => s.trim().length > 0));
    });

    await scenario('Şifre Çözücü', async () => {
        await openGame(page, 'sifre-cozucu');
        await startGame(page);
        const { code } = await instanceDebug(page);
        for (const d of code) await page.keyboard.press(String(d));
        await page.keyboard.press('Enter');
        check('[sifre-cozucu] klavyeyle girilen doğru şifre çözülüyor', /çözüldü/.test(await page.textContent('.cb-info')));
        await page.click('.btn:has-text("Sonraki şifre")');
        const next = (await instanceDebug(page)).code;
        const wrongGuess = [1, 2, 3, 4].map((d, i) => (next[i] === d ? d : d));
        for (const d of wrongGuess) await page.keyboard.press(String(d));
        await page.keyboard.press('Enter');
        check('[sifre-cozucu] ipucu satırı yazıyla da açıklanıyor', /doğru yerde/.test(await page.textContent('.cb-history')));
    });

    await scenario('Hafıza Eşleştirme', async () => {
        await openGame(page, 'hafiza-eslestirme');
        await startGame(page);
        const { icons } = await instanceDebug(page);
        const done = new Set();
        for (let i = 0; i < icons.length; i++) {
            if (done.has(i)) continue;
            const j = icons.findIndex((ic, k) => k !== i && ic === icons[i]);
            done.add(i); done.add(j);
            await page.locator('.mm-card').nth(i).click();
            await page.locator('.mm-card').nth(j).click();
        }
        await page.waitForTimeout(800);
        check('[hafiza-eslestirme] hatasız tahta sonrası tahta büyüyor (adaptif)', await page.locator('.mm-card').count() === 8);
    });

    await scenario('Kartal Gözü Zen modu', async () => {
        await openGame(page, 'kartal-gozu');
        await page.check('.zen-toggle input');
        await startGame(page);
        check('[kartal-gozu] Zen: süre sonsuz, üstte Bitir butonu', /∞/.test(await page.textContent('.hud')) && await page.locator('.game-actions .btn:has-text("Bitir"):visible').count() === 1);
        const { order } = await instanceDebug(page);
        for (const n of order) await page.locator('.ee-num', { hasText: new RegExp(`^${n}$`) }).click();
        await page.click('.game-actions .btn:has-text("Bitir")');
        await page.waitForSelector('.result-card');
        check('[kartal-gozu] Zen sonucu kaydedilmiyor', /Zen/.test(await page.textContent('.result-card')) && await debug(page, () => window.__lumo.scores.stats('kartal-gozu').plays) === 0);
    });

    await scenario('Dur-Geç', async () => {
        await openGame(page, 'dur-gec');
        await startGame(page);
        await page.waitForTimeout(900);
        await page.keyboard.press(' ');
        check('[dur-gec] işaret çıkmadan basmak "erken" sayılıyor', /Erken/.test(await page.textContent('.gng-feedback')));
        await page.waitForFunction(() => window.__lumo.manager.instance?.debug().phase === 'stimulus', null, { timeout: 5000 });
        const { isGo } = await instanceDebug(page);
        if (isGo) await page.keyboard.press(' ');
        await page.waitForFunction(() => window.__lumo.manager.instance?.debug().phase !== 'stimulus', null, { timeout: 3000 });
        check('[dur-gec] işarete doğru tepki puan veriyor', /ms|tuttun/.test(await page.textContent('.gng-feedback')));
    });
}

// ---------- 3. Antrenman, profil, ayarlar, klavye ----------
async function appFlows(page) {
    await scenario('Antrenman', async () => {
        await page.goto(`${BASE}?debug=1&seed=e2e#/`);
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        const before = await page.$$eval('.workout-item b', els => els.map(e => e.textContent));
        check('[antrenman] 5 oyun, her kategoriden bir tane', before.length === 5);
        await page.click('[data-slot="2"] .btn:has-text("Değiştir")');
        const after = await page.$$eval('.workout-item b', els => els.map(e => e.textContent));
        const cats = await page.$$eval('.workout-item .muted', els => els.map(e => e.textContent));
        check('[antrenman] "Değiştir" yalnızca o oyunu, aynı kategoriden başkasıyla değiştiriyor', after[2] !== before[2] && after.filter((t, i) => t !== before[i]).length === 1 && /Esneklik|Hız|Hafıza|Dikkat|Problem/.test(cats[2]));
        await page.reload();
        check('[antrenman] değişiklik kalıcı', (await page.$$eval('.workout-item b', els => els.map(e => e.textContent)))[2] === after[2]);
        await page.click('.workout .btn-large');
        await page.waitForSelector('.intro-card .workout-tag');
        await startGame(page);
        await endViaPause(page);
        check('[antrenman] sonuçta "Sonraki antrenman oyunu" butonu', await page.locator('.btn:has-text("Sonraki antrenman oyunu")').count() === 1);
        await page.click('.btn:has-text("Sonraki antrenman oyunu")');
        await page.waitForSelector('.intro-card .workout-tag');
        check('[antrenman] sonraki oyun 2/5 olarak açılıyor', /2\/5/.test(await page.textContent('.workout-tag')));
        await page.goto(`${BASE}?debug=1&seed=e2e#/`);
        check('[antrenman] ilk oyun tamamlandı olarak işaretli', await page.locator('.workout-item.done').count() === 1 && /1\/5/.test(await page.textContent('.workout-progress')));
    });

    await scenario('Profil', async () => {
        await page.goto(`${BASE}?debug=1&seed=e2e#/profil`);
        await page.waitForSelector('.category-bars');
        check('[profil] 5 kategori çubuğu ve 15 oyun satırı', await page.locator('.category-bar').count() === 5 && await page.locator('.profile-table tbody tr').count() === 15);
        check('[profil] oynanan kategori 0–100 değer gösteriyor', await page.$$eval('.category-bar-head b', els => els.some(e => /^\d+$/.test(e.textContent))));
    });

    await scenario('Ayarlar', async () => {
        await page.goto(`${BASE}?debug=1&seed=e2e#/`);
        await page.click('#open-settings');
        await page.check('#set-colorblind');
        await page.check('#set-motion');
        await page.click('#settings-dialog .btn-primary');
        check('[ayarlar] renk körü ve hareketi azalt sınıfları uygulanıyor', await page.evaluate(() => document.documentElement.classList.contains('cb-mode') && document.documentElement.classList.contains('reduce-motion')));
        await openGame(page, 'hiz-treni');
        await startGame(page);
        const colors = await page.$$eval('.tot-station', els => els.map(e => getComputedStyle(e).backgroundColor));
        const cbPalette = ['rgb(213, 94, 0)', 'rgb(0, 114, 178)', 'rgb(0, 158, 115)', 'rgb(204, 121, 167)', 'rgb(230, 159, 0)', 'rgb(0, 0, 0)'];
        check('[ayarlar] renk körü modunda Hız Treni Okabe–Ito paletini kullanıyor', colors.every(c => cbPalette.includes(c)), colors.join(', '));
        await page.reload();
        check('[ayarlar] ayarlar kalıcı', await page.evaluate(() => document.documentElement.classList.contains('cb-mode')));
        await page.goto(`${BASE}?debug=1&seed=e2e#/`);
        await page.click('#open-settings');
        await page.uncheck('#set-colorblind');
        await page.uncheck('#set-motion');
        await page.click('#settings-dialog .btn-primary');
    });

    await scenario('Klavye', async () => {
        await page.goto(`${BASE}?debug=1&seed=e2e#/`);
        let reached = false;
        for (let i = 0; i < 40 && !reached; i++) {
            await page.keyboard.press('Tab');
            reached = await page.evaluate(() => document.activeElement?.classList.contains('game-card'));
        }
        await page.keyboard.press('Enter');
        await page.waitForSelector('.intro-card');
        await page.keyboard.press('Enter'); // Başla odakta
        check('[klavye] yalnız klavyeyle oyun kartına gidip oyun başlatılabiliyor', reached && await debug(page, () => window.__lumo.manager.state) === 'playing');
        await page.keyboard.press('Escape');
        check('[klavye] Esc oyunu duraklatıyor', await debug(page, () => window.__lumo.manager.state) === 'paused');
    });
}

// ---------- 4. Mobil 390 px ----------
async function mobile(browser, games) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    watch(page, 'mobil');
    await page.goto(`${BASE}?debug=1&seed=e2e#/`);
    let overflow = [], small = [];
    for (const game of games) {
        await openGame(page, game.id);
        await page.tap('.intro-card .btn-primary');
        await page.waitForTimeout(1600);
        if (await page.locator('.choice-card').count()) await page.tap('.choice-card .btn');
        await page.waitForTimeout(200);
        const width = await page.evaluate(() => document.documentElement.scrollWidth);
        if (width > 390) overflow.push(`${game.id}:${width}`);
        const tiny = await page.$$eval('.stage button:not(:disabled)', els => els
            .filter(e => e.offsetParent && getComputedStyle(e).visibility !== 'hidden')
            .map(e => e.getBoundingClientRect()).filter(r => r.width < 44 || r.height < 44).length);
        if (tiny) small.push(`${game.id}:${tiny}`);
    }
    check('[390px] 15 oyunda yatay taşma yok', overflow.length === 0, overflow.join(' '));
    check('[390px] oyun içi dokunma hedefleri en az 44×44 px', small.length === 0, small.join(' '));
    await page.goto(`${BASE}#/`);
    await page.screenshot({ path: resolve(ROOT, 'tests/e2e/ekran-mobil.png') });
    await context.close();
}

// ---------- 5. Erişilebilirlik (axe) ----------
async function accessibility(page) {
    const runAxe = async label => {
        await page.addScriptTag({ path: AXE_SOURCE });
        const violations = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations
            .filter(v => v.impact === 'serious' || v.impact === 'critical')
            .map(v => `${v.id}: ${v.nodes.slice(0, 4).map(n => n.target.join(' ')).join(' ; ')}`));
        check(`[axe] ${label}: ciddi/kritik erişilebilirlik ihlali yok`, violations.length === 0, violations.join(', '));
    };
    await page.goto(`${BASE}?debug=1&seed=e2e#/`);
    await runAxe('ana sayfa');
    await openGame(page, 'renk-catismasi');
    await runAxe('oyun tanıtımı');
    await startGame(page);
    await runAxe('oyun sırasında');
    await endViaPause(page);
    await runAxe('sonuç ekranı');
    await page.goto(`${BASE}?debug=1&seed=e2e#/profil`);
    await runAxe('profil');
}

// ---------- Çalıştır ----------
const server = spawn(process.execPath, ['server.js', '--port', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
try {
    await new Promise(r => setTimeout(r, 600));
    const executablePath = BROWSERS.find(p => existsSync(p));
    if (!executablePath) throw new Error('Chrome/Edge bulunamadı; CHROME_PATH ortam değişkenini ayarlayın.');
    const browser = await chromium.launch({ executablePath, headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    watch(page, 'masaüstü');
    await page.goto(`${BASE}?debug=1&seed=e2e#/`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const games = await page.$$eval('.game-card', els => els.map(e => ({ id: e.dataset.game })));
    check('[ana sayfa] 15 oyun kartı ve 5 antrenman oyunu', games.length === 15 && await page.locator('.workout-item').count() === 5);

    const only = process.argv[2];
    if (!only || only === 'oyunlar') await lifecycle(page, games);
    if (!only || only === 'derin') await deepGameplay(page);
    if (!only || only === 'uygulama') await appFlows(page);
    if (!only || only === 'mobil') await mobile(browser, games);
    if (!only || only === 'axe') await accessibility(page);
    await browser.close();
    check('[konsol] hiçbir senaryoda hata, uyarı ya da başarısız istek yok', consoleProblems.length === 0, consoleProblems.slice(0, 8).join(' | '));
} finally {
    server.kill();
}
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} kontrol geçti`);
process.exit(failed ? 1 : 0);
