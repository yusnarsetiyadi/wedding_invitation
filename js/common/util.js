export const util = (() => {

    const loader = '<span class="spinner-border spinner-border-sm my-0 ms-0 me-1 p-0" style="height: 0.8rem; width: 0.8rem;"></span>';

    const listsMarkDown = [
        ['*', `<strong class="text-theme-auto">$1</strong>`],
        ['_', `<em class="text-theme-auto">$1</em>`],
        ['~', `<del class="text-theme-auto">$1</del>`],
        ['```', `<code class="font-monospace text-theme-auto">$1</code>`]
    ];

    // Tambahkan kata lain di sini bila perlu; huruf besar/kecil diabaikan.
    const badWords = /\b(anjing|anjir|bangsat|bajingan|babi|kontol|memek|ngentot|goblok|tolol|tai|fuck|shit|bitch|asshole)\b/gi;

    const relativeUnits = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ];

    /**
     * @param {string} unsafe
     * @returns {string}
     */
    const escapeHtml = (unsafe) => {
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    /**
     * @param {string} text
     * @returns {string}
     */
    const censor = (text) => String(text).replace(badWords, (w) => '•'.repeat(w.length));

    /**
     * @param {Date} date
     * @param {string} [language='id']
     * @returns {string}
     */
    const timeAgo = (date, language = 'id') => {
        const seconds = Math.round((date.getTime() - Date.now()) / 1000);
        const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });

        for (const [unit, size] of relativeUnits) {
            if (Math.abs(seconds) >= size) {
                return format.format(Math.round(seconds / size), unit);
            }
        }

        return format.format(0, 'second');
    };

    /**
     * @param {HTMLElement} el
     * @param {string} html
     * @returns {HTMLElement}
     */
    const safeInnerHTML = (el, html) => {
        el.replaceChildren(document.createRange().createContextualFragment(html));
        return el;
    };

    /**
     * Notifikasi kecil yang tidak menghentikan interaksi seperti alert().
     * @param {string} message
     * @returns {{ success: function, error: function, warning: function, info: function }}
     */
    const notify = (message) => {
        const exec = (type, icon) => {
            let area = document.getElementById('toast-area');
            if (!area) {
                area = document.createElement('div');
                area.id = 'toast-area';
                area.setAttribute('aria-live', 'polite');
                document.body.appendChild(area);
            }

            const toast = document.createElement('div');
            toast.className = `toast-item toast-${type}`;
            toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
            safeInnerHTML(toast, `<i class="fa-solid ${icon} me-2"></i><span>${escapeHtml(message)}</span>`);
            area.appendChild(toast);

            setTimeout(() => toast.remove(), type === 'error' ? 6000 : 3500);
        };

        return {
            success: () => exec('success', 'fa-circle-check'),
            error: () => exec('error', 'fa-circle-xmark'),
            warning: () => exec('warning', 'fa-triangle-exclamation'),
            info: () => exec('info', 'fa-circle-info'),
        };
    };

    /**
     * @param {string} message
     * @returns {boolean}
     */
    const ask = (message) => window.confirm(message);

    /**
     * @param {HTMLElement} el
     * @param {boolean} isUp
     * @param {number} step
     * @returns {Promise<HTMLElement>}
     */
    const changeOpacity = (el, isUp, step = 0.05) => new Promise((res) => {
        let op = parseFloat(el.style.opacity);
        const target = isUp ? 1 : 0;

        const animate = () => {
            op += isUp ? step : -step;
            op = Math.max(0, Math.min(1, op));
            el.style.opacity = op.toFixed(2);

            if ((isUp && op >= target) || (!isUp && op <= target)) {
                el.style.opacity = target.toString();
                res(el);
            } else {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    });

    /**
     * @param {function} callback
     * @param {number} [delay=0]
     * @returns {void}
     */
    const timeOut = (callback, delay = 0) => {
        setTimeout(callback, delay);
    };

    /**
     * @param {function} callback
     * @param {number} [delay=100]
     * @returns {function}
     */
    const debounce = (callback, delay = 100) => {
        let timeout = null;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => callback(...args), delay);
        };
    };

    /**
     * @param {HTMLElement} button
     * @param {string} [message='Memuat']
     * @param {boolean} [replace=false]
     * @returns {object}
     */
    const disableButton = (button, message = 'Memuat', replace = false) => {
        button.disabled = true;

        const tmp = button.innerHTML;
        safeInnerHTML(button, replace ? message : loader + message);

        return {
            restore: (disabled = false) => {
                button.innerHTML = tmp;
                button.disabled = disabled;
            },
        };
    };

    /**
     * @param {HTMLElement} checkbox
     * @returns {object}
     */
    const disableCheckbox = (checkbox) => {
        checkbox.disabled = true;

        const label = document.querySelector(`label[for="${checkbox.id}"]`);
        const tmp = label.innerHTML;
        safeInnerHTML(label, loader + tmp);

        return {
            restore: () => {
                label.innerHTML = tmp;
                checkbox.disabled = false;
            },
        };
    };

    /**
     * @param {HTMLElement} button
     * @param {string} [message=null]
     * @param {number} [timeout=1500]
     * @returns {Promise<void>}
     */
    const copy = async (button, message = null, timeout = 1500) => {
        const data = button.getAttribute('data-copy');

        if (!data || data.length === 0) {
            notify('Tidak ada yang bisa disalin').warning();
            return;
        }

        button.disabled = true;

        try {
            await navigator.clipboard.writeText(data);
        } catch {
            button.disabled = false;
            notify('Gagal menyalin').error();
            return;
        }

        const tmp = button.innerHTML;
        safeInnerHTML(button, message ? message : '<i class="fa-solid fa-check"></i>');

        timeOut(() => {
            button.disabled = false;
            button.innerHTML = tmp;
        }, timeout);
    };

    /**
     * @param {Blob} blob
     * @param {string} filename
     * @returns {void}
     */
    const downloadBlob = (blob, filename) => {
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = href;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(href);
    };

    /**
     * @param {string} str
     * @returns {string}
     */
    const base64Encode = (str) => {
        const encoder = new TextEncoder();
        const encodedBytes = encoder.encode(str);
        return window.btoa(String.fromCharCode(...encodedBytes));
    };

    /**
     * @param {string} str
     * @returns {string}
     */
    const base64Decode = (str) => {
        const decoder = new TextDecoder();
        const decodedBytes = Uint8Array.from(window.atob(str), (c) => c.charCodeAt(0));
        return decoder.decode(decodedBytes);
    };

    /**
     * @param {string} str
     * @returns {string}
     */
    const convertMarkdownToHTML = (str) => {
        listsMarkDown.forEach(([k, v]) => {
            str = str.replace(new RegExp(`\\${k}(\\S(?:[\\s\\S]*?\\S)?)\\${k}`, 'g'), v);
        });

        return str;
    };

    return {
        loader,
        ask,
        copy,
        notify,
        censor,
        timeAgo,
        timeOut,
        debounce,
        escapeHtml,
        downloadBlob,
        base64Encode,
        base64Decode,
        disableButton,
        disableCheckbox,
        safeInnerHTML,
        changeOpacity,
        convertMarkdownToHTML,
    };
})();
