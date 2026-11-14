let prefix = '';

/**
 * Memisahkan data lokal halaman admin dari data tamu di browser yang sama.
 * @param {string} value
 * @returns {void}
 */
export const setStoragePrefix = (value) => {
    prefix = value;
};

export const storage = (name) => {

    const table = prefix + name;

    /**
     * @param {string|null} [key=null]
     * @returns {any}
     */
    const get = (key = null) => {
        const data = JSON.parse(localStorage.getItem(table));
        return key ? data[String(key)] : data;
    };

    /**
     * @param {string} key
     * @param {any} value
     * @returns {void}
     */
    const set = (key, value) => {
        const data = get();
        data[String(key)] = value;
        localStorage.setItem(table, JSON.stringify(data));
    };

    /**
     * @param {string} key
     * @returns {boolean}
     */
    const has = (key) => Object.keys(get()).includes(String(key));

    /**
     * @param {string} key
     * @returns {void}
     */
    const unset = (key) => {
        if (!has(key)) {
            return;
        }

        const data = get();
        delete data[String(key)];
        localStorage.setItem(table, JSON.stringify(data));
    };

    /**
     * @returns {void}
     */
    const clear = () => localStorage.setItem(table, '{}');

    if (!localStorage.getItem(table)) {
        clear();
    }

    return {
        set,
        get,
        has,
        clear,
        unset,
    };
};
