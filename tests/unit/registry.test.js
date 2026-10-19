// Oyun tanımlarının ortak arayüze uyduğunu doğrular (DOM gerektirmez; create() çağrılmaz).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, CATEGORIES, getGame } from '../../js/games/registry.js';

test('15 oyun, her kategoride 3 oyun', () => {
    assert.equal(GAMES.length, 15);
    for (const cat of CATEGORIES) assert.equal(GAMES.filter(g => g.category === cat.key).length, 3, cat.key);
});

test('her oyun tanımı eksiksiz ve kimlikler benzersiz', () => {
    assert.equal(new Set(GAMES.map(g => g.id)).size, GAMES.length);
    for (const game of GAMES) {
        assert.match(game.id, /^[a-z-]+$/, game.id);
        assert.ok(game.title && game.icon && game.description, game.id);
        assert.ok(Array.isArray(game.howTo) && game.howTo.length >= 3, `${game.id} nasıl oynanır`);
        assert.ok(CATEGORIES.some(c => c.key === game.category), `${game.id} kategori`);
        assert.ok(game.scoreRef > 0 || typeof game.normalize === 'function', `${game.id} normalize`);
        assert.equal(typeof game.create, 'function');
        assert.equal(getGame(game.id), game);
    }
});
