// Oyun ve kategori tanımları. Kategori her oyunda açıkça yazılıdır (eski "gameId % 5" ataması kaldırıldı).

import trainOfThought from './trainOfThought.js';
import fuseClues from './fuseClues.js';
import contextual from './contextual.js';
import eagleEye from './eagleEye.js';
import topSecret from './topSecret.js';
import memoryMatch from './memoryMatch.js';
import memoryMatrix from './memoryMatrix.js';
import oddOneOut from './oddOneOut.js';
import sustainedAttention from './sustainedAttention.js';
import goNoGo from './goNoGo.js';
import mathBlitz from './mathBlitz.js';
import colorClash from './colorClash.js';
import ruleSwitch from './ruleSwitch.js';
import codeBreaker from './codeBreaker.js';
import mentalRotation from './mentalRotation.js';

export const CATEGORIES = [
    { key: 'hafiza', label: 'Hafıza', icon: '🧠', blurb: 'Gördüğünü ve sırayı aklında tutma' },
    { key: 'dikkat', label: 'Dikkat', icon: '🎯', blurb: 'Odaklanma ve dikkat dağıtıcılara direnme' },
    { key: 'hiz', label: 'Hız', icon: '⚡', blurb: 'Hızlı algılama ve tepki' },
    { key: 'esneklik', label: 'Esneklik', icon: '🔀', blurb: 'Kurallar değişince hızla uyum sağlama' },
    { key: 'problem', label: 'Problem Çözme', icon: '🧩', blurb: 'Mantık, sayılar ve uzamsal akıl yürütme' },
];

export const GAMES = [
    memoryMatch, memoryMatrix, topSecret,
    trainOfThought, oddOneOut, sustainedAttention,
    eagleEye, goNoGo, mathBlitz,
    colorClash, ruleSwitch, contextual,
    fuseClues, codeBreaker, mentalRotation,
];

const byId = new Map(GAMES.map(game => [game.id, game]));
export const getGame = id => byId.get(id);
export const getCategory = key => CATEGORIES.find(cat => cat.key === key);
