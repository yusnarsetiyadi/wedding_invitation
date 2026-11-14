import { util } from '../../common/util.js';
import { lang } from '../../common/language.js';
import { storage } from '../../common/storage.js';
import { session } from '../../common/session.js';

export const card = (() => {

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let owns = null;

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let likes = null;

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let config = null;

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let showHide = null;

    const maxCommentLength = 300;

    /**
     * @param {string} text
     * @returns {string}
     */
    const format = (text) => {
        const filtered = config.get('is_filter') !== false && !session.isAdmin() ? util.censor(text) : text;
        return util.convertMarkdownToHTML(util.escapeHtml(filtered));
    };

    /**
     * @returns {string}
     */
    const renderLoading = () => {
        return `
        <div class="bg-theme-auto shadow p-3 mx-0 mt-0 mb-3 rounded-4">
            <div class="d-flex justify-content-between align-items-center placeholder-wave">
                <span class="placeholder bg-secondary col-5 rounded-3 my-1"></span>
                <span class="placeholder bg-secondary col-3 rounded-3 my-1"></span>
            </div>
            <hr class="my-1">
            <p class="placeholder-wave m-0">
                <span class="placeholder bg-secondary col-6 rounded-3"></span>
                <span class="placeholder bg-secondary col-5 rounded-3"></span>
                <span class="placeholder bg-secondary col-12 rounded-3 my-1"></span>
            </p>
        </div>`;
    };

    /**
     * @param {object} c
     * @returns {string}
     */
    const renderLike = (c) => {
        return `
        <button style="font-size: 0.8rem;" onclick="undangan.comment.like.love(this)" data-uuid="${c.uuid}" aria-label="Suka" class="btn btn-sm btn-outline-auto ms-auto rounded-3 p-0 shadow-sm d-flex justify-content-start align-items-center" data-offline-disabled="false">
            <span class="my-0 mx-1" data-count-like="${c.like_count}">${c.like_count}</span>
            <i class="me-1 ${likes.has(c.uuid) ? 'fa-solid fa-heart text-danger' : 'fa-regular fa-heart'}"></i>
        </button>`;
    };

    /**
     * @param {object} c
     * @returns {string}
     */
    const renderAction = (c) => {
        let action = `<div class="d-flex justify-content-start align-items-center" data-button-action="${c.uuid}">`;
        const button = (label, onclick) => `<button style="font-size: 0.8rem;" onclick="${onclick}" data-uuid="${c.uuid}" class="btn btn-sm btn-outline-auto rounded-4 py-0 me-1 shadow-sm" data-offline-disabled="false">${label}</button>`;

        if (session.isAdmin() || config.get('can_reply') !== false) {
            action += button('Balas', `undangan.comment.reply('${c.uuid}')`);
        }

        const canEdit = session.isAdmin() ? c.is_admin : owns.has(c.uuid) && config.get('can_edit') !== false;
        if (canEdit) {
            action += button('Ubah', `undangan.comment.edit(this, ${c.is_parent ? 'true' : 'false'})`);
        }

        if (session.isAdmin() || (owns.has(c.uuid) && config.get('can_delete') !== false)) {
            action += button('Hapus', 'undangan.comment.remove(this)');
        }

        return action + '</div>';
    };

    /**
     * @param {string} uuid
     * @param {string[]} uuids
     * @returns {string}
     */
    const renderReadMore = (uuid, uuids) => {
        uuid = util.escapeHtml(uuid);

        const hasId = showHide.get('show').includes(uuid);
        return `<a class="text-theme-auto me-auto ms-1 py-0" style="font-size: 0.8rem;" onclick="undangan.comment.showOrHide(this)" data-uuid="${uuid}" data-uuids="${util.escapeHtml(uuids.join(','))}" data-show="${hasId ? 'true' : 'false'}" role="button">${hasId ? 'Sembunyikan balasan' : `Lihat balasan (${uuids.length})`}</a>`;
    };

    /**
     * @param {object} c
     * @returns {string}
     */
    const renderButton = (c) => {
        return `
        <div class="d-flex justify-content-between align-items-center" id="button-${c.uuid}">
            ${renderAction(c)}
            ${c.comments.length > 0 ? renderReadMore(c.uuid, c.comments.map((i) => i.uuid)) : ''}
            ${renderLike(c)}
        </div>`;
    };

    /**
     * @param {object} c
     * @returns {string}
     */
    const renderHeader = (c) => {
        if (c.is_parent) {
            return `class="bg-theme-auto shadow p-3 mx-0 mt-0 mb-3 rounded-4"`;
        }

        const visible = showHide.get('hidden').find((i) => i.uuid === c.uuid)?.show;
        return `class="${visible ? '' : 'd-none'} overflow-x-auto mw-100 border-start bg-theme-auto py-2 ps-2 pe-0 my-2 ms-2 me-0"`;
    };

    /**
     * @param {object} c
     * @returns {string}
     */
    const renderTitle = (c) => {
        if (c.is_admin) {
            return `<strong class="me-1">${util.escapeHtml(c.name)}</strong><i class="fa-solid fa-certificate text-primary"></i>`;
        }

        if (c.is_parent) {
            return `<strong class="me-1">${util.escapeHtml(c.name)}</strong><i id="badge-${c.uuid}" data-is-presence="${c.presence ? 'true' : 'false'}" class="fa-solid ${c.presence ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i>`;
        }

        return `<strong>${util.escapeHtml(c.name)}</strong>`;
    };

    /**
     * @param {object} c
     * @returns {string}
     */
    const renderBody = (c) => {
        const isLong = c.comment.length > maxCommentLength;
        const data = format(isLong ? (c.comment.slice(0, maxCommentLength) + '...') : c.comment);

        return `
        <div class="d-flex justify-content-between align-items-center">
            <p class="text-theme-auto text-truncate m-0 p-0" style="font-size: 0.95rem;">${renderTitle(c)}</p>
            <small class="text-theme-auto text-nowrap ms-2 m-0 p-0" style="font-size: 0.75rem;">${util.escapeHtml(util.timeAgo(c.created_at, lang.getLanguage()))}</small>
        </div>
        <hr class="my-1">
        <p dir="auto" class="text-theme-auto my-1 mx-0 p-0" style="white-space: pre-wrap !important; font-size: 0.95rem;" data-comment="${util.base64Encode(c.comment)}" id="content-${c.uuid}">${data}</p>
        ${isLong ? `<p class="d-block mb-2 mt-0 mx-0 p-0"><a class="text-theme-auto" role="button" style="font-size: 0.85rem;" data-show="false" onclick="undangan.comment.showMore(this, '${c.uuid}')">Selengkapnya</a></p>` : ''}`;
    };

    /**
     * @param {object} c
     * @returns {string}
     */
    const renderContent = (c) => {
        return `
        <div ${renderHeader(c)} id="${c.uuid}" style="overflow-wrap: break-word !important;">
            <div id="body-content-${c.uuid}" data-tapTime="0" data-liked="false" tabindex="0">${renderBody(c)}</div>
            ${renderButton(c)}
            <div id="reply-content-${c.uuid}">${c.comments.map(renderContent).join('')}</div>
        </div>`;
    };

    /**
     * @param {object[]} cs
     * @returns {string}
     */
    const renderContentMany = (cs) => cs.map(renderContent).join('');

    /**
     * @param {string} id
     * @returns {HTMLDivElement}
     */
    const renderReply = (id) => {
        id = util.escapeHtml(id);

        const inner = document.createElement('div');
        inner.classList.add('my-2');
        inner.id = `inner-${id}`;
        const template = `
        <p class="my-1 mx-0 p-0" style="font-size: 0.95rem;"><i class="fa-solid fa-reply me-2"></i>Balas</p>
        <textarea dir="auto" class="form-control shadow-sm rounded-4 mb-2" id="form-inner-${id}" minlength="1" maxlength="1000" placeholder="Tulis balasan" rows="3" data-offline-disabled="false"></textarea>
        <div class="d-flex justify-content-end align-items-center mb-0">
            <button style="font-size: 0.8rem;" onclick="undangan.comment.cancel(this, '${id}')" class="btn btn-sm btn-outline-auto rounded-4 py-0 me-1" data-offline-disabled="false">Batal</button>
            <button style="font-size: 0.8rem;" onclick="undangan.comment.send(this)" data-uuid="${id}" class="btn btn-sm btn-outline-auto rounded-4 py-0" data-offline-disabled="false">Kirim</button>
        </div>`;

        return util.safeInnerHTML(inner, template);
    };

    /**
     * @param {string} id
     * @param {boolean} presence
     * @param {boolean} is_parent
     * @returns {HTMLDivElement}
     */
    const renderEdit = (id, presence, is_parent) => {
        id = util.escapeHtml(id);

        const inner = document.createElement('div');
        inner.classList.add('my-2');
        inner.id = `inner-${id}`;
        const template = `
        <p class="my-1 mx-0 p-0" style="font-size: 0.95rem;"><i class="fa-solid fa-pen me-2"></i>Ubah</p>
        ${!is_parent ? '' : `
        <select class="form-select shadow-sm mb-2 rounded-4" id="form-inner-presence-${id}" aria-label="Kehadiran" data-offline-disabled="false">
            <option value="1" ${presence ? 'selected' : ''}>&#9989; Datang</option>
            <option value="2" ${presence ? '' : 'selected'}>&#10060; Berhalangan</option>
        </select>`}
        <textarea dir="auto" class="form-control shadow-sm rounded-4 mb-2" id="form-inner-${id}" minlength="1" maxlength="1000" placeholder="Ubah ucapan" rows="3" data-offline-disabled="false"></textarea>
        <div class="d-flex justify-content-end align-items-center mb-0">
            <button style="font-size: 0.8rem;" onclick="undangan.comment.cancel(this, '${id}')" class="btn btn-sm btn-outline-auto rounded-4 py-0 me-1" data-offline-disabled="false">Batal</button>
            <button style="font-size: 0.8rem;" onclick="undangan.comment.update(this)" data-uuid="${id}" class="btn btn-sm btn-outline-auto rounded-4 py-0" data-offline-disabled="false">Simpan</button>
        </div>`;

        return util.safeInnerHTML(inner, template);
    };

    /**
     * @returns {void}
     */
    const init = () => {
        owns = storage('owns');
        likes = storage('likes');
        config = storage('config');
        showHide = storage('comment');
    };

    return {
        init,
        format,
        renderEdit,
        renderReply,
        renderLoading,
        renderReadMore,
        renderContentMany,
        renderContent,
        maxCommentLength,
    };
})();
