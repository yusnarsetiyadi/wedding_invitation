import { util } from '../../common/util.js';

export const audio = (() => {

    const statePlay = '<i class="fa-solid fa-circle-pause spin-button"></i>';
    const statePause = '<i class="fa-solid fa-circle-play"></i>';

    /**
     * Musik di-stream saat undangan dibuka, tidak menunda halaman pembuka.
     * @returns {void}
     */
    const load = () => {
        const url = document.body.getAttribute('data-audio');
        const music = document.getElementById('button-music');
        if (!url || !music) {
            return;
        }

        const audioEl = new Audio();
        audioEl.loop = true;
        audioEl.preload = 'none';
        audioEl.src = url;

        let isPlay = false;
        let resumeOnReturn = false;

        /**
         * @returns {Promise<void>}
         */
        const play = async () => {
            music.disabled = true;

            try {
                await audioEl.play();
                isPlay = true;
                music.innerHTML = statePlay;
            } catch (err) {
                isPlay = false;
                music.innerHTML = statePause;

                if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
                    util.notify('Musik gagal diputar.').error();
                }
            } finally {
                music.disabled = false;
            }
        };

        /**
         * @returns {void}
         */
        const pause = () => {
            isPlay = false;
            audioEl.pause();
            music.innerHTML = statePause;
        };

        document.addEventListener('undangan.open', () => {
            music.classList.remove('d-none');
            play();
        });

        // Musik berhenti saat tamu berpindah aplikasi, lalu lanjut saat kembali.
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                resumeOnReturn = isPlay;
                if (isPlay) {
                    pause();
                }
            } else if (resumeOnReturn) {
                resumeOnReturn = false;
                play();
            }
        });

        music.addEventListener('offline', pause);
        music.addEventListener('click', () => (isPlay ? pause() : play()));
    };

    return {
        load,
    };
})();
