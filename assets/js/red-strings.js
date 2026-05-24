/**
 * Red Strings — Detective Board Theory↔Finding Links
 *
 * When a theory is clicked, red strings animate from the theory to each
 * finding it explains (via data-explains attribute). The strings have
 * slack/sag physics — they droop under gravity and wobble with a spring
 * damping effect after appearing.
 *
 * Click the same theory again (or click elsewhere) to dismiss.
 */
(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────
  const STRING_COLOR = "#c0392b";
  const STRING_WIDTH = 2.5;
  const PIN_RADIUS = 6;
  const EDGE_INSET = 8;
  const GRAVITY = 0.55;        // sag amount (0 = straight, 1 = very droopy)
  const SPRING_STIFFNESS = 0.10;
  const SPRING_DAMPING = 0.72;
  const SIMULATION_STEPS = 60;
  const STEP_INTERVAL = 16;    // ~60fps

  const MOUSE_RADIUS = 100;
  const MOUSE_FORCE = 7.0;

  let svgOverlay = null;
  let activeSource = null; // the clicked theory or finding element
  let activeType = null;   // "theory" or "finding"
  let animationFrame = null;
  let strings = [];
  let mouse = { x: -9999, y: -9999, active: false };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const theories = document.querySelectorAll(".theory-item[data-explains]");
    const findings = document.querySelectorAll(".finding-card[id]");
    if (!theories.length && !findings.length) return;

    // Create SVG overlay (fixed so it's always on top regardless of stacking contexts)
    svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgOverlay.setAttribute("class", "red-strings-overlay");
    svgOverlay.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:" + document.documentElement.scrollHeight + "px;" +
      "pointer-events:none;z-index:99999;overflow:visible;isolation:isolate;";
    document.body.appendChild(svgOverlay);

    // Add badge rows and click handlers to theories
    theories.forEach((theory) => {
      // Build badge row showing which findings this theory explains
      const findingIds = theory.dataset.explains.split(",").map((s) => s.trim());
      const badgeRow = document.createElement("div");
      badgeRow.className = "theory-explains-badges";

      findingIds.forEach((id) => {
        const finding = document.getElementById(id);
        if (!finding) return;
        const title = finding.querySelector("h3")?.textContent?.trim() || id;
        const status = finding.dataset.status || "";
        const badge = document.createElement("span");
        badge.className = "theory-explains-badge badge-status-" + status;
        badge.textContent = title;
        badge.dataset.target = id;
        badgeRow.appendChild(badge);
      });

      // Insert badge row after theory-desc
      const desc = theory.querySelector(".theory-desc");
      if (desc && badgeRow.children.length) {
        desc.parentNode.insertBefore(badgeRow, desc.nextSibling);
      }

      theory.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        toggleTheory(theory);
      });
    });

    // Click handlers for findings (inverse: finding → theories)
    findings.forEach((finding) => {
      // Skip CTA cards
      if (finding.classList.contains("finding-card-cta")) return;
      finding.style.cursor = "pointer";
      finding.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        toggleFinding(finding);
      });
    });

    // Click outside dismisses
    document.addEventListener("click", (e) => {
      if (!activeSource) return;
      if (!e.target.closest(".theory-item") && !e.target.closest(".finding-card")) {
        dismissStrings();
      }
    });

    // Recompute on resize
    window.addEventListener("resize", () => {
      if (!activeSource || !strings.length) return;
      svgOverlay.style.height = document.documentElement.scrollHeight + "px";
      strings.forEach((s) => updateStringEndpoints(s));
      renderStrings();
    });

    // Mouse tracking for string interaction
    document.addEventListener("mousemove", (e) => {
      mouse.x = e.pageX;
      mouse.y = e.pageY;
      mouse.active = true;
    });
    document.addEventListener("mouseleave", () => {
      mouse.active = false;
    });
  }

  function toggleTheory(theory) {
    if (activeSource === theory) {
      dismissStrings();
      return;
    }

    dismissStrings(true);

    activeSource = theory;
    activeType = "theory";
    theory.classList.add("theory-active");

    const findingIds = theory.dataset.explains.split(",").map((s) => s.trim());

    document.querySelectorAll(".finding-card").forEach((card) => {
      if (findingIds.includes(card.id)) {
        card.classList.add("finding-highlighted");
      } else {
        card.classList.add("finding-dimmed");
      }
    });

    document.querySelectorAll(".theory-item").forEach((item) => {
      if (item !== theory) {
        item.classList.add("theory-dimmed");
      }
    });

    // Defer string creation to next frame so co-registered handlers
    // (e.g. board layout changes) settle before measuring positions
    requestAnimationFrame(() => {
      if (activeSource !== theory) return;
      svgOverlay.style.height = document.documentElement.scrollHeight + "px";
      findingIds.forEach((id) => {
        const finding = document.getElementById(id);
        if (!finding) return;
        const s = createString(theory, finding);
        strings.push(s);
      });
      animateStrings();
    });
  }

  function toggleFinding(finding) {
    if (activeSource === finding) {
      dismissStrings();
      return;
    }

    dismissStrings(true);

    activeSource = finding;
    activeType = "finding";
    finding.classList.add("finding-highlighted");

    // Find all theories that reference this finding
    const findingId = finding.id;
    const matchingTheories = [];
    document.querySelectorAll(".theory-item[data-explains]").forEach((theory) => {
      const ids = theory.dataset.explains.split(",").map((s) => s.trim());
      if (ids.includes(findingId)) {
        matchingTheories.push(theory);
      }
    });

    // Dim non-related elements
    document.querySelectorAll(".finding-card").forEach((card) => {
      if (card !== finding) {
        card.classList.add("finding-dimmed");
      }
    });

    document.querySelectorAll(".theory-item").forEach((item) => {
      if (matchingTheories.includes(item)) {
        item.classList.add("theory-active");
      } else {
        item.classList.add("theory-dimmed");
      }
    });

    // Defer string creation to next frame so co-registered handlers
    // (e.g. board layout changes) settle before measuring positions
    requestAnimationFrame(() => {
      if (activeSource !== finding) return;
      svgOverlay.style.height = document.documentElement.scrollHeight + "px";
      matchingTheories.forEach((theory) => {
        const s = createString(finding, theory);
        strings.push(s);
      });
      animateStrings();
    });
  }

  function dismissStrings(instant) {
    if (activeSource) {
      activeSource.classList.remove("theory-active");
      activeSource.classList.remove("finding-highlighted");
    }
    activeSource = null;
    activeType = null;

    document.querySelectorAll(".finding-highlighted").forEach((el) => {
      el.classList.remove("finding-highlighted");
    });
    document.querySelectorAll(".finding-dimmed").forEach((el) => {
      el.classList.remove("finding-dimmed");
    });
    document.querySelectorAll(".theory-dimmed").forEach((el) => {
      el.classList.remove("theory-dimmed");
    });
    document.querySelectorAll(".theory-active").forEach((el) => {
      el.classList.remove("theory-active");
    });

    if (instant) {
      clearStrings();
    } else {
      svgOverlay.style.transition = "opacity 0.3s ease";
      svgOverlay.style.opacity = "0";
      setTimeout(() => {
        clearStrings();
        svgOverlay.style.transition = "";
        svgOverlay.style.opacity = "1";
      }, 300);
    }
  }

  function clearStrings() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    while (svgOverlay.firstChild) {
      svgOverlay.removeChild(svgOverlay.firstChild);
    }
    strings = [];
  }

  function createString(sourceEl, targetEl) {
    const { start, end } = getStringEndpoints(sourceEl, targetEl);

    // Create SVG group
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // The string path
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", STRING_COLOR);
    path.setAttribute("stroke-width", STRING_WIDTH);
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("opacity", "0.85");
    group.appendChild(path);

    // Pin at start (theory end)
    const pinStart = createPin(start.x, start.y);
    group.appendChild(pinStart);

    // Pin at end (finding end)
    const pinEnd = createPin(end.x, end.y);
    group.appendChild(pinEnd);

    svgOverlay.appendChild(group);

    // Physics state: control points for the catenary curve
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    const sag = dist * GRAVITY;

    return {
      sourceEl,
      targetEl,
      group,
      path,
      pinStart,
      pinEnd,
      start: { ...start },
      end: { ...end },
      // Physics: the midpoint "weight" that sags
      control: { x: midX, y: midY + sag },
      controlTarget: { x: midX, y: midY + sag },
      controlVelocity: { x: 0, y: 0 },
      // Mouse interaction displacement
      mouseDisplacement: { x: 0, y: 0 },
      mouseVelocity: { x: 0, y: 0 },
      // Start from a straight line (animated to sag)
      controlCurrent: { x: midX, y: midY - sag * 0.5 },
      step: 0,
    };
  }

  function createPin(x, y) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", PIN_RADIUS);
    circle.setAttribute("fill", STRING_COLOR);
    circle.setAttribute("opacity", "0.9");

    // Pin shine
    const shine = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    shine.setAttribute("cx", x - 1.5);
    shine.setAttribute("cy", y - 1.5);
    shine.setAttribute("r", 2);
    shine.setAttribute("fill", "rgba(255,255,255,0.4)");

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.appendChild(circle);
    g.appendChild(shine);
    return g;
  }

  function getStringEndpoints(sourceEl, targetEl) {
    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const sourceCenterX = sourceRect.left + sourceRect.width * 0.5;
    const sourceCenterY = sourceRect.top + sourceRect.height * 0.5;
    const targetCenterX = targetRect.left + targetRect.width * 0.5;
    const targetCenterY = targetRect.top + targetRect.height * 0.5;
    const deltaX = targetCenterX - sourceCenterX;
    const deltaY = targetCenterY - sourceCenterY;
    const useVerticalAnchors = Math.abs(deltaY) >= Math.abs(deltaX);

    let startSide;
    let endSide;
    if (useVerticalAnchors) {
      startSide = deltaY >= 0 ? "bottom" : "top";
      endSide = deltaY >= 0 ? "top" : "bottom";
    } else {
      startSide = deltaX >= 0 ? "right" : "left";
      endSide = deltaX >= 0 ? "left" : "right";
    }

    return {
      start: getAnchorPoint(sourceRect, startSide, scrollX, scrollY),
      end: getAnchorPoint(targetRect, endSide, scrollX, scrollY),
    };
  }

  function getAnchorPoint(rect, side, scrollX, scrollY) {
    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.5;
    const inset = Math.min(EDGE_INSET, rect.height * 0.15, rect.width * 0.15);

    switch (side) {
      case "top":
        return { x: centerX + scrollX, y: rect.top + scrollY + inset };
      case "bottom":
        return { x: centerX + scrollX, y: rect.bottom + scrollY - inset };
      case "left":
        return { x: rect.left + scrollX + inset, y: centerY + scrollY };
      case "right":
        return { x: rect.right + scrollX - inset, y: centerY + scrollY };
      default:
        return { x: centerX + scrollX, y: centerY + scrollY };
    }
  }

  function updateStringEndpoints(s) {
    const { start, end } = getStringEndpoints(s.sourceEl, s.targetEl);

    s.start.x = start.x;
    s.start.y = start.y;
    s.end.x = end.x;
    s.end.y = end.y;

    const midX = (s.start.x + s.end.x) / 2;
    const midY = (s.start.y + s.end.y) / 2;
    const dist = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
    const sag = dist * GRAVITY;

    s.controlTarget.x = midX;
    s.controlTarget.y = midY + sag;
    s.controlCurrent.x = midX;
    s.controlCurrent.y = midY + sag;

    // Update pin positions
    updatePin(s.pinStart, s.start.x, s.start.y);
    updatePin(s.pinEnd, s.end.x, s.end.y);
  }

  function updatePin(pinGroup, x, y) {
    const circle = pinGroup.children[0];
    const shine = pinGroup.children[1];
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    shine.setAttribute("cx", x - 1.5);
    shine.setAttribute("cy", y - 1.5);
  }

  function animateStrings() {
    function tick() {
      if (!strings.length) return;

      strings.forEach((s) => {
        // Spring physics for the control point (initial settle)
        const dx = s.controlTarget.x - s.controlCurrent.x;
        const dy = s.controlTarget.y - s.controlCurrent.y;

        s.controlVelocity.x += dx * SPRING_STIFFNESS;
        s.controlVelocity.y += dy * SPRING_STIFFNESS;
        s.controlVelocity.x *= SPRING_DAMPING;
        s.controlVelocity.y *= SPRING_DAMPING;

        s.controlCurrent.x += s.controlVelocity.x;
        s.controlCurrent.y += s.controlVelocity.y;

        // Mouse collision: check multiple sample points along the bezier curve
        if (mouse.active) {
          const sx = s.start.x, sy = s.start.y;
          const cx = s.controlCurrent.x + s.mouseDisplacement.x;
          const cy = s.controlCurrent.y + s.mouseDisplacement.y;
          const ex = s.end.x, ey = s.end.y;

          // Sample 10 points along the quadratic bezier and find closest
          let minDist = Infinity;
          for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const it = 1 - t;
            const px = it * it * sx + 2 * it * t * cx + t * t * ex;
            const py = it * it * sy + 2 * it * t * cy + t * t * ey;
            const d = Math.hypot(px - mouse.x, py - mouse.y);
            if (d < minDist) minDist = d;
          }

          if (minDist < MOUSE_RADIUS) {
            // Push the control point away from mouse
            const mdx = cx - mouse.x;
            const mdy = cy - mouse.y;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
            const force = (MOUSE_RADIUS - minDist) / MOUSE_RADIUS;
            const nx = mdx / mDist;
            const ny = mdy / mDist;
            s.mouseVelocity.x += nx * force * MOUSE_FORCE;
            s.mouseVelocity.y += ny * force * MOUSE_FORCE;
          }
        }

        // Mouse displacement spring return
        s.mouseVelocity.x += -s.mouseDisplacement.x * 0.04;
        s.mouseVelocity.y += -s.mouseDisplacement.y * 0.04;
        s.mouseVelocity.x *= 0.88;
        s.mouseVelocity.y *= 0.88;
        s.mouseDisplacement.x += s.mouseVelocity.x;
        s.mouseDisplacement.y += s.mouseVelocity.y;
      });

      renderStrings();
      animationFrame = requestAnimationFrame(tick);
    }

    animationFrame = requestAnimationFrame(tick);
  }

  function renderStrings() {
    strings.forEach((s) => {
      // Quadratic bezier with mouse displacement applied to control point
      const cx = s.controlCurrent.x + s.mouseDisplacement.x;
      const cy = s.controlCurrent.y + s.mouseDisplacement.y;
      const d =
        `M ${s.start.x} ${s.start.y} ` +
        `Q ${cx} ${cy} ` +
        `${s.end.x} ${s.end.y}`;
      s.path.setAttribute("d", d);
    });
  }
})();
