// Background pixel splatter generator
(function(){
    const canvas = document.getElementById('bgPixels');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.scale(dpr, dpr);
        drawPixels();
    }

    function drawPixels() {
        // Clear
        ctx.clearRect(0,0,canvas.width, canvas.height);

        const w = window.innerWidth;
        const h = window.innerHeight;

        // base grey background
        ctx.fillStyle = '#141414';
        ctx.fillRect(0,0,w,h);

        // Draw random pixel splatters
        const density = Math.max(0.0006, Math.min(0.002, (w*h) / (1024*1024) * 0.001));
        const count = Math.floor(w * h * density);

        for (let i=0;i<count;i++){
            const x = Math.floor(Math.random()*w);
            const y = Math.floor(Math.random()*h);
            const size = Math.random() < 0.9 ? 1 : (Math.random()*3|0) + 1; // mostly 1px, some larger
            const shade = Math.floor(30 + Math.random() * 70); // grey shades
            ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
            ctx.fillRect(x, y, size, size);
        }
    }

    // Redraw on resize with debounce
    let resizeTimeout;
    window.addEventListener('resize', ()=>{
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resize, 120);
    });

    // Initial draw
    resize();

    // Optional: animate subtle flicker by occasionally redrawing some pixels
    setInterval(()=>{
        // randomly tweak a few pixels to add life
        const w = window.innerWidth;
        const h = window.innerHeight;
        for (let i=0;i<200;i++){
            const x = Math.floor(Math.random()*w);
            const y = Math.floor(Math.random()*h);
            const shade = Math.floor(20 + Math.random() * 80);
            ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
            ctx.fillRect(x,y,1,1);
        }
    }, 1200 + Math.random()*800);

})();
