// Şifre Çözücü (Mastermind): ipuçlarından gizli rakam dizisini bul. Süresiz mantık oyunu.
// Renk körlüğü: ipuçları renk değil sembol (● / ○) ve yazıyla verilir.

import { h } from '../core/dom.js';
import { ROUNDS, MAX_GUESSES, scoreGuess, generateCode } from './logic/codeBreaker.js';

export default {
    id: 'sifre-cozucu',
    title: 'Şifre Çözücü',
    original: 'Mastermind',
    category: 'problem',
    icon: '🔐',
    description: 'Gizli rakam şifresini tahmin et; her tahminden sonra gelen ipuçlarıyla mantık yürüterek çöz.',
    howTo: [
        'Gizli bir rakam şifresi var. Rakamları seçip "Tahmin et"e bas.',
        '● = doğru rakam, doğru yerde. ○ = doğru rakam ama yanlış yerde.',
        'İpuçlarına göre tahminini düzelt. Her şifre için 8 hakkın var; ne kadar az tahmin, o kadar puan.',
        '3 şifre: 3 haneli, 4 haneli ve son olarak rakamların tekrar edebildiği 4 haneli şifre.',
    ],
    controls: 'Rakam tuşları, Backspace sil, Enter tahmin et',
    scoreRef: 330,

    create(ctx) {
        const { stage, rng } = ctx;
        let roundIdx = -1, round = null, code = [], guess = [], guesses = [], score = 0, solved = 0, totalGuesses = 0, active = false;
        const perRound = [];

        const info = h('p', { class: 'cb-info', 'aria-live': 'polite' });
        const history = h('ol', { class: 'cb-history', 'aria-label': 'Tahminlerin' });
        const current = h('div', { class: 'cb-current', 'aria-label': 'Şu anki tahmin' });
        const keypad = h('div', { class: 'cb-keypad' });
        const actions = h('div', { class: 'btn-row' });
        stage.append(info, history, current, keypad, actions);

        const updateHud = () => ctx.hud({ Skor: score, Şifre: `${roundIdx + 1}/${ROUNDS.length}`, Hak: `${MAX_GUESSES - guesses.length}` });

        function nextRound() {
            roundIdx++;
            if (roundIdx >= ROUNDS.length) { ctx.finish(getResult()); return; }
            round = ROUNDS[roundIdx];
            code = generateCode(rng, round);
            guess = [];
            guesses = [];
            active = true;
            history.replaceChildren();
            info.textContent = `${round.length} haneli şifre, rakamlar 1–${round.digits}. ${round.repeats ? 'Rakamlar TEKRAR EDEBİLİR.' : 'Her rakam en fazla bir kez kullanılır.'}`;
            keypad.replaceChildren(...Array.from({ length: round.digits }, (_, i) => h('button', { class: 'cb-key', onclick: () => press(i + 1) }, i + 1)));
            actions.replaceChildren(
                h('button', { class: 'btn', onclick: backspace }, '⌫ Sil'),
                h('button', { class: 'btn btn-primary cb-submit', onclick: submit }, '✓ Tahmin et'));
            renderCurrent();
            updateHud();
        }

        function renderCurrent() {
            current.replaceChildren(...Array.from({ length: round.length }, (_, i) => h('span', { class: `cb-slot${guess[i] ? ' filled' : ''}` }, guess[i] ?? '·')));
            const submitBtn = actions.querySelector('.cb-submit');
            if (submitBtn) submitBtn.disabled = guess.length !== round.length;
            keypad.querySelectorAll('.cb-key').forEach((key, i) => { key.disabled = !round.repeats && guess.includes(i + 1); });
        }

        function press(digit) {
            if (!active || guess.length >= round.length || digit > round.digits) return;
            if (!round.repeats && guess.includes(digit)) return;
            guess.push(digit);
            renderCurrent();
        }

        function backspace() {
            if (!active) return;
            guess.pop();
            renderCurrent();
        }

        function submit() {
            if (!active || guess.length !== round.length) return;
            const { exact, partial } = scoreGuess(code, guess);
            guesses.push(guess);
            totalGuesses++;
            const pegs = '●'.repeat(exact) + '○'.repeat(partial) || '—';
            history.append(h('li', { class: 'cb-row' },
                h('span', { class: 'cb-guess' }, guess.join(' ')),
                h('span', { class: 'cb-pegs', 'aria-hidden': 'true' }, pegs),
                h('span', { class: 'cb-text' }, `${exact} doğru yerde, ${partial} yanlış yerde`)));
            guess = [];
            if (exact === round.length) {
                const gained = (MAX_GUESSES + 1 - guesses.length) * 10 + (roundIdx + 1) * 10;
                score += gained;
                solved++;
                perRound.push(`${guesses.length} tahminde çözüldü`);
                endRound(`Şifre çözüldü! +${gained}`, true);
            } else if (guesses.length >= MAX_GUESSES) {
                perRound.push('çözülemedi');
                endRound(`Haklar bitti. Şifre: ${code.join(' ')}`, false);
            } else {
                ctx.sound('tick');
                renderCurrent();
                updateHud();
            }
        }

        function endRound(message, ok) {
            active = false;
            info.textContent = message;
            ctx.flash(ok ? 'good' : 'bad');
            updateHud();
            renderCurrent();
            const last = roundIdx === ROUNDS.length - 1;
            actions.replaceChildren(h('button', { class: 'btn btn-primary', onclick: nextRound }, last ? 'Sonucu gör' : 'Sonraki şifre →'));
            actions.querySelector('button').focus();
        }

        function getResult() {
            return {
                score,
                accuracy: ROUNDS.length ? solved / ROUNDS.length : 0,
                level: solved,
                details: [['Çözülen şifre', `${solved} / ${ROUNDS.length}`], ['Toplam tahmin', totalGuesses], ...perRound.map((text, i) => [`${i + 1}. şifre`, text])],
            };
        }

        ctx.onKey(event => {
            if (/^[1-9]$/.test(event.key)) { press(Number(event.key)); return true; }
            if (event.key === 'Backspace') { backspace(); return true; }
            if (event.key === 'Enter' && active) { submit(); return true; }
            return false;
        });

        return {
            start: nextRound,
            getResult,
            debug: () => ({ code, active }),
        };
    },
};
