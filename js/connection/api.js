import { firebase } from './firebase.js';

export const defaultSettings = {
    can_reply: true,
    can_edit: true,
    can_delete: true,
    is_filter: true,
    is_confetti_animation: true,
};

const errorMessages = {
    'permission-denied': 'Aksi ini tidak diizinkan.',
    'unavailable': 'Koneksi bermasalah, coba lagi sebentar.',
    'resource-exhausted': 'Kuota harian penyimpanan sudah habis, coba lagi besok.',
    'auth/operation-not-allowed': 'Metode login belum diaktifkan di Firebase Console.',
    'auth/admin-restricted-operation': 'Login anonim belum diaktifkan di Firebase Console.',
    'auth/invalid-credential': 'Email atau password salah.',
    'auth/wrong-password': 'Password salah.',
    'auth/weak-password': 'Password baru minimal 6 karakter.',
    'auth/too-many-requests': 'Terlalu banyak percobaan, coba lagi nanti.',
    'auth/network-request-failed': 'Koneksi bermasalah, coba lagi sebentar.',
};

/**
 * @param {Error & { code?: string }} err
 * @returns {string}
 */
export const errorMessage = (err) => {
    const code = String(err?.code ?? '').replace(/^firestore\//, '');
    return errorMessages[code] ?? err?.message ?? 'Terjadi kesalahan, coba lagi.';
};

export const api = (() => {

    const collectionName = 'comments';
    const maxInQuery = 30;

    /**
     * Cursor setiap halaman agar tidak membaca ulang dokumen halaman sebelumnya.
     * @type {Map<number, object>}
     */
    const cursors = new Map();

    /**
     * @returns {Promise<import('firebase/auth').User>}
     */
    const ensureUser = async () => {
        const { auth, signInAnonymously } = await firebase.authentication();
        return auth.currentUser ?? (await signInAnonymously(auth)).user;
    };

    /**
     * @param {object} snap
     * @returns {object}
     */
    const toComment = (snap) => {
        const data = snap.data();

        return {
            uuid: snap.id,
            name: data.name,
            presence: data.presence ?? null,
            comment: data.comment,
            created_at: data.created_at?.toDate() ?? new Date(),
            is_admin: data.is_admin === true,
            is_parent: !data.parent_id,
            parent_id: data.parent_id ?? null,
            like_count: data.like_count ?? 0,
            comments: [],
        };
    };

    /**
     * @param {object[]} parents
     * @returns {Promise<void>}
     */
    const attachReplies = async (parents) => {
        const { db, collection, query, where, getDocs } = await firebase.firestore();
        const col = collection(db, collectionName);
        const nodes = new Map(parents.map((p) => [p.uuid, p]));
        const snaps = [];

        for (let i = 0; i < parents.length; i += maxInQuery) {
            const ids = parents.slice(i, i + maxInQuery).map((p) => p.uuid);
            snaps.push(getDocs(query(col, where('root_id', 'in', ids))));
        }

        const replies = (await Promise.all(snaps))
            .flatMap((s) => s.docs.map((d) => ({ ...toComment(d), root_id: d.data().root_id })))
            .sort((a, b) => a.created_at - b.created_at);

        replies.forEach((r) => nodes.set(r.uuid, r));

        // Balasan yang induknya sudah dihapus dipindahkan ke ucapan utama.
        replies.forEach((r) => (nodes.get(r.parent_id) ?? nodes.get(r.root_id))?.comments.push(r));
    };

    /**
     * @param {number} per
     * @param {number} offset
     * @returns {Promise<{ count: number, lists: object[] }>}
     */
    const listComments = async (per, offset) => {
        const { db, collection, query, orderBy, limit, startAfter, getDocs, getCount } = await firebase.firestore();
        const threads = query(collection(db, collectionName), orderBy('thread_at', 'desc'));
        const cursor = cursors.get(offset);

        const pageQuery = offset === 0 || cursor
            ? query(threads, ...(cursor ? [startAfter(cursor)] : []), limit(per))
            : query(threads, limit(offset + per));

        const [page, total] = await Promise.all([getDocs(pageQuery), getCount(threads)]);
        const docs = offset > 0 && !cursor ? page.docs.slice(offset) : page.docs;

        if (docs.length > 0) {
            cursors.set(offset + per, docs[docs.length - 1]);
        }

        const lists = docs.map(toComment);
        if (lists.length > 0) {
            await attachReplies(lists);
        }

        return { count: total.data().count, lists };
    };

    /**
     * @param {{ name: string, comment: string, presence: boolean|null, parentId: string|null, isAdmin: boolean }} input
     * @returns {Promise<object>}
     */
    const createComment = async ({ name, comment, presence, parentId, isAdmin }) => {
        const { db, collection, doc, getDoc, addDoc, serverTimestamp } = await firebase.firestore();
        const user = await ensureUser();

        const data = {
            uid: user.uid,
            name,
            comment,
            is_admin: isAdmin,
            like_count: 0,
            created_at: serverTimestamp(),
        };

        if (parentId) {
            const parent = await getDoc(doc(db, collectionName, parentId));
            if (!parent.exists()) {
                throw new Error('Ucapan yang dibalas sudah dihapus.');
            }

            data.parent_id = parentId;
            data.root_id = parent.data().root_id ?? parentId;
        } else {
            data.thread_at = serverTimestamp();
            if (!isAdmin) {
                data.presence = presence;
            }
        }

        const ref = await addDoc(collection(db, collectionName), data);
        cursors.clear();

        return {
            uuid: ref.id,
            name,
            comment,
            presence: data.presence ?? null,
            created_at: new Date(),
            is_admin: isAdmin,
            is_parent: !parentId,
            parent_id: parentId,
            like_count: 0,
            comments: [],
        };
    };

    /**
     * @param {string} id
     * @param {{ comment: string, presence: boolean|null }} input
     * @returns {Promise<void>}
     */
    const updateComment = async (id, { comment, presence }) => {
        const { db, doc, updateDoc, serverTimestamp } = await firebase.firestore();
        await ensureUser();

        await updateDoc(doc(db, collectionName, id), {
            comment,
            updated_at: serverTimestamp(),
            ...(presence === null ? {} : { presence }),
        });
    };

    /**
     * Menghapus ucapan utama sekaligus seluruh balasannya.
     * @param {string} id
     * @param {boolean} isParent
     * @returns {Promise<void>}
     */
    const deleteComment = async (id, isParent) => {
        const { db, collection, doc, query, where, getDocs, writeBatch } = await firebase.firestore();
        await ensureUser();

        const batchLimit = 500;
        const refs = [doc(db, collectionName, id)];

        if (isParent) {
            const replies = await getDocs(query(collection(db, collectionName), where('root_id', '==', id)));
            refs.push(...replies.docs.map((d) => d.ref));
        }

        for (let i = 0; i < refs.length; i += batchLimit) {
            const batch = writeBatch(db);
            refs.slice(i, i + batchLimit).forEach((r) => batch.delete(r));
            await batch.commit();
        }

        cursors.clear();
    };

    /**
     * @param {string} id
     * @param {boolean} liked
     * @returns {Promise<void>}
     */
    const setLike = async (id, liked) => {
        const { db, doc, writeBatch, increment, serverTimestamp } = await firebase.firestore();
        const user = await ensureUser();

        const commentRef = doc(db, collectionName, id);
        const likeRef = doc(db, collectionName, id, 'likes', user.uid);
        const batch = writeBatch(db);

        if (liked) {
            batch.set(likeRef, { created_at: serverTimestamp() });
        } else {
            batch.delete(likeRef);
        }

        batch.update(commentRef, { like_count: increment(liked ? 1 : -1) });
        await batch.commit();
    };

    /**
     * @returns {Promise<typeof defaultSettings>}
     */
    const getSettings = async () => {
        const { db, doc, getDoc } = await firebase.firestore();
        const snap = await getDoc(doc(db, 'settings', 'app'));

        return { ...defaultSettings, ...(snap.exists() ? snap.data() : {}) };
    };

    /**
     * @param {Partial<typeof defaultSettings>} values
     * @returns {Promise<void>}
     */
    const updateSettings = async (values) => {
        const { db, doc, setDoc } = await firebase.firestore();
        await setDoc(doc(db, 'settings', 'app'), values, { merge: true });
    };

    /**
     * @returns {Promise<{ comments: number, present: number, absent: number, likes: number }>}
     */
    const getStats = async () => {
        const { db, collection, query, where, getCount, getAggregate, sum } = await firebase.firestore();
        const col = collection(db, collectionName);

        const [comments, present, absent, likes] = await Promise.all([
            getCount(col),
            getCount(query(col, where('presence', '==', true))),
            getCount(query(col, where('presence', '==', false))),
            getAggregate(col, { total: sum('like_count') }),
        ]);

        return {
            comments: comments.data().count,
            present: present.data().count,
            absent: absent.data().count,
            likes: likes.data().total,
        };
    };

    /**
     * @returns {Promise<object[]>}
     */
    const exportComments = async () => {
        const { db, collection, query, orderBy, getDocs } = await firebase.firestore();
        const snap = await getDocs(query(collection(db, collectionName), orderBy('created_at', 'asc')));

        return snap.docs.map(toComment);
    };

    /**
     * @param {import('firebase/auth').User} user
     * @returns {Promise<boolean>}
     */
    const isAdminUser = async (user) => {
        const { db, doc, getDoc } = await firebase.firestore();

        try {
            return (await getDoc(doc(db, 'admins', user.uid))).exists();
        } catch {
            return false;
        }
    };

    /**
     * @param {string} email
     * @param {string} password
     * @returns {Promise<import('firebase/auth').User>}
     */
    const login = async (email, password) => {
        const { auth, signInWithEmailAndPassword, signOut } = await firebase.authentication();
        const { user } = await signInWithEmailAndPassword(auth, email, password);

        if (!(await isAdminUser(user))) {
            await signOut(auth);
            throw new Error('Akun ini belum terdaftar sebagai admin. Ikuti langkah di docs/TUTORIAL_FIREBASE.md.');
        }

        return user;
    };

    /**
     * @returns {Promise<void>}
     */
    const logout = async () => {
        const { auth, signOut } = await firebase.authentication();
        await signOut(auth);
    };

    /**
     * @returns {Promise<import('firebase/auth').User|null>}
     */
    const currentUser = async () => {
        const { auth } = await firebase.authentication();
        return auth.currentUser;
    };

    /**
     * @param {string} name
     * @returns {Promise<void>}
     */
    const changeName = async (name) => {
        const { auth, updateProfile } = await firebase.authentication();
        await updateProfile(auth.currentUser, { displayName: name });
    };

    /**
     * @param {string} oldPassword
     * @param {string} newPassword
     * @returns {Promise<void>}
     */
    const changePassword = async (oldPassword, newPassword) => {
        const { auth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await firebase.authentication();
        const user = auth.currentUser;

        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, oldPassword));
        await updatePassword(user, newPassword);
    };

    return {
        listComments,
        createComment,
        updateComment,
        deleteComment,
        setLike,
        getSettings,
        updateSettings,
        getStats,
        exportComments,
        login,
        logout,
        isAdminUser,
        currentUser,
        changeName,
        changePassword,
    };
})();
