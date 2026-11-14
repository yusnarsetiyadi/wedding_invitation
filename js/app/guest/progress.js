export const progress = (() => {

    // Undangan tetap bisa dibuka walau koneksi tamu lambat.
    const maxWaitMs = 8000;

    /**
     * @type {HTMLElement|null}
     */
    let info = null;

    /**
     * @type {HTMLElement|null}
     */
    let bar = null;

    let total = 0;
    let loaded = 0;
    let done = false;

    /**
     * @returns {void}
     */
    const add = () => {
        total += 1;
    };

    /**
     * @returns {void}
     */
    const finish = () => {
        if (done) {
            return;
        }

        done = true;
        bar.style.width = '100%';
        document.dispatchEvent(new Event('undangan.progress.done'));
    };

    /**
     * @param {string} type
     * @returns {void}
     */
    const complete = (type) => {
        if (done) {
            return;
        }

        loaded += 1;
        info.innerText = `Memuat ${type} (${loaded}/${total})`;
        bar.style.width = `${Math.min((loaded / total) * 100, 100)}%`;

        if (loaded >= total) {
            finish();
        }
    };

    /**
     * @returns {void}
     */
    const init = () => {
        info = document.getElementById('progress-info');
        bar = document.getElementById('progress-bar');
        info.classList.remove('d-none');

        setTimeout(finish, maxWaitMs);
    };

    return {
        init,
        add,
        complete,
    };
})();
