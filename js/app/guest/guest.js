import { video } from './video.js';
import { image } from './image.js';
import { audio } from './audio.js';
import { progress } from './progress.js';
import { util } from '../../common/util.js';
import { bs } from '../../libs/bootstrap.js';
import { theme } from '../../common/theme.js';
import { lang } from '../../common/language.js';
import { storage } from '../../common/storage.js';
import { session } from '../../common/session.js';
import { offline } from '../../common/offline.js';
import { comment } from '../components/comment.js';
import * as confetti from '../../libs/confetti.js';
import { firebase } from '../../connection/firebase.js';
import { loadAOS, loadConfetti, loadFonts } from '../../libs/loader.js';

export const guest = (() => {

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let information = null;

    /**
     * @returns {void}
     */
    const countDownDate = () => {
        const target = new Date(document.body.getAttribute('data-time')).getTime();

        /**
         * @param {number} num
         * @returns {string}
         */
        const pad = (num) => num < 10 ? `0${num}` : `${num}`;

        const day = document.getElementById('day');
        const hour = document.getElementById('hour');
        const minute = document.getElementById('minute');
        const second = document.getElementById('second');

        const updateCountdown = () => {
            const distance = Math.max(0, target - Date.now());

            day.textContent = pad(Math.floor(distance / (1000 * 60 * 60 * 24)));
            hour.textContent = pad(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
            minute.textContent = pad(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)));
            second.textContent = pad(Math.floor((distance % (1000 * 60)) / 1000));

            if (distance > 0) {
                util.timeOut(updateCountdown, 1000 - (Date.now() % 1000));
            }
        };

        updateCountdown();
    };

    /**
     * @returns {void}
     */
    const showGuestName = () => {
        const name = new URLSearchParams(window.location.search).get('to')?.trim().slice(0, 100);

        if (name) {
            const guestName = document.getElementById('guest-name');
            const div = document.createElement('div');
            div.classList.add('m-2');

            const template = `<small class="mt-0 mb-1 mx-0 p-0">${util.escapeHtml(guestName?.getAttribute('data-message'))}</small><p class="m-0 p-0" style="font-size: 1.25rem">${util.escapeHtml(name)}</p>`;
            util.safeInnerHTML(div, template);

            guestName?.appendChild(div);
        }

        const form = document.getElementById('form-name');
        if (form) {
            form.value = information.get('name') ?? name ?? '';
        }
    };

    /**
     * @returns {Promise<void>}
     */
    const slide = async () => {
        const interval = 6000;
        const slides = document.querySelectorAll('.slide-desktop');

        if (!slides || slides.length === 0) {
            return;
        }

        const desktopEl = document.getElementById('root')?.querySelector('.d-sm-block');
        if (!desktopEl) {
            return;
        }

        desktopEl.dispatchEvent(new Event('undangan.slide.stop'));

        if (window.getComputedStyle(desktopEl).display === 'none') {
            return;
        }

        if (slides.length === 1) {
            await util.changeOpacity(slides[0], true);
            return;
        }

        let index = 0;
        slides[index].classList.add('slide-desktop-active');
        await util.changeOpacity(slides[index], true);

        let run = true;
        const nextSlide = async () => {
            await util.changeOpacity(slides[index], false);
            slides[index].classList.remove('slide-desktop-active');

            index = (index + 1) % slides.length;

            if (run) {
                slides[index].classList.add('slide-desktop-active');
                await util.changeOpacity(slides[index], true);
            }

            return run;
        };

        desktopEl.addEventListener('undangan.slide.stop', () => {
            run = false;
        }, { once: true });

        const loop = async () => {
            if (await nextSlide()) {
                util.timeOut(loop, interval);
            }
        };

        util.timeOut(loop, interval);
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {void}
     */
    const open = (button) => {
        button.disabled = true;
        document.body.scrollIntoView({ behavior: 'instant' });
        document.getElementById('root').classList.remove('opacity-0');

        if (theme.isAutoMode()) {
            document.getElementById('button-theme').classList.remove('d-none');
        }

        slide();
        theme.spyTop();

        confetti.basicAnimation();
        util.timeOut(confetti.openAnimation, 1500);

        document.dispatchEvent(new Event('undangan.open'));
        util.changeOpacity(document.getElementById('welcome'), false).then((el) => el.remove());
    };

    /**
     * @param {HTMLImageElement} img
     * @returns {void}
     */
    const modal = (img) => {
        document.getElementById('button-modal-click').setAttribute('href', img.src);
        document.getElementById('button-modal-download').setAttribute('data-src', img.src);
        document.getElementById('show-modal-image').src = img.src;
        bs.modal('modal-image').show();
    };

    /**
     * @returns {void}
     */
    const modalImageClick = () => {
        document.getElementById('show-modal-image').addEventListener('click', (e) => {
            const abs = e.currentTarget.parentNode.querySelector('.position-absolute');

            abs.classList.contains('d-none')
                ? abs.classList.replace('d-none', 'd-flex')
                : abs.classList.replace('d-flex', 'd-none');
        });
    };

    /**
     * @param {HTMLDivElement} div
     * @returns {void}
     */
    const showStory = (div) => {
        if (navigator.vibrate) {
            navigator.vibrate(500);
        }

        confetti.tapTapAnimation(div, 100);
        util.changeOpacity(div, false).then((e) => e.remove());
    };

    /**
     * @returns {void}
     */
    const closeInformation = () => information.set('info', true);

    /**
     * @returns {void}
     */
    const normalizeArabicFont = () => {
        document.querySelectorAll('.font-arabic').forEach((el) => {
            el.innerHTML = String(el.innerHTML).normalize('NFC');
        });
    };

    /**
     * @returns {void}
     */
    const animateSvg = () => {
        document.querySelectorAll('svg[data-class]').forEach((el) => {
            util.timeOut(() => el.classList.add(el.getAttribute('data-class')), parseInt(el.getAttribute('data-time')));
        });
    };

    /**
     * Tanggal dikirim dalam UTC agar benar di zona waktu mana pun.
     * @returns {void}
     */
    const buildGoogleCalendar = () => {
        /**
         * @param {string} d
         * @returns {string}
         */
        const formatDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.').shift() + 'Z';

        const location = document.getElementById('venue-address')?.textContent.replace(/\s+/g, ' ').trim() ?? '';

        const url = new URL('https://calendar.google.com/calendar/render');
        url.search = new URLSearchParams({
            action: 'TEMPLATE',
            text: 'The Wedding of Asha and Yusnar',
            dates: `${formatDate(document.body.getAttribute('data-time'))}/${formatDate(document.body.getAttribute('data-time-end'))}`,
            details: 'Tanpa mengurangi rasa hormat, kami mengundang Anda untuk berkenan menghadiri acara pernikahan kami. Terima kasih atas perhatian dan doa restu Anda, yang menjadi kebahagiaan serta kehormatan besar bagi kami.',
            location,
        }).toString();

        document.querySelector('#home button')?.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
    };

    /**
     * Pengaturan dibaca sekali, lalu ucapan baru dimuat saat bagiannya hampir terlihat.
     * @returns {void}
     */
    const setupComments = () => {
        const defaultConfetti = document.body.getAttribute('data-confetti') === 'true';

        if (!firebase.isConfigured()) {
            console.warn('Firebase belum dikonfigurasi. Lihat docs/TUTORIAL_FIREBASE.md');
            comment.disable();

            if (defaultConfetti) {
                loadConfetti();
            }
            return;
        }

        const settings = session.loadSettings().catch((err) => {
            console.error(err);
            return {};
        });

        settings.then((s) => {
            if (s.is_confetti_animation ?? defaultConfetti) {
                loadConfetti();
            }
        });

        const section = document.getElementById('comment');
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                observer.disconnect();
                settings.then(() => comment.show());
            }
        }, { rootMargin: '800px 0px' });

        observer.observe(section);
    };

    /**
     * @returns {Promise<void>}
     */
    const booting = async () => {
        // wait until welcome screen is show.
        await util.changeOpacity(document.getElementById('welcome'), true);

        // remove loading screen and show welcome screen.
        await util.changeOpacity(document.getElementById('loading'), false).then((el) => el.remove());
    };

    /**
     * @returns {void}
     */
    const pageLoaded = () => {
        lang.init();
        offline.init();
        comment.init();
        progress.init();

        information = storage('information');

        const img = image.init();

        // Satu langkah tambahan untuk font dan animasi.
        progress.add();

        window.addEventListener('resize', util.debounce(slide));
        document.addEventListener('undangan.progress.done', booting, { once: true });
        document.addEventListener('hide.bs.modal', () => document.activeElement?.blur());
        document.getElementById('button-modal-download').addEventListener('click', (e) => {
            img.download(e.currentTarget.getAttribute('data-src'));
        });

        animateSvg();
        countDownDate();
        showGuestName();
        modalImageClick();
        normalizeArabicFont();
        buildGoogleCalendar();

        if (information.has('presence')) {
            document.getElementById('form-presence').value = information.get('presence') ? '1' : '2';
        }

        if (information.get('info')) {
            document.getElementById('information')?.remove();
        }

        img.load();
        video.load();
        audio.load();

        Promise.all([loadAOS(), loadFonts()]).finally(() => progress.complete('animasi'));

        setupComments();
    };

    /**
     * @returns {object}
     */
    const init = () => {
        theme.init();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', pageLoaded, { once: true });
        } else {
            pageLoaded();
        }

        return {
            util,
            theme,
            comment,
            guest: {
                open,
                modal,
                showStory,
                closeInformation,
            },
        };
    };

    return {
        init,
    };
})();
