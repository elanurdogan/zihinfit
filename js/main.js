// Uygulama girişi: servisleri kurar, basit hash yönlendirmesi ile ekranları çizer.
// Rotalar: #/ (ana sayfa), #/oyun/<id>, #/antrenman/<sıra>, #/profil

import { GAMES, CATEGORIES, getGame, getCategory } from './games/registry.js';
import { createStorage } from './services/storage.js';
import { createSettings } from './services/settings.js';
import { createScoreService } from './services/scores.js';
import { createWorkoutService } from './services/workout.js';
import { buildProfile } from './services/analysis.js';
import { createSound } from './services/sound.js';
import { GameManager } from './core/gameManager.js';
import { h, clear } from './core/dom.js';
import { confirmDialog } from './ui/dialogs.js';

const params = new URLSearchParams(location.search);
const seed = params.get('seed');
const storage = createStorage();
const settings = createSettings(storage);
const scores = createScoreService(storage);
const workout = createWorkoutService({ storage, games: GAMES, categories: CATEGORIES, scores, seed });
const sound = createSound(settings);

const views = {
    home: document.getElementById('view-home'),
    game: document.getElementById('view-game'),
    profile: document.getElementById('view-profile'),
};

const navigate = hash => {
    if (location.hash === hash) route();
    else location.hash = hash;
};

const manager = new GameManager({ root: views.game, storage, settings, scores, sound, workout, seed, navigate });
if (params.has('debug')) window.__zihinfit = { manager, storage, workout, scores };

// ---------- Ayarlar ----------

function applySettings() {
    const root = document.documentElement;
    root.classList.toggle('cb-mode', !!settings.get('colorblind'));
    root.classList.toggle('reduce-motion', settings.reducedMotion());
}
settings.subscribe(applySettings);
applySettings();

function setupSettingsDialog() {
    const dialog = document.getElementById('settings-dialog');
    document.getElementById('open-settings').addEventListener('click', () => {
        dialog.querySelector('#set-colorblind').checked = !!settings.get('colorblind');
        dialog.querySelector('#set-sound').checked = !!settings.get('sound');
        dialog.querySelector('#set-motion').checked = settings.reducedMotion();
        dialog.showModal();
    });
    dialog.querySelector('#set-colorblind').addEventListener('change', e => settings.set('colorblind', e.target.checked));
    dialog.querySelector('#set-sound').addEventListener('change', e => { settings.set('sound', e.target.checked); if (e.target.checked) sound.unlock(); });
    dialog.querySelector('#set-motion').addEventListener('change', e => settings.set('reducedMotion', e.target.checked));
    dialog.querySelector('#reset-tutorials').addEventListener('click', e => {
        const progress = storage.get('progress', {});
        Object.values(progress).forEach(p => delete p.tutorialDone);
        storage.set('progress', progress);
        e.target.textContent = '✓ Öğreticiler sıfırlandı';
    });
    dialog.querySelector('#reset-all').addEventListener('click', async () => {
        dialog.close();
        const ok = await confirmDialog({
            title: 'Tüm veriler silinsin mi?',
            message: 'Skorların, antrenman geçmişin, ilerlemen ve ayarların kalıcı olarak silinecek.',
            confirmText: 'Hepsini sil',
            danger: true,
        });
        if (ok) {
            storage.clearAll();
            location.hash = '#/';
            location.reload();
        }
    });
}

// ---------- Ana sayfa ----------

function gameCard(game) {
    const stats = scores.stats(game.id);
    return h('a', { class: 'game-card', href: `#/oyun/${game.id}`, 'data-game': game.id },
        h('span', { class: 'game-card-icon', 'aria-hidden': 'true' }, game.icon),
        h('span', { class: 'game-card-body' },
            h('span', { class: 'game-card-title' }, game.title),
            h('span', { class: 'game-card-desc' }, game.description),
            h('span', { class: 'game-card-meta' }, stats.best ? `En iyi: ${stats.best.score} · ${stats.plays} oyun` : 'Henüz oynanmadı')));
}

function renderWorkout() {
    const today = workout.today();
    const doneCount = today.slots.filter(slot => slot.done).length;
    const next = workout.nextIndex();
    const dateText = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
    return h('section', { class: 'card workout', 'aria-labelledby': 'workout-title' },
        h('div', { class: 'workout-head' },
            h('div', {},
                h('h2', { id: 'workout-title' }, 'Günlük Antrenman'),
                h('p', { class: 'muted' }, `${dateText} · her kategoriden bir oyun`)),
            h('div', { class: 'workout-progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': today.slots.length, 'aria-valuenow': doneCount, 'aria-label': 'Antrenman ilerlemesi' },
                h('b', {}, `${doneCount}/${today.slots.length}`), ' tamamlandı')),
        h('ol', { class: 'workout-list' }, today.slots.map((slot, i) => {
            const game = getGame(slot.gameId);
            const cat = getCategory(game.category);
            return h('li', { class: `workout-item${slot.done ? ' done' : ''}`, 'data-slot': i },
                h('span', { class: 'workout-icon', 'aria-hidden': 'true' }, slot.done ? '✅' : game.icon),
                h('span', { class: 'workout-text' },
                    h('b', {}, game.title),
                    h('span', { class: 'muted' }, `${cat.icon} ${cat.label}${slot.done ? ` · performans ${slot.normalized}/100` : ''}`)),
                h('span', { class: 'workout-buttons' },
                    !slot.done && h('button', {
                        class: 'btn btn-small btn-ghost', 'aria-label': `${game.title} yerine aynı kategoriden başka oyun seç`,
                        onclick: () => { workout.swap(i); renderHome(); document.querySelector(`[data-slot="${i}"] .btn-ghost`)?.focus(); },
                    }, '⇄ Değiştir'),
                    h('a', { class: 'btn btn-small', href: `#/antrenman/${i}` }, slot.done ? 'Tekrar' : 'Oyna')));
        })),
        next != null
            ? h('a', { class: 'btn btn-primary btn-large', href: `#/antrenman/${next}` }, doneCount ? 'Antrenmana devam et →' : 'Antrenmanı başlat →')
            : h('p', { class: 'workout-done' }, '🎉 Bugünkü antrenman tamamlandı! Yarın yeni oyunlar seni bekliyor.'));
}

function renderHome() {
    clear(views.home);
    views.home.append(
        renderWorkout(),
        h('section', { class: 'all-games', 'aria-labelledby': 'all-games-title' },
            h('h2', { id: 'all-games-title' }, 'Tüm Oyunlar'),
            h('p', { class: 'muted' }, 'Antrenmanın dışında istediğin oyunu istediğin kadar oynayabilirsin.'),
            CATEGORIES.map(cat => h('div', { class: 'category-block' },
                h('h3', { class: `category-title badge-${cat.key}` }, `${cat.icon} ${cat.label}`, h('span', { class: 'muted' }, ` — ${cat.blurb}`)),
                h('div', { class: 'game-grid' }, GAMES.filter(game => game.category === cat.key).map(gameCard))))));
}

// ---------- Profil ----------

function renderProfile() {
    const profile = buildProfile({ games: GAMES, categories: CATEGORIES, scoresAll: scores.all() });
    clear(views.profile);
    const bar = (value, label) => h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': value ?? 0, 'aria-label': label },
        h('div', { class: 'meter-fill', style: { width: `${value ?? 0}%` } }));

    let summary;
    if (!profile.playedGames) summary = h('p', {}, 'Henüz oyun oynamadın. Günlük antrenmanla başlamak profilini en hızlı doldurur.');
    else {
        summary = h('div', {},
            h('p', { class: 'profile-overall' }, h('span', { class: 'result-number' }, profile.overall ?? '—'), ' / 100 genel performans'),
            profile.strongest && h('p', {}, `💪 En güçlü alanın: `, h('b', {}, profile.strongest.label), ` (${profile.strongest.value})`),
            profile.weakest && h('p', {}, `🌱 Geliştirmeye açık alanın: `, h('b', {}, profile.weakest.label), ` (${profile.weakest.value})`),
            profile.coveredCategories < CATEGORIES.length && h('p', { class: 'muted' }, `Tam profil için her kategoriden en az bir oyun oyna (${profile.coveredCategories}/${CATEGORIES.length} kategori).`));
    }

    views.profile.append(
        h('section', { class: 'card' },
            h('h2', {}, 'Bilişsel Profil'),
            h('p', { class: 'muted' }, 'Her oyunun sonucu 0–100 arasına çevrilir; oyun değeri son 5 oyununun ortalamasıdır, kategori değeri o kategorideki oyunların ortalamasıdır.'),
            summary,
            h('div', { class: 'category-bars' }, profile.categories.map(cat => h('div', { class: 'category-bar' },
                h('div', { class: 'category-bar-head' }, h('span', {}, `${cat.icon} ${cat.label}`), h('b', {}, cat.value ?? '—')),
                bar(cat.value, `${cat.label} performansı`),
                h('span', { class: 'muted small' }, `${cat.played}/${cat.total} oyun oynandı`))))),
        h('section', { class: 'card' },
            h('h2', {}, 'Oyun Bazında'),
            h('div', { class: 'table-wrap' },
                h('table', { class: 'profile-table' },
                    h('thead', {}, h('tr', {}, ['Oyun', 'Kategori', 'Oynanma', 'En iyi skor', 'Performans'].map(t => h('th', { scope: 'col' }, t)))),
                    h('tbody', {}, profile.games.map(row => h('tr', {},
                        h('th', { scope: 'row' }, h('a', { href: `#/oyun/${row.id}` }, `${row.icon} ${row.title}`)),
                        h('td', {}, getCategory(row.category).label),
                        h('td', {}, row.plays),
                        h('td', {}, row.best ?? '—'),
                        h('td', {}, row.value ?? '—'))))))));
}

// ---------- Yönlendirme ----------

function show(name) {
    for (const [key, el] of Object.entries(views)) el.hidden = key !== name;
    document.querySelectorAll('.nav-link').forEach(link => link.setAttribute('aria-current', link.dataset.view === name ? 'page' : 'false'));
}

function route() {
    const [section, arg] = location.hash.replace(/^#\/?/, '').split('/');
    if (section === 'oyun' && getGame(arg)) {
        show('game');
        manager.open(arg);
    } else if (section === 'antrenman' && workout.today().slots[Number(arg)]) {
        show('game');
        const index = Number(arg);
        manager.open(workout.today().slots[index].gameId, { workoutIndex: index });
    } else {
        manager.close();
        if (section === 'profil') { show('profile'); renderProfile(); }
        else { show('home'); renderHome(); }
        // Ekran okuyucu ve klavye kullanıcıları için odağı yeni içeriğe taşı (oyun ekranında odak "Başla"dadır)
        document.getElementById('app').focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', route);
setupSettingsDialog();
route();
