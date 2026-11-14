import { util } from '../../common/util.js';
import { bs } from '../../libs/bootstrap.js';
import { session } from '../../common/session.js';
import { api, errorMessage } from '../../connection/api.js';

export const auth = (() => {

    /**
     * @param {HTMLButtonElement} button
     * @returns {Promise<void>}
     */
    const login = async (button) => {
        const formEmail = document.getElementById('loginEmail');
        const formPassword = document.getElementById('loginPassword');

        if (formEmail.value.length === 0 || formPassword.value.length === 0) {
            util.notify('Email dan password wajib diisi.').warning();
            return;
        }

        const btn = util.disableButton(button);
        formEmail.disabled = true;
        formPassword.disabled = true;

        try {
            await api.login(formEmail.value, formPassword.value);
            session.setAdmin(true);

            formEmail.value = '';
            formPassword.value = '';
            bs.modal('mainModal').hide();
        } catch (err) {
            util.notify(errorMessage(err)).error();
        } finally {
            btn.restore();
            formEmail.disabled = false;
            formPassword.disabled = false;
        }
    };

    /**
     * @returns {Promise<void>}
     */
    const clearSession = async () => {
        session.setAdmin(false);
        await api.logout().catch(() => {});
        bs.modal('mainModal').show();
    };

    return {
        login,
        clearSession,
    };
})();
