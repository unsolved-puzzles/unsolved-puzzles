/* ═══════════════════════════════════════════════════════════════
   noita-bg.js — Noita atmospheric background
   Dark cavern with parallax depth layers, creature silhouettes,
   dripping particles, faint glowing runes, floating eyes,
   and green/purple magical sparks
   ═══════════════════════════════════════════════════════════════ */

(function () {
    const canvas = document.getElementById('game-atmosphere');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let drips = [];
    let sparks = [];
    let runes = [];
    let eyes = [];
    let bats = [];
    let worms = [];
    let stalactites = [];
    let stalagmites = [];
    let scrollY = 0;
    let time = 0;

    const DRIP_COUNT = 15;
    const SPARK_COUNT = 20;
    const RUNE_COUNT = 6;
    const EYE_COUNT = 3;
    const BAT_COUNT = 5;
    const WORM_COUNT = 2;
    const STALACTITE_COUNT = 12;
    const STALAGMITE_COUNT = 8;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createDrips() {
        drips = [];
        for (let i = 0; i < DRIP_COUNT; i++) {
            drips.push(newDrip());
        }
    }

    function newDrip() {
        return {
            x: Math.random() * canvas.width,
            y: -10 - Math.random() * canvas.height,
            speed: 0.5 + Math.random() * 1.5,
            length: 10 + Math.random() * 25,
            alpha: 0.1 + Math.random() * 0.25,
            color: Math.random() > 0.5 ? '34, 197, 94' : '107, 33, 168',
        };
    }

    function createSparks() {
        sparks = [];
        for (let i = 0; i < SPARK_COUNT; i++) {
            sparks.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 0.5 + Math.random() * 1.5,
                alpha: 0,
                targetAlpha: 0.1 + Math.random() * 0.4,
                fadeSpeed: 0.005 + Math.random() * 0.01,
                phase: Math.random() > 0.5 ? 'in' : 'out',
                color: Math.random() > 0.6
                    ? '34, 197, 94'   // noita green
                    : Math.random() > 0.5
                        ? '168, 85, 247' // purple
                        : '255, 200, 50', // gold
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
            });
        }
    }

    function createRunes() {
        // Faint glowing symbols that pulse in/out
        const runeChars = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᛁ', 'ᛃ', 'ᛈ'];
        runes = [];
        for (let i = 0; i < RUNE_COUNT; i++) {
            runes.push({
                x: 50 + Math.random() * (canvas.width - 100),
                y: 100 + Math.random() * (canvas.height - 200),
                char: runeChars[Math.floor(Math.random() * runeChars.length)],
                alpha: 0,
                maxAlpha: 0.08 + Math.random() * 0.12,
                phase: Math.random() * Math.PI * 2,
                speed: 0.003 + Math.random() * 0.005,
                size: 20 + Math.random() * 30,
            });
        }
    }

    function createEyes() {
        eyes = [];
        for (let i = 0; i < EYE_COUNT; i++) {
            eyes.push({
                x: 80 + Math.random() * (canvas.width - 160),
                y: 150 + Math.random() * (canvas.height - 300),
                size: 3 + Math.random() * 4,
                alpha: 0,
                maxAlpha: 0.3 + Math.random() * 0.3,
                openDelay: Math.floor(300 + Math.random() * 600),
                openDuration: Math.floor(100 + Math.random() * 200),
                timer: 0,
                state: 'waiting',
            });
        }
    }

    // ── Creature Silhouettes ──────────────────────────────────

    function createBats() {
        bats = [];
        for (let i = 0; i < BAT_COUNT; i++) {
            bats.push(newBat());
        }
    }

    function newBat() {
        const fromLeft = Math.random() > 0.5;
        return {
            x: fromLeft ? -40 : canvas.width + 40,
            y: 30 + Math.random() * canvas.height * 0.4,
            vx: fromLeft ? (0.3 + Math.random() * 0.8) : -(0.3 + Math.random() * 0.8),
            vy: (Math.random() - 0.5) * 0.3,
            size: 8 + Math.random() * 12,
            wingPhase: Math.random() * Math.PI * 2,
            wingSpeed: 0.08 + Math.random() * 0.06,
            alpha: 0.15 + Math.random() * 0.2,
            delay: Math.floor(Math.random() * 400),
            timer: 0,
            active: false,
        };
    }

    function drawBat(bat) {
        if (!bat.active) return;
        const s = bat.size;
        const wing = Math.sin(time * bat.wingSpeed + bat.wingPhase);
        const wingY = wing * s * 0.6;

        ctx.save();
        ctx.translate(bat.x, bat.y);
        if (bat.vx < 0) ctx.scale(-1, 1);
        ctx.fillStyle = `rgba(15, 5, 25, ${bat.alpha})`;

        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.3, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Left wing
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, 0);
        ctx.quadraticCurveTo(-s * 0.6, -s * 0.1 + wingY, -s, wingY * 0.5);
        ctx.quadraticCurveTo(-s * 0.7, s * 0.15, -s * 0.2, s * 0.1);
        ctx.fill();

        // Right wing
        ctx.beginPath();
        ctx.moveTo(s * 0.2, 0);
        ctx.quadraticCurveTo(s * 0.6, -s * 0.1 + wingY, s, wingY * 0.5);
        ctx.quadraticCurveTo(s * 0.7, s * 0.15, s * 0.2, s * 0.1);
        ctx.fill();

        // Tiny ears
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, -s * 0.15);
        ctx.lineTo(-s * 0.15, -s * 0.35);
        ctx.lineTo(0, -s * 0.18);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(s * 0.1, -s * 0.15);
        ctx.lineTo(s * 0.15, -s * 0.35);
        ctx.lineTo(0, -s * 0.18);
        ctx.fill();

        ctx.restore();
    }

    function createWorms() {
        worms = [];
        for (let i = 0; i < WORM_COUNT; i++) {
            worms.push(newWorm());
        }
    }

    function newWorm() {
        const fromLeft = Math.random() > 0.5;
        const y = canvas.height * 0.5 + Math.random() * canvas.height * 0.4;
        return {
            segments: 12,
            headX: fromLeft ? -60 : canvas.width + 60,
            headY: y,
            vx: fromLeft ? (0.4 + Math.random() * 0.5) : -(0.4 + Math.random() * 0.5),
            vy: 0,
            trail: [],
            size: 4 + Math.random() * 3,
            alpha: 0.12 + Math.random() * 0.15,
            waveAmp: 15 + Math.random() * 10,
            waveFreq: 0.03 + Math.random() * 0.02,
            delay: Math.floor(Math.random() * 600),
            timer: 0,
            active: false,
            color: Math.random() > 0.5 ? '80, 20, 40' : '40, 60, 20',
        };
    }

    function drawWorm(worm) {
        if (!worm.active) return;

        // Update trail
        worm.trail.unshift({ x: worm.headX, y: worm.headY });
        if (worm.trail.length > worm.segments * 4) worm.trail.pop();

        ctx.save();
        ctx.strokeStyle = `rgba(${worm.color}, ${worm.alpha})`;
        ctx.lineCap = 'round';

        // Draw body segments
        if (worm.trail.length > 2) {
            ctx.beginPath();
            ctx.moveTo(worm.trail[0].x, worm.trail[0].y);
            for (let i = 1; i < worm.trail.length; i++) {
                ctx.lineTo(worm.trail[i].x, worm.trail[i].y);
            }
            ctx.lineWidth = worm.size;
            ctx.stroke();

            // Thinner highlight
            ctx.beginPath();
            ctx.moveTo(worm.trail[0].x, worm.trail[0].y);
            for (let i = 1; i < Math.min(worm.trail.length, 6); i++) {
                ctx.lineTo(worm.trail[i].x, worm.trail[i].y);
            }
            ctx.lineWidth = worm.size * 0.4;
            ctx.strokeStyle = `rgba(${worm.color}, ${worm.alpha * 0.5})`;
            ctx.stroke();
        }

        ctx.restore();
    }

    // ── Parallax Cavern Layers ────────────────────────────────

    function createStalactites() {
        stalactites = [];
        for (let i = 0; i < STALACTITE_COUNT; i++) {
            stalactites.push({
                x: Math.random() * canvas.width,
                width: 6 + Math.random() * 20,
                height: 30 + Math.random() * 80,
                layer: Math.random() > 0.6 ? 'far' : 'near', // parallax depth
                alpha: 0.03 + Math.random() * 0.06,
            });
        }
    }

    function createStalagmites() {
        stalagmites = [];
        for (let i = 0; i < STALAGMITE_COUNT; i++) {
            stalagmites.push({
                x: Math.random() * canvas.width,
                width: 10 + Math.random() * 25,
                height: 20 + Math.random() * 60,
                layer: Math.random() > 0.6 ? 'far' : 'near',
                alpha: 0.03 + Math.random() * 0.06,
            });
        }
    }

    function drawStalactite(s) {
        const parallax = s.layer === 'far' ? 0.1 : 0.3;
        const offsetY = scrollY * parallax;

        ctx.save();
        ctx.fillStyle = `rgba(8, 15, 8, ${s.alpha})`;
        ctx.beginPath();
        ctx.moveTo(s.x - s.width / 2, 0 + offsetY);
        ctx.lineTo(s.x + s.width / 2, 0 + offsetY);
        ctx.lineTo(s.x + s.width * 0.1, s.height + offsetY);
        ctx.lineTo(s.x - s.width * 0.1, s.height * 0.9 + offsetY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawStalagmite(s) {
        const parallax = s.layer === 'far' ? 0.05 : 0.2;
        const offsetY = -scrollY * parallax;

        ctx.save();
        ctx.fillStyle = `rgba(8, 15, 8, ${s.alpha})`;
        ctx.beginPath();
        const baseY = canvas.height + offsetY;
        ctx.moveTo(s.x - s.width / 2, baseY);
        ctx.lineTo(s.x + s.width / 2, baseY);
        ctx.lineTo(s.x + s.width * 0.08, baseY - s.height);
        ctx.lineTo(s.x - s.width * 0.08, baseY - s.height * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // ── Cavern edge vignette (parallax layer 0) ──────────────

    function drawCavernEdges() {
        const parallax = scrollY * 0.05;

        // Top edge — rough cavern ceiling
        ctx.save();
        ctx.fillStyle = 'rgba(5, 8, 5, 0.12)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
            const x = (canvas.width / steps) * i;
            const y = 15 + Math.sin(i * 1.7 + 0.5) * 12 + Math.sin(i * 3.1) * 5 + parallax;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, 0);
        ctx.closePath();
        ctx.fill();

        // Bottom edge — rough floor
        ctx.fillStyle = 'rgba(5, 8, 5, 0.08)';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for (let i = 0; i <= steps; i++) {
            const x = (canvas.width / steps) * i;
            const y = canvas.height - 10 - Math.sin(i * 2.3 + 1) * 10 - Math.sin(i * 4.1) * 4 - parallax;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        ctx.fill();

        // Left edge
        ctx.fillStyle = 'rgba(5, 8, 5, 0.06)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const vSteps = 15;
        for (let i = 0; i <= vSteps; i++) {
            const y = (canvas.height / vSteps) * i;
            const x = 8 + Math.sin(i * 2.1 + 0.3) * 8 + Math.sin(i * 3.7) * 3;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();

        // Right edge
        ctx.beginPath();
        ctx.moveTo(canvas.width, 0);
        for (let i = 0; i <= vSteps; i++) {
            const y = (canvas.height / vSteps) * i;
            const x = canvas.width - 8 - Math.sin(i * 1.9 + 2) * 8 - Math.sin(i * 3.3) * 3;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    function draw() {
        time++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // ── Parallax Layer 0: Cavern edges ────────────────────
        drawCavernEdges();

        // ── Parallax Layer 1: Far stalactites/stalagmites ─────
        for (const s of stalactites) {
            if (s.layer === 'far') drawStalactite(s);
        }
        for (const s of stalagmites) {
            if (s.layer === 'far') drawStalagmite(s);
        }

        // Cavern gradient overlay — dark with faint green at edges
        const edgeGlow = ctx.createRadialGradient(
            canvas.width * 0.5, canvas.height * 0.5, canvas.height * 0.3,
            canvas.width * 0.5, canvas.height * 0.5, canvas.height * 0.9
        );
        edgeGlow.addColorStop(0, 'transparent');
        edgeGlow.addColorStop(1, 'rgba(10, 30, 10, 0.15)');
        ctx.fillStyle = edgeGlow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Drips
        for (let i = 0; i < drips.length; i++) {
            const d = drips[i];
            d.y += d.speed;
            if (d.y > canvas.height + 30) {
                drips[i] = newDrip();
                drips[i].y = -20;
                continue;
            }
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x, d.y + d.length);
            ctx.strokeStyle = `rgba(${d.color}, ${d.alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Floating sparks
        for (const s of sparks) {
            s.x += s.vx;
            s.y += s.vy;

            // Wrap
            if (s.x < 0) s.x = canvas.width;
            if (s.x > canvas.width) s.x = 0;
            if (s.y < 0) s.y = canvas.height;
            if (s.y > canvas.height) s.y = 0;

            // Fade in/out
            if (s.phase === 'in') {
                s.alpha += s.fadeSpeed;
                if (s.alpha >= s.targetAlpha) s.phase = 'out';
            } else {
                s.alpha -= s.fadeSpeed * 0.5;
                if (s.alpha <= 0) {
                    s.alpha = 0;
                    s.phase = 'in';
                    s.targetAlpha = 0.1 + Math.random() * 0.4;
                    s.x = Math.random() * canvas.width;
                    s.y = Math.random() * canvas.height;
                }
            }

            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${s.color}, ${s.alpha})`;
            ctx.fill();

            // Glow
            if (s.alpha > 0.2) {
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size * 4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${s.color}, ${s.alpha * 0.1})`;
                ctx.fill();
            }
        }

        // Runes — faint pulsing
        for (const r of runes) {
            r.alpha = r.maxAlpha * (0.5 + Math.sin(time * r.speed + r.phase) * 0.5);
            ctx.font = `${r.size}px serif`;
            ctx.fillStyle = `rgba(168, 85, 247, ${r.alpha})`;
            ctx.textAlign = 'center';
            ctx.fillText(r.char, r.x, r.y);
        }

        // Eyes — appear and vanish
        for (const eye of eyes) {
            eye.timer++;

            switch (eye.state) {
                case 'waiting':
                    if (eye.timer >= eye.openDelay) {
                        eye.state = 'opening';
                        eye.timer = 0;
                    }
                    break;
                case 'opening':
                    eye.alpha += 0.01;
                    if (eye.alpha >= eye.maxAlpha) {
                        eye.state = 'open';
                        eye.timer = 0;
                    }
                    break;
                case 'open':
                    if (eye.timer >= eye.openDuration) {
                        eye.state = 'closing';
                    }
                    break;
                case 'closing':
                    eye.alpha -= 0.008;
                    if (eye.alpha <= 0) {
                        eye.alpha = 0;
                        eye.state = 'waiting';
                        eye.timer = 0;
                        eye.openDelay = Math.floor(300 + Math.random() * 600);
                        eye.x = 80 + Math.random() * (canvas.width - 160);
                        eye.y = 150 + Math.random() * (canvas.height - 300);
                    }
                    break;
            }

            if (eye.alpha > 0) {
                // Eye shape — simple almond
                const s = eye.size;
                ctx.save();
                ctx.translate(eye.x, eye.y);

                // Outer eye (almond shape)
                ctx.beginPath();
                ctx.ellipse(0, 0, s * 2, s, 0, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200, 100, 255, ${eye.alpha * 0.3})`;
                ctx.fill();

                // Iris
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(168, 85, 247, ${eye.alpha})`;
                ctx.fill();

                // Pupil
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(10, 0, 20, ${eye.alpha})`;
                ctx.fill();

                // Glow
                ctx.beginPath();
                ctx.arc(0, 0, s * 4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(168, 85, 247, ${eye.alpha * 0.05})`;
                ctx.fill();

                ctx.restore();
            }
        }

        // ── Creature Silhouettes ──────────────────────────────

        // Bats
        for (let i = 0; i < bats.length; i++) {
            const bat = bats[i];
            bat.timer++;
            if (!bat.active && bat.timer >= bat.delay) {
                bat.active = true;
            }
            if (bat.active) {
                bat.x += bat.vx;
                bat.y += bat.vy + Math.sin(time * 0.02 + i) * 0.2;
                drawBat(bat);
                // Reset when off screen
                if (bat.x < -60 || bat.x > canvas.width + 60) {
                    bats[i] = newBat();
                }
            }
        }

        // Worms
        for (let i = 0; i < worms.length; i++) {
            const worm = worms[i];
            worm.timer++;
            if (!worm.active && worm.timer >= worm.delay) {
                worm.active = true;
            }
            if (worm.active) {
                worm.headX += worm.vx;
                worm.headY += Math.sin(time * worm.waveFreq + i * 3) * (worm.waveAmp * 0.02);
                drawWorm(worm);
                if (worm.headX < -100 || worm.headX > canvas.width + 100) {
                    worms[i] = newWorm();
                }
            }
        }

        // ── Parallax Layer 2: Near stalactites/stalagmites ────
        for (const s of stalactites) {
            if (s.layer === 'near') drawStalactite(s);
        }
        for (const s of stalagmites) {
            if (s.layer === 'near') drawStalagmite(s);
        }

        requestAnimationFrame(draw);
    }

    function init() {
        resize();
        createDrips();
        createSparks();
        createRunes();
        createEyes();
        createBats();
        createWorms();
        createStalactites();
        createStalagmites();
        draw();
    }

    window.addEventListener('resize', () => {
        resize();
        createDrips();
        createSparks();
        createRunes();
        createEyes();
        createBats();
        createWorms();
        createStalactites();
        createStalagmites();
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
