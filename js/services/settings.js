// Kullanıcı ayarları: renk körü modu, ses, azaltılmış hareket.
// reducedMotion null ise işletim sisteminin prefers-reduced-motion tercihi kullanılır.

export const DEFAULT_SETTINGS = { colorblind: false, sound: true, reducedMotion: null };

export function createSettings(storage) {
    let state = { ...DEFAULT_SETTINGS, ...storage.get('settings', {}) };
    const listeners = new Set();

    return {
        get: key => state[key],
        all: () => ({ ...state }),
        set(key, value) {
            state = { ...state, [key]: value };
            storage.set('settings', state);
            listeners.forEach(fn => fn(state));
        },
        subscribe(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
        reducedMotion() {
            if (state.reducedMotion != null) return state.reducedMotion;
            return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        },
    };
}
