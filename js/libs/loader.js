/**
 * @param {string} src
 * @returns {Promise<void>}
 */
const loadScript = (src) => new Promise((res, rej) => {
    const script = document.createElement('script');
    script.onload = res;
    script.onerror = rej;
    script.src = src;
    document.head.appendChild(script);
});

/**
 * @param {string} href
 * @returns {Promise<void>}
 */
const loadStyle = (href) => new Promise((res, rej) => {
    const link = document.createElement('link');
    link.onload = res;
    link.onerror = rej;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
});

/**
 * Bila animasi gagal dimuat, kontennya tetap ditampilkan.
 * @returns {Promise<void>}
 */
export const loadAOS = () => Promise.all([
    loadStyle('https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css'),
    loadScript('https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js'),
]).then(() => {
    window.AOS.init({ once: true });
}).catch(() => {
    document.querySelectorAll('[data-aos]').forEach((el) => el.removeAttribute('data-aos'));
});

/**
 * @returns {Promise<void>}
 */
export const loadConfetti = () => loadScript('https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.js').catch(() => {});

/**
 * Menunggu font utama agar judul tidak berganti bentuk saat ditampilkan.
 * @returns {Promise<void>}
 */
export const loadFonts = async () => {
    const link = document.getElementById('font-css');

    if (link && !link.sheet) {
        await new Promise((res) => {
            link.addEventListener('load', res, { once: true });
            link.addEventListener('error', res, { once: true });
        });
    }

    await document.fonts.load('1em "Sacramento"').catch(() => {});
};
