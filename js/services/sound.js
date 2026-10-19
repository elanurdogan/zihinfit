// Kısa, sentezlenmiş geri bildirim sesleri (dosya indirme yok). Ayarlardan kapatılabilir.
// AudioContext yalnızca bir kullanıcı hareketinden sonra (unlock) oluşturulur; tarayıcı uyarısı çıkmaz.

const TONES = {
    correct: [[660, 0.07], [880, 0.09]],
    wrong: [[196, 0.16]],
    level: [[523, 0.07], [659, 0.07], [784, 0.12]],
    end: [[784, 0.1], [659, 0.1], [523, 0.18]],
    tick: [[440, 0.03]],
};

export function createSound(settings) {
    let audio = null;

    function unlock() {
        if (!settings.get('sound')) return;
        const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioCtx) return;
        if (!audio) audio = new AudioCtx();
        if (audio.state === 'suspended') audio.resume();
    }

    function play(name) {
        if (!settings.get('sound') || !audio || audio.state !== 'running') return;
        let at = audio.currentTime;
        for (const [freq, duration] of TONES[name] || []) {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, at);
            gain.gain.exponentialRampToValueAtTime(0.12, at + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
            osc.connect(gain).connect(audio.destination);
            osc.start(at);
            osc.stop(at + duration + 0.02);
            at += duration;
        }
    }

    return { unlock, play };
}
