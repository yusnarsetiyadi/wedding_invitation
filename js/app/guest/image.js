import { progress } from './progress.js';
import { util } from '../../common/util.js';

export const image = (() => {

    /**
     * @param {HTMLImageElement} el
     * @returns {Promise<void>}
     */
    const reveal = (el) => new Promise((res) => {
        const src = el.getAttribute('data-src');
        if (!src) {
            res();
            return;
        }

        el.removeAttribute('data-src');

        const preload = new Image();
        preload.onload = () => {
            el.src = src;
            el.classList.remove('opacity-0');
            res();
        };
        preload.onerror = () => {
            console.error(`Gagal memuat gambar: ${src}`);
            res();
        };
        preload.src = src;
    });

    /**
     * Gambar utama ditunggu; sisanya dimuat ketika hampir terlihat.
     * @returns {void}
     */
    const load = () => {
        document.querySelectorAll('img[data-src][fetchpriority]').forEach((el) => {
            reveal(el).then(() => progress.complete('gambar'));
        });

        const observer = new IntersectionObserver((entries) => entries.forEach((e) => {
            if (!e.isIntersecting) {
                return;
            }

            observer.unobserve(e.target);
            const targets = e.target.tagName === 'IMG' ? [e.target] : e.target.querySelectorAll('img[data-src]');
            targets.forEach(reveal);
        }), { rootMargin: '400px 0px' });

        // Slide carousel yang tersembunyi dimuat bersama agar pergantiannya tidak kosong.
        document.querySelectorAll('.carousel').forEach((c) => observer.observe(c));
        document.querySelectorAll('img[data-src]:not([fetchpriority])').forEach((el) => {
            if (!el.closest('.carousel')) {
                observer.observe(el);
            }
        });
    };

    /**
     * @param {string} url
     * @returns {Promise<void>}
     */
    const download = async (url) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            util.downloadBlob(blob, `foto_asha_yusnar_${Date.now()}.${blob.type.split('/')[1] ?? 'jpg'}`);
        } catch {
            util.notify('Gagal mengunduh foto.').error();
        }
    };

    /**
     * @returns {{ load: function, download: function }}
     */
    const init = () => {
        document.querySelectorAll('img[data-src][fetchpriority]').forEach(() => progress.add());

        return {
            load,
            download,
        };
    };

    return {
        init,
    };
})();
