// Küçük DOM yardımcıları: oyunlar innerHTML yerine bunlarla eleman üretir.

function append(el, children) {
    for (const child of children.flat(Infinity)) {
        if (child == null || child === false) continue;
        el.append(child instanceof Node ? child : String(child));
    }
}

function applyProps(el, props) {
    for (const [key, value] of Object.entries(props || {})) {
        if (value == null || value === false) continue;
        if (key === 'class') el.setAttribute('class', value);
        else if (key === 'text') el.textContent = value;
        else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
        else el.setAttribute(key, value === true ? '' : value);
    }
}

export function h(tag, props, ...children) {
    const el = document.createElement(tag);
    applyProps(el, props);
    append(el, children);
    return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function svg(tag, props, ...children) {
    const el = document.createElementNS(SVG_NS, tag);
    applyProps(el, props);
    append(el, children);
    return el;
}

export function clear(el) {
    el.replaceChildren();
}

export function hearts(lives, max = 3) {
    return '❤️'.repeat(Math.max(0, lives)) + '🤍'.repeat(Math.max(0, max - lives));
}

export function formatTime(ms) {
    const total = Math.ceil(Math.max(0, ms) / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
