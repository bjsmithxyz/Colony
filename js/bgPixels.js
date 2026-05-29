/** Background pixel splatter canvas behind the simulation UI. */

let flickerTimer = null;
const FLICKER_INTERVAL_MS = 1200;

export function initBgPixels() {
    const canvas = document.getElementById('bgPixels');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let resizeTimeout = null;

    function drawPixels() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const dpr = window.devicePixelRatio || 1;
        ctx.scale(dpr, dpr);

        const w = window.innerWidth;
        const h = window.innerHeight;

        ctx.fillStyle = '#141414';
        ctx.fillRect(0, 0, w, h);

        const density = Math.max(0.0006, Math.min(0.002, (w * h) / (1024 * 1024) * 0.001));
        const count = Math.floor(w * h * density);

        for (let i = 0; i < count; i++) {
            const x = Math.floor(Math.random() * w);
            const y = Math.floor(Math.random() * h);
            const size = Math.random() < 0.9 ? 1 : (Math.random() * 3 | 0) + 1;
            const shade = Math.floor(30 + Math.random() * 70);
            ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
            ctx.fillRect(x, y, size, size);
        }
    }

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        drawPixels();
    }

    function flickerPixels() {
        if (document.hidden) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (let i = 0; i < 200; i++) {
            const x = Math.floor(Math.random() * w);
            const y = Math.floor(Math.random() * h);
            const shade = Math.floor(20 + Math.random() * 80);
            ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    function stopFlicker() {
        if (flickerTimer) {
            clearInterval(flickerTimer);
            flickerTimer = null;
        }
    }

    function startFlicker() {
        stopFlicker();
        if (document.hidden) return;
        flickerTimer = setInterval(flickerPixels, FLICKER_INTERVAL_MS + Math.random() * 800);
    }

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resize, 120);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopFlicker();
        } else {
            startFlicker();
        }
    });

    resize();
    startFlicker();
}
