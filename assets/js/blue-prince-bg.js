/* ═══════════════════════════════════════════════════════════════
   blue-prince-bg.js — Blue Prince atmospheric background
   Deep midnight sky with constellations, floating dust motes,
   parallax Victorian architecture silhouettes, flickering
   candle glow, and subtle window-light from below
   ═══════════════════════════════════════════════════════════════ */

(function () {
    const canvas = document.getElementById('game-atmosphere');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let stars = [];
    let dustMotes = [];
    let candles = [];
    let doorFrames = [];
    let scrollY = 0;
    let time = 0;

    const STAR_COUNT = 150;
    const DUST_COUNT = 25;
    const CANDLE_COUNT = 4;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        createDoorFrames();
    }

    function createStars() {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height * 0.7,
                size: 0.3 + Math.random() * 1.8,
                alpha: 0.1 + Math.random() * 0.7,
                twinkleOffset: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.005 + Math.random() * 0.02,
                color: Math.random() > 0.7 ? '180, 200, 255' : '255, 250, 240',
            });
        }
    }

    function createDust() {
        dustMotes = [];
        for (let i = 0; i < DUST_COUNT; i++) {
            dustMotes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 1 + Math.random() * 2,
                alpha: 0.05 + Math.random() * 0.15,
                vx: (Math.random() - 0.5) * 0.2,
                vy: -0.1 - Math.random() * 0.2,
                wobbleOffset: Math.random() * Math.PI * 2,
                layer: Math.random() > 0.5 ? 'near' : 'far',
            });
        }
    }

    function createCandles() {
        candles = [];
        for (let i = 0; i < CANDLE_COUNT; i++) {
            candles.push({
                x: 60 + Math.random() * (canvas.width - 120),
                y: canvas.height * 0.5 + Math.random() * canvas.height * 0.35,
                flickerOffset: Math.random() * Math.PI * 2,
                flickerSpeed: 0.03 + Math.random() * 0.04,
                size: 15 + Math.random() * 20,
                alpha: 0.03 + Math.random() * 0.04,
            });
        }
    }

    function createDoorFrames() {
        // Victorian door/window silhouettes at edges — parallax layer
        doorFrames = [];
        const frameCount = Math.floor(canvas.width / 400) + 1;
        for (let i = 0; i < frameCount; i++) {
            doorFrames.push({
                x: 80 + i * (canvas.width / frameCount) + (Math.random() - 0.5) * 60,
                width: 30 + Math.random() * 20,
                height: 60 + Math.random() * 40,
                archHeight: 10 + Math.random() * 15,
                alpha: 0.02 + Math.random() * 0.03,
                layer: Math.random() > 0.5 ? 'far' : 'near',
            });
        }
    }

    function drawDoorFrame(frame) {
        const parallax = frame.layer === 'far' ? 0.05 : 0.15;
        const offsetY = scrollY * parallax;
        const x = frame.x;
        const y = canvas.height * 0.55 + offsetY;
        const w = frame.width;
        const h = frame.height;
        const arch = frame.archHeight;

        ctx.save();
        ctx.strokeStyle = `rgba(44, 62, 138, ${frame.alpha})`;
        ctx.lineWidth = 1.5;

        // Door/window arch
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y + h);
        ctx.lineTo(x - w / 2, y);
        ctx.quadraticCurveTo(x - w / 2, y - arch, x, y - arch);
        ctx.quadraticCurveTo(x + w / 2, y - arch, x + w / 2, y);
        ctx.lineTo(x + w / 2, y + h);
        ctx.stroke();

        // Faint inner glow
        const glow = ctx.createRadialGradient(x, y + h * 0.3, 0, x, y + h * 0.3, w);
        glow.addColorStop(0, `rgba(74, 108, 247, ${frame.alpha * 0.5})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(x - w, y - arch, w * 2, h + arch);

        ctx.restore();
    }

    function drawCandle(candle) {
        const flicker = Math.sin(time * candle.flickerSpeed + candle.flickerOffset);
        const flicker2 = Math.sin(time * candle.flickerSpeed * 1.7 + candle.flickerOffset + 1);
        const intensity = candle.alpha * (0.7 + flicker * 0.2 + flicker2 * 0.1);
        const s = candle.size * (0.9 + flicker * 0.1);

        // Warm glow
        const glow = ctx.createRadialGradient(candle.x, candle.y, 0, candle.x, candle.y, s);
        glow.addColorStop(0, `rgba(255, 180, 60, ${intensity})`);
        glow.addColorStop(0.4, `rgba(212, 130, 40, ${intensity * 0.4})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(candle.x - s, candle.y - s, s * 2, s * 2);
    }

    function draw() {
        time++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // ── Parallax: far door frames ─────────────────────────
        for (const frame of doorFrames) {
            if (frame.layer === 'far') drawDoorFrame(frame);
        }

        // Subtle radial glow from below (window light)
        const gradient = ctx.createRadialGradient(
            canvas.width * 0.5, canvas.height * 1.1, 0,
            canvas.width * 0.5, canvas.height * 1.1, canvas.height * 0.8
        );
        gradient.addColorStop(0, 'rgba(44, 62, 138, 0.06)');
        gradient.addColorStop(0.5, 'rgba(74, 108, 247, 0.02)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Stars with twinkle
        for (const star of stars) {
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
            const alpha = star.alpha * (0.5 + twinkle * 0.5);

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${star.color}, ${alpha})`;
            ctx.fill();

            if (alpha > 0.5) {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${star.color}, ${alpha * 0.08})`;
                ctx.fill();
            }
        }

        // Candle glows
        for (const candle of candles) {
            drawCandle(candle);
        }

        // ── Parallax: near door frames ────────────────────────
        for (const frame of doorFrames) {
            if (frame.layer === 'near') drawDoorFrame(frame);
        }

        // Floating golden dust motes (with parallax)
        for (const mote of dustMotes) {
            const parallaxMult = mote.layer === 'near' ? 0.15 : 0.05;
            mote.x += mote.vx + Math.sin(time * 0.01 + mote.wobbleOffset) * 0.1;
            mote.y += mote.vy;

            if (mote.y < -10) mote.y = canvas.height + 10;
            if (mote.x < -10) mote.x = canvas.width + 10;
            if (mote.x > canvas.width + 10) mote.x = -10;

            const drawY = mote.y + scrollY * parallaxMult;

            ctx.beginPath();
            ctx.arc(mote.x, drawY, mote.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(212, 175, 55, ${mote.alpha})`;
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }

    function init() {
        resize();
        createStars();
        createDust();
        createCandles();
        draw();
    }

    window.addEventListener('resize', () => {
        resize();
        createStars();
        createDust();
        createCandles();
    });

    window.addEventListener('scroll', () => {
        scrollY = window.scrollY || window.pageYOffset;
    }, { passive: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
