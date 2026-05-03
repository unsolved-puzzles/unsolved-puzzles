/* ═══════════════════════════════════════════════════════════════
   starfield.js — Twinkling night sky canvas
   Dark background with stars that pulse at random intervals
   ═══════════════════════════════════════════════════════════════ */

(function () {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let stars = [];
    let animId;

    const CONFIG = {
        count: 200,
        minSize: 0.5,
        maxSize: 2.2,
        minAlpha: 0.1,
        maxAlpha: 0.9,
        twinkleSpeed: 0.008,       // base speed of pulsing
        twinkleVariance: 0.015,    // random variance per star
        brightFlashChance: 0.0003, // per star per frame — rare bright flash
        colors: [
            '255, 255, 255',       // white
            '255, 250, 230',       // warm white
            '200, 220, 255',       // blue-white
            '255, 215, 140',       // gold tint
        ],
    };

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createStars() {
        stars = [];
        for (let i = 0; i < CONFIG.count; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: CONFIG.minSize + Math.random() * (CONFIG.maxSize - CONFIG.minSize),
                alpha: CONFIG.minAlpha + Math.random() * (CONFIG.maxAlpha - CONFIG.minAlpha),
                targetAlpha: CONFIG.minAlpha + Math.random() * (CONFIG.maxAlpha - CONFIG.minAlpha),
                speed: CONFIG.twinkleSpeed + Math.random() * CONFIG.twinkleVariance,
                color: CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)],
                flashing: false,
                flashAlpha: 0,
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const star of stars) {
            // Twinkle: drift alpha toward target
            const diff = star.targetAlpha - star.alpha;
            if (Math.abs(diff) < 0.01) {
                // Pick new random target
                star.targetAlpha = CONFIG.minAlpha + Math.random() * (CONFIG.maxAlpha - CONFIG.minAlpha);
            } else {
                star.alpha += diff * star.speed;
            }

            // Rare bright flash
            if (!star.flashing && Math.random() < CONFIG.brightFlashChance) {
                star.flashing = true;
                star.flashAlpha = 1.0;
            }
            if (star.flashing) {
                star.flashAlpha -= 0.02;
                if (star.flashAlpha <= 0) {
                    star.flashing = false;
                    star.flashAlpha = 0;
                }
            }

            const displayAlpha = Math.min(1, star.alpha + star.flashAlpha * 0.5);

            // Draw star
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${star.color}, ${displayAlpha})`;
            ctx.fill();

            // Glow for brighter stars / flashing
            if (displayAlpha > 0.6 || star.flashing) {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${star.color}, ${displayAlpha * 0.15})`;
                ctx.fill();
            }
        }

        animId = requestAnimationFrame(draw);
    }

    function init() {
        resize();
        createStars();
        draw();
    }

    window.addEventListener('resize', () => {
        resize();
        createStars();
    });

    // Start after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
