export const video = (() => {

    /**
     * Video di-stream saat bagiannya hampir terlihat, tidak diunduh di awal.
     * @returns {void}
     */
    const load = () => {
        const wrap = document.getElementById('video-love-story');
        const src = wrap?.getAttribute('data-src');
        if (!src) {
            wrap?.remove();
            return;
        }

        const vid = document.createElement('video');
        vid.className = wrap.getAttribute('data-vid-class');
        vid.loop = true;
        vid.muted = true;
        vid.controls = true;
        vid.playsInline = true;
        vid.preload = 'none';
        vid.disablePictureInPicture = true;
        vid.disableRemotePlayback = true;
        vid.controlsList = 'noremoteplayback nodownload noplaybackrate';
        wrap.appendChild(vid);

        vid.addEventListener('error', () => {
            console.error(`Gagal memuat video: ${src}`);
            wrap.remove();
        }, { once: true });

        new IntersectionObserver((entries) => entries.forEach((e) => {
            if (e.isIntersecting && !vid.src) {
                vid.preload = 'metadata';
                vid.src = src;
            }
        }), { rootMargin: '400px 0px' }).observe(wrap);

        new IntersectionObserver((entries) => entries.forEach((e) => {
            if (e.isIntersecting) {
                vid.play().catch(() => {});
            } else {
                vid.pause();
            }
        })).observe(wrap);
    };

    return {
        load,
    };
})();
