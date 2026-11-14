import { card } from './card.js';
import { like } from './like.js';
import { util } from '../../common/util.js';
import { pagination } from './pagination.js';
import { storage } from '../../common/storage.js';
import { session } from '../../common/session.js';
import { api, errorMessage } from '../../connection/api.js';

export const comment = (() => {

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let owns = null;

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let showHide = null;

    /**
     * @type {HTMLElement|null}
     */
    let comments = null;

    /**
     * @type {string[]}
     */
    const lastRender = [];

    /**
     * @param {string} message
     * @returns {string}
     */
    const renderNotice = (message) => {
        return `<div class="text-center p-4 mx-0 mt-0 mb-3 bg-theme-auto rounded-4 shadow"><p class="fw-bold p-0 m-0" style="font-size: 0.95rem;">${util.escapeHtml(message)}</p></div>`;
    };

    /**
     * @returns {string}
     */
    const onNullComment = () => renderNotice('📢 Jadilah yang pertama mengirim ucapan dan doa! 🎉');

    /**
     * @param {string} id
     * @param {boolean} disabled
     * @returns {void}
     */
    const changeActionButton = (id, disabled) => {
        document.querySelector(`[data-button-action="${id}"]`).childNodes.forEach((e) => {
            e.disabled = disabled;
        });
    };

    /**
     * @param {string} id
     * @returns {void}
     */
    const removeInnerForm = (id) => {
        changeActionButton(id, false);
        document.getElementById(`inner-${id}`).remove();
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {void}
     */
    const showOrHide = (button) => {
        const ids = button.getAttribute('data-uuids').split(',');
        const isShow = button.getAttribute('data-show') === 'true';
        const uuid = button.getAttribute('data-uuid');
        const currentShow = showHide.get('show');

        button.setAttribute('data-show', isShow ? 'false' : 'true');
        button.innerText = isShow ? `Lihat balasan (${ids.length})` : 'Sembunyikan balasan';
        showHide.set('show', isShow ? currentShow.filter((i) => i !== uuid) : [...currentShow, uuid]);

        showHide.set('hidden', showHide.get('hidden').map((i) => (ids.includes(i.uuid) ? { ...i, show: !isShow } : i)));

        ids.forEach((id) => document.getElementById(id).classList.toggle('d-none', isShow));
    };

    /**
     * @param {HTMLAnchorElement} anchor
     * @param {string} uuid
     * @returns {void}
     */
    const showMore = (anchor, uuid) => {
        const content = document.getElementById(`content-${uuid}`);
        const original = util.base64Decode(content.getAttribute('data-comment'));
        const isCollapsed = anchor.getAttribute('data-show') === 'false';

        util.safeInnerHTML(content, card.format(isCollapsed ? original : original.slice(0, card.maxCommentLength) + '...'));
        anchor.innerText = isCollapsed ? 'Sebagian' : 'Selengkapnya';
        anchor.setAttribute('data-show', isCollapsed ? 'true' : 'false');
    };

    /**
     * @param {object[]} items
     * @param {{ uuid: string, show: boolean }[]} hide
     * @returns {{ uuid: string, show: boolean }[]}
     */
    const traverse = (items, hide = []) => {
        const dataShow = showHide.get('show');

        const buildHide = (lists) => lists.forEach((item) => {
            if (!hide.find((i) => i.uuid === item.uuid)) {
                hide.push({ uuid: item.uuid, show: false });
            }

            buildHide(item.comments);
        });

        const setVisible = (lists) => lists.forEach((item) => {
            if (dataShow.includes(item.uuid)) {
                item.comments.forEach((c) => {
                    const i = hide.findIndex((h) => h.uuid === c.uuid);
                    if (i !== -1) {
                        hide[i].show = true;
                    }
                });
            }

            setVisible(item.comments);
        });

        buildHide(items);
        setVisible(items);

        return hide;
    };

    /**
     * @returns {Promise<void>}
     */
    const show = async () => {
        lastRender.forEach((u) => like.removeListener(u));

        if (comments.getAttribute('data-loading') === 'false') {
            comments.setAttribute('data-loading', 'true');
            comments.innerHTML = card.renderLoading().repeat(pagination.getPer());
        }

        try {
            const res = await api.listComments(pagination.getPer(), pagination.getNext());

            if (res.lists.length === 0) {
                lastRender.length = 0;
                comments.innerHTML = onNullComment();
            } else {
                const flatten = (ii) => ii.flatMap((i) => [i.uuid, ...flatten(i.comments)]);
                lastRender.splice(0, lastRender.length, ...flatten(res.lists));
                showHide.set('hidden', traverse(res.lists, showHide.get('hidden')));

                util.safeInnerHTML(comments, card.renderContentMany(res.lists));
                lastRender.forEach((u) => like.addListener(u));
            }

            comments.dispatchEvent(new Event('undangan.comment.result'));
            pagination.setTotal(res.count);
        } catch (err) {
            console.error(err);
            comments.innerHTML = renderNotice(`Ucapan gagal dimuat. ${errorMessage(err)}`);
        } finally {
            comments.setAttribute('data-loading', 'false');
            comments.dispatchEvent(new Event('undangan.comment.done'));
        }
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {Promise<void>}
     */
    const remove = async (button) => {
        if (!util.ask('Yakin ingin menghapus ucapan ini?')) {
            return;
        }

        const id = button.getAttribute('data-uuid');
        const element = document.getElementById(id);
        const isParent = element.parentElement === comments;
        const hasChildren = document.getElementById(`reply-content-${id}`).children.length > 0;

        changeActionButton(id, true);
        const btn = util.disableButton(button);
        const likes = like.getButtonLike(id);
        likes.disabled = true;

        try {
            await api.deleteComment(id, isParent);
        } catch (err) {
            util.notify(errorMessage(err)).error();
            btn.restore();
            likes.disabled = false;
            changeActionButton(id, false);
            return;
        }

        owns.unset(id);

        // Balasan dari tamu lain tetap tersimpan, jadi muat ulang untuk menampilkan posisinya.
        if (!isParent && hasChildren) {
            await show();
            return;
        }

        document.querySelectorAll('a[onclick="undangan.comment.showOrHide(this)"]').forEach((n) => {
            const oldUuids = n.getAttribute('data-uuids').split(',');

            if (oldUuids.includes(id)) {
                const uuids = oldUuids.filter((i) => i !== id).join(',');
                uuids.length === 0 ? n.remove() : n.setAttribute('data-uuids', uuids);
            }
        });

        like.removeListener(id);
        element.remove();

        if (isParent) {
            pagination.setTotal(pagination.geTotal() - 1);
        }

        if (comments.children.length === 0) {
            comments.innerHTML = onNullComment();
        }
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {Promise<void>}
     */
    const update = async (button) => {
        const id = button.getAttribute('data-uuid');
        const form = document.getElementById(`form-inner-${id}`);
        const presence = document.getElementById(`form-inner-presence-${id}`);
        const badge = document.getElementById(`badge-${id}`);

        const isPresent = presence ? presence.value === '1' : false;
        const wasPresent = !!badge && badge.getAttribute('data-is-presence') === 'true';
        const value = form.value.trim();

        if (util.base64Encode(form.value) === form.getAttribute('data-original') && (!presence || wasPresent === isPresent)) {
            removeInnerForm(id);
            return;
        }

        if (value.length === 0) {
            util.notify('Ucapan tidak boleh kosong.').warning();
            return;
        }

        const cancelButton = document.querySelector(`[onclick="undangan.comment.cancel(this, '${id}')"]`);
        const fields = [form, presence, cancelButton].filter(Boolean);
        fields.forEach((f) => {
            f.disabled = true;
        });

        const btn = util.disableButton(button);

        try {
            await api.updateComment(id, { comment: value, presence: presence ? isPresent : null });
        } catch (err) {
            util.notify(errorMessage(err)).error();
            return;
        } finally {
            fields.forEach((f) => {
                f.disabled = false;
            });
            btn.restore();
        }

        removeInnerForm(id);

        const showButton = document.querySelector(`[onclick="undangan.comment.showMore(this, '${id}')"]`);
        const content = document.getElementById(`content-${id}`);
        const isLong = value.length > card.maxCommentLength;
        const isTruncated = isLong && (!showButton || showButton.getAttribute('data-show') === 'false');

        content.setAttribute('data-comment', util.base64Encode(value));
        util.safeInnerHTML(content, card.format(isTruncated ? value.slice(0, card.maxCommentLength) + '...' : value));
        showButton?.parentElement.classList.toggle('d-none', !isLong);

        if (!presence) {
            return;
        }

        document.getElementById('form-presence').value = isPresent ? '1' : '2';
        storage('information').set('presence', isPresent);

        if (badge) {
            badge.setAttribute('data-is-presence', isPresent ? 'true' : 'false');
            badge.classList.toggle('fa-circle-xmark', !isPresent);
            badge.classList.toggle('text-danger', !isPresent);
            badge.classList.toggle('fa-circle-check', isPresent);
            badge.classList.toggle('text-success', isPresent);
        }
    };

    /**
     * @param {string} id
     * @param {object} data
     * @returns {void}
     */
    const appendReply = (id, data) => {
        showHide.set('hidden', showHide.get('hidden').concat([{ uuid: data.uuid, show: true }]));

        if (!showHide.get('show').includes(id)) {
            showHide.set('show', showHide.get('show').concat([id]));
        }

        removeInnerForm(id);
        document.getElementById(`reply-content-${id}`).insertAdjacentHTML('beforeend', card.renderContent(data));

        const anchorTag = document.getElementById(`button-${id}`).querySelector('a');
        if (anchorTag?.getAttribute('data-show') === 'false') {
            showOrHide(anchorTag);
        }

        const previous = anchorTag ? anchorTag.getAttribute('data-uuids').split(',') : [];
        anchorTag?.remove();

        const readMore = document.createRange().createContextualFragment(card.renderReadMore(id, [...previous, data.uuid]));
        const buttonLike = like.getButtonLike(id);
        buttonLike.parentNode.insertBefore(readMore, buttonLike);
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {Promise<void>}
     */
    const send = async (button) => {
        const id = button.getAttribute('data-uuid');
        const name = document.getElementById('form-name');
        const nameValue = name.value.trim();

        if (nameValue.length < 2) {
            util.notify('Nama minimal 2 karakter.').warning();
            name.scrollIntoView({ block: 'center' });
            return;
        }

        const presence = document.getElementById('form-presence');
        if (!id && presence && presence.value === '0') {
            util.notify('Mohon pilih konfirmasi kehadiran Anda.').warning();
            return;
        }

        const form = document.getElementById(id ? `form-inner-${id}` : 'form-comment');
        const value = form.value.trim();
        if (value.length === 0) {
            util.notify('Ucapan tidak boleh kosong.').warning();
            return;
        }

        const isAdmin = session.isAdmin();
        const isPresent = presence ? presence.value === '1' : true;
        const cancelButton = id ? document.querySelector(`[onclick="undangan.comment.cancel(this, '${id}')"]`) : null;
        const fields = [form, cancelButton, ...(isAdmin ? [] : [name, presence])].filter(Boolean);

        fields.forEach((f) => {
            f.disabled = true;
        });

        const btn = util.disableButton(button);

        let response = null;
        try {
            response = await api.createComment({
                name: nameValue,
                comment: value,
                presence: isPresent,
                parentId: id,
                isAdmin,
            });
        } catch (err) {
            util.notify(errorMessage(err)).error();
        } finally {
            fields.forEach((f) => {
                f.disabled = false;
            });
            btn.restore();
        }

        if (!response) {
            return;
        }

        owns.set(response.uuid, true);
        form.value = '';

        if (!isAdmin) {
            const info = storage('information');
            info.set('name', nameValue);

            if (!id) {
                info.set('presence', isPresent);
            }
        }

        if (id) {
            appendReply(id, response);
        } else {
            if (pagination.reset()) {
                await show();
                comments.scrollIntoView();
                return;
            }

            pagination.setTotal(pagination.geTotal() + 1);
            if (comments.children.length >= pagination.getPer()) {
                comments.lastElementChild.remove();
            }

            if (pagination.geTotal() === 1) {
                comments.innerHTML = '';
            }

            comments.insertAdjacentHTML('afterbegin', card.renderContent(response));
            comments.scrollIntoView();
        }

        like.addListener(response.uuid);
        lastRender.push(response.uuid);
        util.notify('Terima kasih, ucapan Anda terkirim.').success();
    };

    /**
     * @param {HTMLButtonElement} button
     * @param {string} id
     * @returns {void}
     */
    const cancel = (button, id) => {
        const form = document.getElementById(`form-inner-${id}`);
        const isUnchanged = form.value.length === 0 || util.base64Encode(form.value) === form.getAttribute('data-original');

        if (isUnchanged || util.ask('Batalkan perubahan?')) {
            removeInnerForm(id);
        }
    };

    /**
     * @param {string} uuid
     * @returns {void}
     */
    const reply = (uuid) => {
        changeActionButton(uuid, true);
        document.getElementById(`button-${uuid}`).insertAdjacentElement('afterend', card.renderReply(uuid));
        document.getElementById(`form-inner-${uuid}`).focus();
    };

    /**
     * @param {HTMLButtonElement} button
     * @param {boolean} is_parent
     * @returns {void}
     */
    const edit = (button, is_parent) => {
        const id = button.getAttribute('data-uuid');
        changeActionButton(id, true);

        const badge = document.getElementById(`badge-${id}`);
        const isChecklist = !!badge && badge.getAttribute('data-is-presence') === 'true';
        const isParent = is_parent && !session.isAdmin();

        document.getElementById(`button-${id}`).insertAdjacentElement('afterend', card.renderEdit(id, isChecklist, isParent));

        const formInner = document.getElementById(`form-inner-${id}`);
        const original = util.base64Decode(document.getElementById(`content-${id}`).getAttribute('data-comment'));

        formInner.value = original;
        formInner.setAttribute('data-original', util.base64Encode(original));
    };

    /**
     * Ditampilkan bila Firebase belum dikonfigurasi.
     * @returns {void}
     */
    const disable = () => {
        comments.innerHTML = renderNotice('Fitur ucapan belum aktif karena Firebase belum dikonfigurasi.');
        document.querySelector('[onclick="undangan.comment.send(this)"]')?.setAttribute('disabled', 'true');
    };

    /**
     * @returns {void}
     */
    const init = () => {
        like.init();
        card.init();
        pagination.init();

        comments = document.getElementById('comments');
        comments.addEventListener('undangan.comment.show', show);

        owns = storage('owns');
        showHide = storage('comment');

        if (!showHide.has('hidden')) {
            showHide.set('hidden', []);
        }

        if (!showHide.has('show')) {
            showHide.set('show', []);
        }
    };

    return {
        like,
        pagination,
        init,
        send,
        edit,
        reply,
        remove,
        update,
        cancel,
        disable,
        show,
        showMore,
        showOrHide,
    };
})();
