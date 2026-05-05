/**
 * Hero Red String — 2-pin underline string beneath the title.
 * Mouse bumps the string. Pull hard enough and it snaps in the middle,
 * leaving two dangling halves.
 */
(function () {
  "use strict";

  const canvas = document.createElement("canvas");
  canvas.id = "hero-string-canvas";
  canvas.style.cssText =
    "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;";

  const ctx = canvas.getContext("2d");

  // ── Config ──────────────────────────────────────────────────
  const SEGMENT_COUNT = 40;
  const GRAVITY = 0.08;
  const DAMPING = 0.985;
  const CONSTRAINT_ITERATIONS = 12;
  const MOUSE_RADIUS = 50;
  const MOUSE_FORCE = 2.5;
  const STRING_WIDTH = 4.5;
  const PIN_RADIUS = 7;
  const SNAP_THRESHOLD = 9; // max stretch ratio before break

  // Colors
  const STRING_COLOR_CORE = "#c0392b";
  const STRING_COLOR_HIGHLIGHT = "#e74c3c";
  const STRING_COLOR_SHADOW = "#8b1a1a";

  let points = [];
  let mouse = { x: -9999, y: -9999, px: -9999, py: -9999, active: false };
  let heroEl = null;
  let raf = null;
  let dpr = 1;

  // Break state
  let broken = false;
  let breakIndex = -1;
  let pinLeft = null;   // {x, y}
  let pinRight = null;  // {x, y}

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    heroEl = document.querySelector(".hero");
    if (!heroEl) return;

    heroEl.style.position = "relative";
    heroEl.appendChild(canvas);

    resize();
    createRope();

    heroEl.addEventListener("mousemove", onMouseMove);
    heroEl.addEventListener("mouseleave", onMouseLeave);
    heroEl.addEventListener("touchmove", onTouchMove, { passive: true });
    heroEl.addEventListener("touchend", onMouseLeave);

    window.addEventListener("resize", () => {
      resize();
      createRope();
    });

    loop();
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const rect = heroEl.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createRope() {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const heroRect = heroEl.getBoundingClientRect();

    // Position pins relative to the stats row
    const stats = heroEl.querySelectorAll(".stat");
    let leftX, rightX, pinY;

    if (stats.length >= 4) {
      const firstStat = stats[0].getBoundingClientRect();
      const lastStatEl = stats[stats.length - 1];
      const lastStat = lastStatEl.getBoundingClientRect();
      const lastNumber = lastStatEl.querySelector(".stat-number");
      const lastNumRect = lastNumber ? lastNumber.getBoundingClientRect() : lastStat;
      // Left pin: below "2 Games"
      leftX = firstStat.left + firstStat.width / 2 - heroRect.left;
      // Right pin: slightly to the right of the "1" number in Solved
      rightX = lastNumRect.right + 28 - heroRect.left;
      // Left Y: just below the stats row
      const leftPinY = lastStat.bottom - heroRect.top + 12;
      // Right Y: vertically centered with the stat number
      const rightPinY = lastNumRect.top + lastNumRect.height / 2 - heroRect.top;
      pinLeft = { x: leftX, y: leftPinY };
      pinRight = { x: rightX, y: rightPinY };
    } else {
      // Fallback
      pinLeft = { x: w * 0.20, y: h * 0.85 };
      pinRight = { x: w * 0.80, y: h * 0.85 };
    }

    points = [];
    broken = false;
    breakIndex = -1;

    const dist = pinRight.x - pinLeft.x;
    const restTotal = dist * 1.02; // slight slack

    for (let i = 0; i <= SEGMENT_COUNT; i++) {
      const t = i / SEGMENT_COUNT;
      const x = pinLeft.x + (pinRight.x - pinLeft.x) * t;
      const y = pinLeft.y + (pinRight.y - pinLeft.y) * t;
      // Small random offset for organic feel
      const rx = (Math.random() - 0.5) * 2;
      const ry = (Math.random() - 0.5) * 1.5 + Math.sin(t * Math.PI) * 3;

      points.push({
        x: x + rx,
        y: y + ry,
        px: x + rx,
        py: y + ry,
        pinned: i === 0 || i === SEGMENT_COUNT,
      });
    }

    // Pin positions
    points[0].x = pinLeft.x;
    points[0].y = pinLeft.y;
    points[0].px = pinLeft.x;
    points[0].py = pinLeft.y;
    points[SEGMENT_COUNT].x = pinRight.x;
    points[SEGMENT_COUNT].y = pinRight.y;
    points[SEGMENT_COUNT].px = pinRight.x;
    points[SEGMENT_COUNT].py = pinRight.y;

    // Rest length per segment
    points.restLength = restTotal / SEGMENT_COUNT;
  }

  function onMouseMove(e) {
    const rect = heroEl.getBoundingClientRect();
    mouse.px = mouse.x;
    mouse.py = mouse.y;
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  }

  function onTouchMove(e) {
    if (e.touches.length === 0) return;
    const rect = heroEl.getBoundingClientRect();
    mouse.px = mouse.x;
    mouse.py = mouse.y;
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
    mouse.active = true;
  }

  function onMouseLeave() {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  }

  function simulate() {
    const h = canvas.height / dpr;

    // Verlet integration
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.pinned) continue;

      const vx = (p.x - p.px) * DAMPING;
      const vy = (p.y - p.py) * DAMPING;

      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + GRAVITY;

      // Floor constraint (don't fall off canvas)
      if (p.y > h - 5) {
        p.y = h - 5;
      }
    }

    // Mouse collision
    if (mouse.active) {
      const mvx = mouse.x - mouse.px;
      const mvy = mouse.y - mouse.py;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.pinned) continue;

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          const nx = dx / dist;
          const ny = dy / dist;

          p.x += nx * force * MOUSE_FORCE + mvx * 0.4 * force;
          p.y += ny * force * MOUSE_FORCE + mvy * 0.4 * force;
        }
      }
    }

    // Distance constraints
    const restLen = points.restLength;
    for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
      for (let i = 0; i < points.length - 1; i++) {
        // Skip broken link
        if (broken && i === breakIndex) continue;

        const a = points[i];
        const b = points[i + 1];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) continue;

        const diff = (dist - restLen) / dist;
        const offsetX = dx * diff * 0.5;
        const offsetY = dy * diff * 0.5;

        if (!a.pinned) { a.x += offsetX; a.y += offsetY; }
        if (!b.pinned) { b.x -= offsetX; b.y -= offsetY; }
      }
    }

    // Check for snap (only if not already broken)
    if (!broken) {
      let maxStretch = 0;
      let maxIdx = -1;

      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const stretch = dist / restLen;

        if (stretch > maxStretch) {
          maxStretch = stretch;
          maxIdx = i;
        }
      }

      if (maxStretch > SNAP_THRESHOLD) {
        broken = true;
        breakIndex = maxIdx;
      }
    }
  }

  function render() {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);

    if (points.length < 2) return;

    if (!broken) {
      // Draw single continuous string
      drawStringSegment(0, points.length - 1);
    } else {
      // Draw two halves
      if (breakIndex > 0) {
        drawStringSegment(0, breakIndex);
      }
      if (breakIndex < points.length - 2) {
        drawStringSegment(breakIndex + 1, points.length - 1);
      }
    }

    // Draw pins
    drawPin(pinLeft.x, pinLeft.y);
    drawPin(pinRight.x, pinRight.y);
  }

  function drawStringSegment(startIdx, endIdx) {
    if (endIdx - startIdx < 1) return;

    // Shadow
    ctx.save();
    ctx.strokeStyle = STRING_COLOR_SHADOW;
    ctx.lineWidth = STRING_WIDTH + 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.3;
    drawSmoothPathRange(startIdx, endIdx, 1, 1.5);
    ctx.stroke();
    ctx.restore();

    // Core
    ctx.save();
    ctx.strokeStyle = STRING_COLOR_CORE;
    ctx.lineWidth = STRING_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawSmoothPathRange(startIdx, endIdx, 0, 0);
    ctx.stroke();
    ctx.restore();

    // Fibres
    ctx.save();
    ctx.globalAlpha = 0.25;
    for (let fibre = 0; fibre < 3; fibre++) {
      ctx.strokeStyle = fibre % 2 === 0 ? STRING_COLOR_SHADOW : STRING_COLOR_HIGHLIGHT;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      const offsetAmt = 1.0 + fibre * 0.2;
      for (let i = startIdx; i <= endIdx; i++) {
        const noise = Math.sin(i * 2.3 + fibre * 2.1) * offsetAmt;
        let nx = 0, ny = 0;
        if (i < endIdx) {
          const dx = points[i + 1].x - points[i].x;
          const dy = points[i + 1].y - points[i].y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          nx = -dy / len; ny = dx / len;
        } else if (i > startIdx) {
          const dx = points[i].x - points[i - 1].x;
          const dy = points[i].y - points[i - 1].y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          nx = -dy / len; ny = dx / len;
        }
        const fx = points[i].x + nx * noise;
        const fy = points[i].y + ny * noise;
        if (i === startIdx) ctx.moveTo(fx, fy);
        else ctx.lineTo(fx, fy);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Highlight
    ctx.save();
    ctx.strokeStyle = STRING_COLOR_HIGHLIGHT;
    ctx.lineWidth = 1.0;
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.4;
    drawSmoothPathRange(startIdx, endIdx, -0.3, -0.8);
    ctx.stroke();
    ctx.restore();

    // Cross-hatch marks
    ctx.save();
    ctx.strokeStyle = STRING_COLOR_SHADOW;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.2;
    for (let i = startIdx + 1; i < endIdx; i += 2) {
      const p = points[i];
      const next = points[Math.min(i + 1, endIdx)];
      const dx = next.x - p.x;
      const dy = next.y - p.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const size = STRING_WIDTH * 0.5;
      ctx.beginPath();
      ctx.moveTo(p.x - nx * size, p.y - ny * size);
      ctx.lineTo(p.x + nx * size, p.y + ny * size);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSmoothPathRange(startIdx, endIdx, ox, oy) {
    ctx.beginPath();
    ctx.moveTo(points[startIdx].x + ox, points[startIdx].y + oy);
    for (let i = startIdx + 1; i < endIdx; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2 + ox;
      const midY = (points[i].y + points[i + 1].y) / 2 + oy;
      ctx.quadraticCurveTo(points[i].x + ox, points[i].y + oy, midX, midY);
    }
    ctx.lineTo(points[endIdx].x + ox, points[endIdx].y + oy);
  }

  function drawPin(x, y) {
    ctx.save();
    // Shadow
    ctx.beginPath();
    ctx.arc(x + 1, y + 1, PIN_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fill();
    // Body
    const grad = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, PIN_RADIUS);
    grad.addColorStop(0, "#e74c3c");
    grad.addColorStop(0.6, "#c0392b");
    grad.addColorStop(1, "#8b1a1a");
    ctx.beginPath();
    ctx.arc(x, y, PIN_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    // Highlight
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, PIN_RADIUS * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fill();
    ctx.restore();
  }

  function loop() {
    simulate();
    render();
    raf = requestAnimationFrame(loop);
  }
})();
