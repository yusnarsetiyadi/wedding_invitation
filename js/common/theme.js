import { storage } from './storage.js';

export const theme = (() => {

    const themeColors = {
        '#3a2c33': '#ffffff',
        '#ffffff': '#3a2c33',
        '#2f2329': '#fff5f7',
        '#fff5f7': '#2f2329'
    };
    const themeLight = ['#ffffff', '#fff5f7'];
    const themeDark = ['#3a2c33', '#2f2329'];

    let isAuto = false;

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let themes = null;

    /**
     * @type {HTMLElement|null}
     */
    let metaTheme = null;

    /**
     * @returns {void}
     */
    const setLight = () => themes.set('active', 'light');

    /**
     * @returns {void}
     */
    const setDark = () => themes.set('active', 'dark');

    /**
     * @param {string[]} listTheme
     * @returns {void}
     */
    const setMetaTheme = (listTheme) => {
        const now = metaTheme.getAttribute('content');
        metaTheme.setAttribute('content', listTheme.some((i) => i === now) ? themeColors[now] : now);
    };

    /**
     * @returns {void}
     */
    const onLight = () => {
        setLight();
        document.documentElement.setAttribute('data-bs-theme', 'light');
        setMetaTheme(themeDark);
    };

    /**
     * @returns {void}
     */
    const onDark = () => {
        setDark();
        document.documentElement.setAttribute('data-bs-theme', 'dark');
        setMetaTheme(themeLight);
    };

    /**
     * @param {string|null} [dark=null] 
     * @param {string|null} [light=null] 
     * @returns {boolean|string}
     */
    const isDarkMode = (dark = null, light = null) => {
        const status = themes.get('active') === 'dark';

        if (dark && light) {
            return status ? dark : light;
        }

        return status;
    };

    /**
     * @returns {void}
     */
    const change = () => isDarkMode() ? onLight() : onDark();

    /**
     * @returns {boolean}
     */
    const isAutoMode = () => isAuto;

    /**
     * @returns {void}
     */
    const spyTop = () => {
        const callback = (es) => es.filter((e) => e.isIntersecting).forEach((e) => {
            const themeColor = e.target.classList.contains('bg-white-black')
                ? isDarkMode(themeDark[0], themeLight[0])
                : isDarkMode(themeDark[1], themeLight[1]);

            metaTheme.setAttribute('content', themeColor);
        });

        const observerTop = new IntersectionObserver(callback, { rootMargin: '0% 0% -95% 0%' });
        document.querySelectorAll('section').forEach((e) => observerTop.observe(e));
    };

    /**
     * @returns {void}
     */
    const init = () => {
        themes = storage('theme');
        metaTheme = document.querySelector('meta[name="theme-color"]');

        if (!themes.has('active')) {
            window.matchMedia('(prefers-color-scheme: dark)').matches ? setDark() : setLight();
        }

        switch (document.documentElement.getAttribute('data-bs-theme')) {
            case 'dark':
                setDark();
                break;
            case 'light':
                setLight();
                break;
            default:
                isAuto = true;
        }

        if (isDarkMode()) {
            onDark();
        } else {
            onLight();
        }
    };

    return {
        init,
        spyTop,
        change,
        isDarkMode,
        isAutoMode,
    };
})();