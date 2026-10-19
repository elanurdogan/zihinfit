// Versiyonlu anahtarlarla kalıcı depolama (zihinfit:v1:*). localStorage kullanılamıyorsa
// (gizli sekme, kapalı site verisi) bellek içi depoya düşer; uygulama yine çalışır.

export const PREFIX = 'zihinfit:v1:';

export function memoryBackend() {
    const map = new Map();
    return {
        getItem: key => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => { map.set(key, String(value)); },
        removeItem: key => { map.delete(key); },
        key: index => [...map.keys()][index] ?? null,
        get length() { return map.size; },
    };
}

function defaultBackend() {
    try {
        const ls = globalThis.localStorage;
        ls.setItem(PREFIX + '__test', '1');
        ls.removeItem(PREFIX + '__test');
        return ls;
    } catch {
        return memoryBackend();
    }
}

export function createStorage(backend = defaultBackend()) {
    return {
        get(key, fallback) {
            try {
                const raw = backend.getItem(PREFIX + key);
                return raw == null ? fallback : JSON.parse(raw);
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try {
                backend.setItem(PREFIX + key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },
        remove(key) {
            try { backend.removeItem(PREFIX + key); } catch { /* yok say */ }
        },
        clearAll() {
            try {
                const keys = [];
                for (let i = 0; i < backend.length; i++) {
                    const key = backend.key(i);
                    if (key && key.startsWith(PREFIX)) keys.push(key);
                }
                keys.forEach(key => backend.removeItem(key));
            } catch { /* yok say */ }
        },
    };
}
