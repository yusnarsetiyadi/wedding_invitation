import { firebaseConfig } from './firebase-config.js';

/**
 * SDK Firebase dimuat saat dibutuhkan agar tidak memperlambat halaman pembuka.
 */
export const firebase = (() => {

    // Tamu dan admin memakai sesi login terpisah walaupun di browser yang sama.
    let appName = 'guest';

    /**
     * @type {Promise<object>|null}
     */
    let appPromise = null;

    /**
     * @type {Promise<object>|null}
     */
    let firestorePromise = null;

    /**
     * @type {Promise<object>|null}
     */
    let authPromise = null;

    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const useEmulator = isLocalhost && new URLSearchParams(window.location.search).has('emulator');

    /**
     * @param {string} name
     * @returns {void}
     */
    const setAppName = (name) => {
        appName = name;
    };

    /**
     * @returns {boolean}
     */
    const isConfigured = () => useEmulator || Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

    /**
     * @returns {Promise<object>}
     */
    const getApp = () => {
        appPromise ??= import('firebase/app').then(({ initializeApp }) => initializeApp(
            useEmulator ? { apiKey: 'demo-key', projectId: 'demo-undangan' } : firebaseConfig,
            appName,
        ));

        return appPromise;
    };

    /**
     * @returns {Promise<object>} Modul Firestore Lite beserta instance `db`.
     */
    const firestore = () => {
        firestorePromise ??= Promise.all([getApp(), import('firebase/firestore/lite')]).then(([app, sdk]) => {
            const db = sdk.getFirestore(app);

            if (useEmulator) {
                sdk.connectFirestoreEmulator(db, '127.0.0.1', 8085);
            }

            return { ...sdk, db };
        });

        return firestorePromise;
    };

    /**
     * @returns {Promise<object>} Modul Auth beserta instance `auth` yang sudah siap.
     */
    const authentication = () => {
        authPromise ??= Promise.all([getApp(), import('firebase/auth')]).then(async ([app, sdk]) => {
            const auth = sdk.initializeAuth(app, {
                persistence: [sdk.indexedDBLocalPersistence, sdk.browserLocalPersistence],
            });

            if (useEmulator) {
                sdk.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
            }

            await auth.authStateReady();
            return { ...sdk, auth };
        });

        return authPromise;
    };

    return {
        setAppName,
        isConfigured,
        firestore,
        authentication,
    };
})();
