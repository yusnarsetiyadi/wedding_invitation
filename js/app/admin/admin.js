import { auth } from './auth.js';
import { navbar } from './navbar.js';
import { util } from '../../common/util.js';
import { theme } from '../../common/theme.js';
import { lang } from '../../common/language.js';
import { session } from '../../common/session.js';
import { offline } from '../../common/offline.js';
import { setStoragePrefix } from '../../common/storage.js';
import { comment } from '../components/comment.js';
import { firebase } from '../../connection/firebase.js';
import { api, errorMessage } from '../../connection/api.js';

export const admin = (() => {

    const switches = {
        filterBadWord: 'is_filter',
        confettiAnimation: 'is_confetti_animation',
        replyComment: 'can_reply',
        editComment: 'can_edit',
        deleteComment: 'can_delete',
    };

    /**
     * @param {number} value
     * @returns {string}
     */
    const formatNumber = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    /**
     * @param {string} name
     * @returns {void}
     */
    const showName = (name) => {
        util.safeInnerHTML(document.getElementById('dashboard-name'), `${util.escapeHtml(name)}<i class="fa-solid fa-heart text-danger ms-2"></i>`);
    };

    /**
     * @returns {Promise<void>}
     */
    const getUserStats = async () => {
        try {
            const user = await api.currentUser();
            const settings = await session.loadSettings();
            const name = user.displayName ?? 'Asha & Yusnar';

            showName(name);
            document.getElementById('dashboard-email').textContent = user.email;
            document.getElementById('form-name').value = name;

            Object.entries(switches).forEach(([id, key]) => {
                document.getElementById(id).checked = Boolean(settings[key]);
            });

            comment.show();

            const stats = await api.getStats();
            document.getElementById('count-comment').textContent = formatNumber(stats.comments);
            document.getElementById('count-like').textContent = formatNumber(stats.likes);
            document.getElementById('count-present').textContent = formatNumber(stats.present);
            document.getElementById('count-absent').textContent = formatNumber(stats.absent);
        } catch (err) {
            util.notify(errorMessage(err)).error();
        }
    };

    /**
     * @param {HTMLInputElement} checkbox
     * @returns {Promise<void>}
     */
    const changeCheckboxValue = async (checkbox) => {
        const label = util.disableCheckbox(checkbox);

        try {
            await api.updateSettings({ [switches[checkbox.id]]: checkbox.checked });
        } catch (err) {
            checkbox.checked = !checkbox.checked;
            util.notify(errorMessage(err)).error();
        } finally {
            label.restore();
        }
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {Promise<void>}
     */
    const changePassword = async (button) => {
        const old = document.getElementById('old_password');
        const newest = document.getElementById('new_password');

        if (old.value.length === 0 || newest.value.length === 0) {
            util.notify('Password tidak boleh kosong.').warning();
            return;
        }

        old.disabled = true;
        newest.disabled = true;
        const btn = util.disableButton(button);

        try {
            await api.changePassword(old.value, newest.value);
            old.value = '';
            newest.value = '';
            util.notify('Password berhasil diubah.').success();
        } catch (err) {
            util.notify(errorMessage(err)).error();
        } finally {
            btn.restore(true);
            old.disabled = false;
            newest.disabled = false;
        }
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {Promise<void>}
     */
    const changeName = async (button) => {
        const name = document.getElementById('form-name');
        const value = name.value.trim();

        if (value.length < 2) {
            util.notify('Nama minimal 2 karakter.').warning();
            return;
        }

        name.disabled = true;
        const btn = util.disableButton(button);

        try {
            await api.changeName(value);
            showName(value);
            util.notify('Nama berhasil diubah.').success();
        } catch (err) {
            util.notify(errorMessage(err)).error();
        } finally {
            name.disabled = false;
            btn.restore(true);
        }
    };

    /**
     * Awalan ' mencegah isian tamu dijalankan sebagai rumus saat dibuka di Excel.
     * @param {unknown} value
     * @returns {string}
     */
    const csvCell = (value) => {
        const text = String(value ?? '');
        const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

        return `"${safe.replace(/"/g, '""')}"`;
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {Promise<void>}
     */
    const download = async (button) => {
        const btn = util.disableButton(button);

        try {
            const rows = await api.exportComments();
            const header = ['ID', 'Tipe', 'Nama', 'Kehadiran', 'Ucapan', 'Suka', 'Waktu'];
            const presenceLabel = { true: 'Datang', false: 'Berhalangan', null: '' };
            const lines = rows.map((c) => [
                c.uuid,
                c.is_parent ? 'Ucapan' : 'Balasan',
                c.name,
                presenceLabel[c.presence],
                c.comment,
                c.like_count,
                c.created_at.toISOString(),
            ].map(csvCell).join(','));

            const csv = '﻿' + [header.map(csvCell).join(','), ...lines].join('\r\n');
            util.downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `ucapan_undangan_${Date.now()}.csv`);
        } catch (err) {
            util.notify(errorMessage(err)).error();
        } finally {
            btn.restore();
        }
    };

    /**
     * @returns {void}
     */
    const enableButtonName = () => {
        document.getElementById('button-change-name').disabled = false;
    };

    /**
     * @returns {void}
     */
    const enableButtonPassword = () => {
        const old = document.getElementById('old_password');
        document.getElementById('button-change-password').disabled = old.value.length === 0;
    };

    /**
     * @returns {void}
     */
    const logout = () => {
        if (util.ask('Yakin ingin keluar?')) {
            auth.clearSession();
        }
    };

    /**
     * @returns {Promise<void>}
     */
    const pageLoaded = async () => {
        lang.init();
        lang.setDefault('id');

        comment.init();
        offline.init();
        theme.spyTop();

        if (!firebase.isConfigured()) {
            comment.disable();
            util.notify('Firebase belum dikonfigurasi. Lihat docs/TUTORIAL_FIREBASE.md').warning();
            return;
        }

        document.addEventListener('hidden.bs.modal', getUserStats);

        const user = await api.currentUser();
        if (user && await api.isAdminUser(user)) {
            session.setAdmin(true);
            getUserStats();
        } else {
            auth.clearSession();
        }
    };

    /**
     * @returns {object}
     */
    const init = () => {
        setStoragePrefix('admin_');
        firebase.setAppName('admin');
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
            admin: {
                auth,
                navbar,
                logout,
                download,
                changeName,
                changePassword,
                changeCheckboxValue,
                enableButtonName,
                enableButtonPassword,
            },
        };
    };

    return {
        init,
    };
})();
