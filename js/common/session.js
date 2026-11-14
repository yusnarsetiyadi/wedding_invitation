import { storage } from './storage.js';
import { api } from '../connection/api.js';

export const session = (() => {

    let admin = false;

    /**
     * @returns {boolean}
     */
    const isAdmin = () => admin;

    /**
     * @param {boolean} value
     * @returns {void}
     */
    const setAdmin = (value) => {
        admin = value;
    };

    /**
     * @returns {Promise<object>}
     */
    const loadSettings = async () => {
        const settings = await api.getSettings();
        const config = storage('config');

        Object.entries(settings).forEach(([k, v]) => config.set(k, v));

        return settings;
    };

    return {
        isAdmin,
        setAdmin,
        loadSettings,
    };
})();
