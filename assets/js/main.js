/* ═══════════════════════════════════════════════════════════════
   main.js — Unsolved Puzzles
   Particle effects, scroll animations, finding filters
   ═══════════════════════════════════════════════════════════════ */

// ── Particles Background ──────────────────────────────────────

async function initParticles() {
    if (typeof tsParticles === 'undefined') return;

    await tsParticles.load("particles-bg", {
        fullScreen: false,
        particles: {
            number: { value: 30, density: { enable: true, area: 1000 } },
            color: { value: ["#d4af37", "#c0392b", "#a8a5a0"] },
            opacity: {
                value: { min: 0.1, max: 0.3 },
                animation: { enable: true, speed: 0.3, minimumValue: 0.05 }
            },
            size: {
                value: { min: 1, max: 3 },
            },
            move: {
                enable: true,
                speed: 0.3,
                direction: "none",
                random: true,
                outModes: "bounce",
            },
            links: { enable: false },
        },
        detectRetina: true,
    });
}

// ── Scroll Animations (GSAP) ──────────────────────────────────

function initScrollAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Game cards
    gsap.utils.toArray('.game-card').forEach((card, i) => {
        gsap.from(card, {
            y: 40,
            opacity: 0,
            duration: 0.6,
            delay: i * 0.15,
            scrollTrigger: {
                trigger: card,
                start: "top 85%",
                toggleActions: "play none none none",
            }
        });
    });

    // Contribute cards
    gsap.utils.toArray('.contribute-card').forEach((card, i) => {
        gsap.from(card, {
            y: 30,
            opacity: 0,
            duration: 0.5,
            delay: i * 0.1,
            scrollTrigger: {
                trigger: card,
                start: "top 85%",
                toggleActions: "play none none none",
            }
        });
    });

    // Finding cards (puzzle pages)
    gsap.utils.toArray('.finding-card').forEach((card, i) => {
        gsap.from(card, {
            y: 20,
            opacity: 0,
            rotation: (Math.random() - 0.5) * 4,
            duration: 0.4,
            delay: i * 0.08,
            clearProps: "opacity",
            scrollTrigger: {
                trigger: card,
                start: "top 90%",
                toggleActions: "play none none none",
            }
        });
    });

    // Theory items
    gsap.utils.toArray('.theory-item').forEach((item, i) => {
        gsap.from(item, {
            x: -20,
            opacity: 0,
            duration: 0.5,
            delay: i * 0.1,
            clearProps: "opacity",
            scrollTrigger: {
                trigger: item,
                start: "top 85%",
                toggleActions: "play none none none",
            }
        });
    });
}

// ── Finding Card Rotations ────────────────────────────────────

function initCardRotations() {
    document.querySelectorAll('.finding-card').forEach(card => {
        const rotation = (Math.random() - 0.5) * 3; // -1.5 to +1.5 degrees
        card.style.setProperty('--rotation', `${rotation}deg`);
    });
}

// ── Findings Filter ───────────────────────────────────────────

function initFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.finding-card');
    const categories = document.querySelectorAll('.findings-category');
    const subcategories = document.querySelectorAll('.findings-subcategory');

    if (!buttons.length || !cards.length) return;

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            // Update active button
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;

            cards.forEach(card => {
                if (filter === 'all' || card.dataset.status === filter) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });

            // Hide subcategory containers with no visible cards
            subcategories.forEach(sub => {
                const visibleCards = sub.querySelectorAll('.finding-card:not([style*="display: none"])');
                sub.style.display = visibleCards.length ? '' : 'none';
            });

            // Hide category containers with no visible cards
            categories.forEach(cat => {
                const visibleCards = cat.querySelectorAll('.finding-card:not([style*="display: none"])');
                cat.style.display = visibleCards.length ? '' : 'none';
            });
        });
    });
}

// ── Search (Fuse.js — loaded on puzzle pages) ─────────────────

function initSearch() {
    const searchInput = document.getElementById('findings-search');
    if (!searchInput) return;

    const cards = document.querySelectorAll('.finding-card');
    const data = Array.from(cards).map(card => ({
        element: card,
        title: card.querySelector('h3')?.textContent || '',
        desc: card.querySelector('p')?.textContent || '',
    }));

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            cards.forEach(c => c.style.display = '');
            return;
        }
        data.forEach(item => {
            const match = item.title.toLowerCase().includes(query) ||
                          item.desc.toLowerCase().includes(query);
            item.element.style.display = match ? '' : 'none';
        });
    });
}

// ── Dynamic Puzzle Counters ───────────────────────────────────

function initCounters() {
    const statCases = document.getElementById('stat-cases');
    if (!statCases) return; // Only runs on the homepage

    const gameCards = document.querySelectorAll('.games-section .games-grid > a.game-card[href]');
    let totalOpen = 0;
    let pending = gameCards.length;

    if (!pending) return;

    gameCards.forEach(card => {
        const href = card.getAttribute('href');
        // Only fetch local game index pages (not external links)
        if (!href || href.startsWith('http')) {
            pending--;
            return;
        }

        fetch(href)
            .then(r => r.text())
            .then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const unsolved = doc.querySelectorAll('.games-grid .badge-unsolved').length;
                totalOpen += unsolved;

                // Update this game card's badge
                const badge = card.querySelector('.game-card-meta .badge-unsolved');
                if (badge && unsolved > 0) {
                    badge.textContent = unsolved + (unsolved === 1 ? ' Open Puzzle' : ' Open Puzzles');
                }
            })
            .catch(() => {})
            .finally(() => {
                pending--;
                if (pending <= 0) {
                    statCases.textContent = totalOpen;
                }
            });
    });
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initScrollAnimations();
    initCardRotations();
    initFilters();
    initSearch();
    initCounters();
});
