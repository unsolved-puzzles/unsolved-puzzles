(function () {
  "use strict";

  const LOOKUP_URL = "../assets/data/room-coordinate-lookup.v1.json";
  const FIXED_PLACEMENTS = new Map([
    ["C1", "Entrance Hall"],
    ["C9", "Antechamber"],
  ]);
  const BEDROOM_FAMILY = [
    "Bedroom",
    "Bunk Room",
    "Guest Bedroom",
    "Nursery",
    "Servant's Quarters",
    "Boudoir",
  ];
  const BLUEPRINT_FAMILY = [
    "The Foundation", "Spare Room", "Rotunda", "Parlor", "Billiard Room",
    "Gallery", "Closet", "Walk-In Closet", "Attic", "Storeroom",
    "Nook", "Garage", "Music Room", "Locker Room", "Den", "Wine Cellar",
    "Trophy Room", "Ballroom", "Pantry", "Rumpus Room", "Vault", "Office",
    "Drawing Room", "Study", "Library", "Chamber of Mirrors", "The Pool", "Drafting Studio",
    "Utility Closet", "Boiler Room", "Pump Room", "Security", "Workshop", "Laboratory",
    "Sauna", "Coat Check", "Mail Room", "Freezer", "Dining Room", "Observatory",
    "Conference Room", "Aquarium",
  ];

  const IDEAS = [
    {
      id: "idea-bedroom-corners",
      title: "Bedroom-family rooms on all four corners",
      source: "pedroff1",
      description:
        "Treat the corner clue as a bedroom-family requirement: any four distinct corner-legal rooms from Bedroom, Bunk Room, Guest Bedroom, Nursery, Servant's Quarters, and Boudoir.",
      targets: [
        { coord: "A1", allowedRooms: BEDROOM_FAMILY, label: "bedroom-family" },
        { coord: "A9", allowedRooms: BEDROOM_FAMILY, label: "bedroom-family" },
        { coord: "E1", allowedRooms: BEDROOM_FAMILY, label: "bedroom-family" },
        { coord: "E9", allowedRooms: BEDROOM_FAMILY, label: "bedroom-family" },
      ],
    },
    {
      id: "idea-blue-route-cells",
      title: "Pin the SWANSONG route rooms to their Atelier cells",
      source: "daymeeuhn",
      description:
        "Map the hidden blue path directly onto the manor: Pantry D1, Gallery C2, Library D2, Observatory D3, Music Room D4, Ballroom D5, Spare Room E5, Furnace E8.",
      targets: [
        { coord: "D1", room: "Pantry" },
        { coord: "C2", room: "Gallery" },
        { coord: "D2", room: "Library" },
        { coord: "D3", room: "Observatory" },
        { coord: "D4", room: "Music Room" },
        { coord: "D5", room: "Ballroom" },
        { coord: "E5", room: "Spare Room" },
        { coord: "E8", room: "Furnace" },
      ],
    },
    {
      id: "idea-extra-blue-cells",
      title: "Use the four unused blue-box rooms as anchors",
      source: "unknown",
      description:
        "Test the four blue-box rooms that do not appear on the hidden route in their translated Atelier cells: Coat Check D9, Corridor C4, Hallway B3, East Wing Hall E3.",
      targets: [
        { coord: "D9", room: "Coat Check" },
        { coord: "C4", room: "Corridor" },
        { coord: "B3", room: "Hallway" },
        { coord: "E3", room: "East Wing Hall" },
      ],
    },
    {
      id: "idea-all-blue-cells",
      title: "Keep all 12 blue-solution rooms in their translated cells",
      source: "daymeeuhn",
      description:
        "Combine the hidden SWANSONG route with the four extra blue-box rooms and test the full 12-room blue set against the manor coordinate transform.",
      targets: [
        { coord: "D1", room: "Pantry" },
        { coord: "C2", room: "Gallery" },
        { coord: "D2", room: "Library" },
        { coord: "D3", room: "Observatory" },
        { coord: "D4", room: "Music Room" },
        { coord: "D5", room: "Ballroom" },
        { coord: "E5", room: "Spare Room" },
        { coord: "E8", room: "Furnace" },
        { coord: "D9", room: "Coat Check" },
        { coord: "C4", room: "Corridor" },
        { coord: "B3", room: "Hallway" },
        { coord: "E3", room: "East Wing Hall" },
      ],
    },
    {
      id: "idea-all-blue-manor",
      title: "Fill the whole manor with Blueprint rooms",
      source: "u/ModZen-R",
      description:
        "Draft all 43 fillable cells with rooms from the Blueprint (blue) family only. There are only 42 draftable Blueprints in the Room Directory, so this is provably impossible under the no-duplicate rule.",
      targets: [
        "A1","A2","A3","A4","A5","A6","A7","A8","A9",
        "B1","B2","B3","B4","B5","B6","B7","B8","B9",
        "C2","C3","C4","C5","C6","C7","C8",
        "D1","D2","D3","D4","D5","D6","D7","D8","D9",
        "E1","E2","E3","E4","E5","E6","E7","E8","E9",
      ].map(coord => ({ coord, allowedRooms: BLUEPRINT_FAMILY, label: "blueprint" })),
    },
    {
      id: "idea-exact-atelier-copy",
      title: "Copy the full Atelier room-for-room",
      source: "valentindckrs",
      description:
        "A literal one-to-one Atelier copy fails immediately under the draft rules. The translated Atelier puts Vestibule on C9, which conflicts with the fixed Antechamber before the edge-room legality issues even start.",
      targets: [
        { coord: "A9", room: "Archives" },
        { coord: "B9", room: "Chapel" },
        { coord: "C9", room: "Vestibule" },
        { coord: "D9", room: "Coat Check" },
        { coord: "E9", room: "Aquarium" },
        { coord: "A8", room: "Foyer" },
        { coord: "B8", room: "Pool" },
        { coord: "C8", room: "Servant's Quarters" },
        { coord: "D8", room: "Pump Room" },
        { coord: "E8", room: "Furnace" },
        { coord: "A7", room: "Gymnasium" },
        { coord: "B7", room: "Laundry Room" },
        { coord: "C7", room: "Guest Bedroom" },
        { coord: "D7", room: "Conference Room" },
        { coord: "E7", room: "Den" },
        { coord: "A6", room: "West Wing Hall" },
        { coord: "B6", room: "Passageway" },
        { coord: "C6", room: "Darkroom" },
        { coord: "D6", room: "Closet" },
        { coord: "E6", room: "Parlor" },
        { coord: "A5", room: "Billiard Room" },
        { coord: "B5", room: "Trophy Room" },
        { coord: "C5", room: "The Foundation" },
        { coord: "D5", room: "Ballroom" },
        { coord: "E5", room: "Spare Room" },
        { coord: "A4", room: "Nook" },
        { coord: "B4", room: "Kitchen" },
        { coord: "C4", room: "Corridor" },
        { coord: "D4", room: "Music Room" },
        { coord: "E4", room: "Lavatory" },
        { coord: "A3", room: "Solarium" },
        { coord: "B3", room: "Hallway" },
        { coord: "C3", room: "Dining Room" },
        { coord: "D3", room: "Observatory" },
        { coord: "E3", room: "East Wing Hall" },
        { coord: "A2", room: "Bedroom" },
        { coord: "B2", room: "Drawing Room" },
        { coord: "C2", room: "Gallery" },
        { coord: "D2", room: "Library" },
        { coord: "E2", room: "Cloister" },
        { coord: "A1", room: "Conservatory" },
        { coord: "B1", room: "Maid's Chamber" },
        { coord: "C1", room: "Entrance Hall" },
        { coord: "D1", room: "Pantry" },
        { coord: "E1", room: "Storeroom" },
      ],
    },
    {
      id: "idea-bookshop-3x3",
      title: "Drafting a 3×3 room square may trigger something",
      source: "u/j-internet",
      description:
        "The 3×3 grid position is set by choosing which manor cell the Black book maps to. The remaining 8 colours fill in around it.",
      countable: false,
      pattern: {
        // Offsets relative to the Black anchor: [colOffset, rankOffset]
        // Grid layout (top = high rank, bottom = low rank):
        //   Green  Violet Blue     (rank+1)
        //   Grey   Violet Black    (rank+0, anchor row)
        //   Orange Violet Blue     (rank-1)
        cells: [
          { dc: -2, dr: +1, label: "green" },
          { dc: -1, dr: +1, label: "violet" },
          { dc:  0, dr: +1, label: "blue" },
          { dc: -2, dr:  0, label: "grey" },
          { dc: -1, dr:  0, label: "violet" },
          { dc:  0, dr:  0, label: "black" },
          { dc: -2, dr: -1, label: "orange" },
          { dc: -1, dr: -1, label: "violet" },
          { dc:  0, dr: -1, label: "blue" },
        ],
        anchorLabel: "black",
      },
    },
    {
      id: "finding-entrance-hall-doorways-have-distinct-frames",
      title: "Entrance Hall doorways have distinct frames",
      source: "dummyn00b",
      description:
        "Each of the three Entrance Hall doorways has a different frame design. The purpose for this difference, if any, is unknown. No specific room placements are implied by this finding.",
      targets: [],
    },
  ];

  const state = {
    lookup: null,
    placements: new Map(FIXED_PLACEMENTS),
    selectedCoord: "C2",
    activeIdeaId: "idea-bookshop-3x3",
    patternAnchor: "D5",
  };

  const dom = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    document.body.classList.remove("votes-loading");
    cacheDom();
    buildBoard();
    bindControls();
    renderIdeaSelection();
    renderBoard();
    showLoadingState();

    try {
      await loadLookup();
      computeIdeaMetrics();
      applyIdea(state.activeIdeaId);
      renderBoard();
      updateInspector();
      hideLoadingState();
    } catch (error) {
      showLookupError(error);
      updateInspector();
    }
  }

  function cacheDom() {
    dom.board = document.getElementById("manor-board");
    dom.lookupError = document.getElementById("lookup-error");
    dom.selectedCoord = document.getElementById("selected-coord");
    dom.selectedHint = document.getElementById("selected-hint");
    dom.roomSelect = document.getElementById("room-select");
    dom.clearSelected = document.getElementById("clear-selected");
    dom.clearLayout = document.getElementById("clear-layout");
    dom.legalRoomCount = document.getElementById("legal-room-count");
    dom.activeIdeaTitle = document.getElementById("active-idea-title");
    dom.activeIdeaDesc = document.getElementById("active-idea-desc");
    dom.activeIdeaCount = document.getElementById("active-idea-count");
    dom.activeIdeaProgress = document.getElementById("active-idea-progress");
    dom.activeIdeaSource = document.getElementById("active-idea-source");
    dom.activeIdeaPill = document.getElementById("active-idea-pill");
    dom.anchorPickerRow = document.getElementById("anchor-picker-row");
    dom.anchorSelect = document.getElementById("anchor-select");
  }

  function buildBoard() {
    const cols = ["A", "B", "C", "D", "E"];
    dom.board.innerHTML = "";

    dom.board.appendChild(makeGridLabel(""));
    cols.forEach((col) => dom.board.appendChild(makeGridLabel(col)));

    for (let rank = 9; rank >= 1; rank -= 1) {
      dom.board.appendChild(makeGridLabel(String(rank)));
      cols.forEach((col) => {
        const coord = `${col}${rank}`;
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "manor-cell";
        cell.dataset.coord = coord;
        cell.innerHTML = [
          `<span class=\"manor-coord\">${coord}</span>`,
          '<span class="manor-room-name">Empty</span>',
          '<span class="manor-room-note">Open slot</span>',
          '<span class="manor-target"></span>',
        ].join("");
        dom.board.appendChild(cell);
      });
    }
  }

  function makeGridLabel(text) {
    const label = document.createElement("div");
    label.className = "manor-grid-label";
    label.textContent = text;
    return label;
  }

  function bindControls() {
    dom.board.addEventListener("click", (event) => {
      const cell = event.target.closest(".manor-cell");
      if (!cell) {
        return;
      }
      if (cell.classList.contains("pattern-locked")) {
        return;
      }
      state.selectedCoord = cell.dataset.coord;
      renderBoard();
      updateInspector();
      updateActiveIdeaSummary();
    });

    dom.roomSelect.addEventListener("change", () => {
      if (!state.lookup) {
        return;
      }
      const coord = state.selectedCoord;
      if (FIXED_PLACEMENTS.has(coord)) {
        return;
      }
      const value = dom.roomSelect.value;
      if (value) {
        state.placements.set(coord, value);
      } else {
        state.placements.delete(coord);
      }
      renderBoard();
      updateInspector();
      updateActiveIdeaSummary();
    });

    dom.clearSelected.addEventListener("click", () => {
      if (FIXED_PLACEMENTS.has(state.selectedCoord)) {
        return;
      }
      state.placements.delete(state.selectedCoord);
      renderBoard();
      updateInspector();
      updateActiveIdeaSummary();
    });

    dom.clearLayout.addEventListener("click", () => {
      state.placements = new Map(FIXED_PLACEMENTS);
      renderBoard();
      updateInspector();
      updateActiveIdeaSummary();
    });

    document.querySelectorAll(".finding-card[data-idea-id]").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
          return;
        }
        applyIdea(card.dataset.ideaId);
      });
    });

    // Anchor picker for pattern-based ideas (e.g. Bookshop 3×3)
    buildAnchorOptions();
    dom.anchorSelect.addEventListener("change", () => {
      state.patternAnchor = dom.anchorSelect.value;
      renderBoard();
      updateActiveIdeaSummary();
    });
  }

  function buildAnchorOptions() {
    const cols = ["C", "D", "E"];
    const excluded = new Set(["D8", "E8", "D2", "E2"]);
    dom.anchorSelect.innerHTML = "";
    for (let rank = 8; rank >= 2; rank -= 1) {
      cols.forEach((col) => {
        const coord = `${col}${rank}`;
        if (excluded.has(coord)) return;
        const opt = document.createElement("option");
        opt.value = coord;
        opt.textContent = coord;
        if (coord === state.patternAnchor) opt.selected = true;
        dom.anchorSelect.appendChild(opt);
      });
    }
  }

  async function loadLookup() {
    const response = await fetch(LOOKUP_URL);
    if (!response.ok) {
      throw new Error(`lookup fetch failed: ${response.status}`);
    }
    state.lookup = await response.json();
  }

  function computeIdeaMetrics() {
    IDEAS.forEach((idea) => {
      idea.count = countIdeaLayouts(idea);
      document.querySelectorAll(`[data-count-for="${idea.id}"]`).forEach((el) => {
        el.textContent = formatBigInt(idea.count);
      });
    });
  }

  function countIdeaLayouts(idea) {
    if (idea.countable === false) {
      return null;
    }
    if (!state.lookup) {
      return 0n;
    }

    const descriptors = getIdeaTargets(idea)
      .map((target) => {
        const candidates = getTargetCandidates(target);
        return {
          coord: target.coord,
          candidates,
        };
      })
      .sort((left, right) => left.candidates.length - right.candidates.length);

    if (descriptors.some((descriptor) => descriptor.candidates.length === 0)) {
      return 0n;
    }

    // Pigeonhole: if fewer distinct rooms exist than cells, count is 0
    const allDistinct = new Set();
    descriptors.forEach((d) => d.candidates.forEach((r) => allDistinct.add(r)));
    if (allDistinct.size < descriptors.length) {
      return 0n;
    }

    const usedRooms = new Set();

    function visit(index) {
      if (index === descriptors.length) {
        return 1n;
      }

      let total = 0n;
      descriptors[index].candidates.forEach((room) => {
        if (usedRooms.has(room)) {
          return;
        }
        usedRooms.add(room);
        total += visit(index + 1);
        usedRooms.delete(room);
      });
      return total;
    }

    return visit(0);
  }

  function getTargetCandidates(target) {
    if (!state.lookup) {
      return [];
    }

    const candidates = target.room ? [target.room] : target.allowedRooms || [];
    return [...new Set(candidates)].filter((room) => roomIsLegalAtCoord(room, target.coord));
  }

  function roomIsLegalAtCoord(room, coord) {
    if (!state.lookup) {
      return false;
    }
    const allowed = state.lookup.room_to_coordinates[room] || [];
    return allowed.includes(coord);
  }

  function renderIdeaSelection() {
    document.querySelectorAll(".finding-card[data-idea-id]").forEach((card) => {
      card.classList.toggle("idea-selected", card.dataset.ideaId === state.activeIdeaId);
    });
  }

  function applyIdea(ideaId) {
    state.activeIdeaId = ideaId;
    renderIdeaSelection();
    updateActiveIdeaSummary();
    renderBoard();
    updateInspector();
  }

  function updateActiveIdeaSummary() {
    const idea = getActiveIdea();
    if (!idea) {
      return;
    }

    // Show/hide the anchor picker for pattern-based ideas
    const hasPattern = Boolean(idea.pattern);
    dom.anchorPickerRow.hidden = !hasPattern;

    const targets = getIdeaTargets(idea);
    const matches = countIdeaMatches(idea);
    dom.activeIdeaTitle.textContent = idea.title;
    dom.activeIdeaDesc.textContent = buildIdeaDescription(idea);
    if (dom.activeIdeaCount) dom.activeIdeaCount.textContent = state.lookup ? formatBigInt(idea.count) : "...";
    dom.activeIdeaProgress.textContent = targets.length ? `${matches} / ${targets.length}` : "Observation only";
    dom.activeIdeaSource.innerHTML = idea.source;
    dom.activeIdeaPill.textContent = idea.title;
  }

  function countIdeaMatches(idea) {
    return getIdeaTargets(idea).reduce((total, target) => {
      const placedRoom = state.placements.get(target.coord);
      return total + (placedRoom && targetMatches(target, placedRoom) ? 1 : 0);
    }, 0);
  }

  function targetMatches(target, room) {
    if (target.matchMode === "filled") {
      return Boolean(room) && !FIXED_PLACEMENTS.has(target.coord);
    }
    if (target.room) {
      return target.room === room;
    }
    return (target.allowedRooms || []).includes(room);
  }

  const PATTERN_COLORS = ["green", "violet", "blue", "grey", "orange", "black"];

  function renderBoard() {
    const activeIdea = getActiveIdea();
    const isPattern = Boolean(activeIdea && activeIdea.pattern);

    document.querySelectorAll(".manor-cell").forEach((cell) => {
      const coord = cell.dataset.coord;
      const placedRoom = state.placements.get(coord);
      const target = getTargetByCoord(coord);
      const noteEl = cell.querySelector(".manor-room-note");
      const roomEl = cell.querySelector(".manor-room-name");
      const targetEl = cell.querySelector(".manor-target");

      cell.classList.toggle("fixed", FIXED_PLACEMENTS.has(coord));
      cell.classList.toggle("selected", coord === state.selectedCoord);
      cell.classList.toggle("user-filled", Boolean(placedRoom) && !FIXED_PLACEMENTS.has(coord));
      cell.classList.toggle("idea-target", Boolean(target));
      cell.classList.toggle("idea-match", Boolean(target && placedRoom && targetMatches(target, placedRoom)));
      cell.classList.toggle("idea-mismatch", Boolean(target && placedRoom && !targetMatches(target, placedRoom)));
      cell.classList.toggle("pattern-locked", isPattern && Boolean(target));

      // Apply/remove pattern color classes
      PATTERN_COLORS.forEach((color) => cell.classList.remove(`pattern-${color}`));
      if (isPattern && target && target.label) {
        cell.classList.add(`pattern-${target.label}`);
      }

      roomEl.textContent = placedRoom || (isPattern && target ? target.label : "Empty");
      noteEl.textContent = FIXED_PLACEMENTS.has(coord)
        ? "Fixed room"
        : isPattern && target
          ? target.label
          : placedRoom
            ? "Test placement"
            : "Open slot";
      targetEl.textContent = (!isPattern && target) ? makeTargetLabel(target) : "";
    });
  }

  function makeTargetLabel(target) {
    if (target.room) {
      return `Target: ${target.room}`;
    }
    return `Target: ${target.label || "restricted"}`;
  }

  function updateInspector() {
    const coord = state.selectedCoord;
    const currentRoom = state.placements.get(coord) || "";
    const target = getTargetByCoord(coord);
    const disabled = !state.lookup || FIXED_PLACEMENTS.has(coord);

    dom.selectedCoord.textContent = coord;
    dom.roomSelect.disabled = disabled;
    dom.clearSelected.disabled = disabled;

    if (!state.lookup) {
      dom.selectedHint.textContent = "Load the coordinate lookup first.";
      dom.roomSelect.innerHTML = '<option value="">Lookup unavailable</option>';
      dom.legalRoomCount.textContent = "The room-coordinate lookup failed to load.";
      return;
    }

    if (FIXED_PLACEMENTS.has(coord)) {
      dom.selectedHint.textContent = `${coord} is fixed to ${FIXED_PLACEMENTS.get(coord)}.`;
      dom.roomSelect.innerHTML = `<option value="${FIXED_PLACEMENTS.get(coord)}">${FIXED_PLACEMENTS.get(coord)}</option>`;
      dom.legalRoomCount.textContent = "Fixed coordinates cannot be reassigned.";
      return;
    }

    const options = getLegalRoomOptions(coord, currentRoom, target);
    const groupedOptions = groupRoomOptions(options, target);
    dom.roomSelect.innerHTML = '<option value="">Empty</option>';
    appendOptionGroup(dom.roomSelect, "Target Rooms", groupedOptions.targetRooms, currentRoom);
    appendOptionGroup(dom.roomSelect, "Other Legal Rooms", groupedOptions.otherRooms, currentRoom);

    if (!currentRoom) {
      dom.roomSelect.value = "";
    }

    dom.selectedHint.textContent = target
      ? makeTargetLabel(target)
      : "Choose any room that the lookup allows here.";
    dom.legalRoomCount.textContent = `${options.length} legal room options for ${coord}. Duplicate room names are filtered out of the picker.`;
  }

  function getLegalRoomOptions(coord, currentRoom, target) {
    const usedRooms = new Set(state.placements.values());
    if (currentRoom) {
      usedRooms.delete(currentRoom);
    }

    const allowed = [...(state.lookup.coordinate_to_rooms[coord] || [])].filter(
      (room) => !usedRooms.has(room)
    );

    allowed.sort((left, right) => {
      const leftPriority = getRoomPriority(left, target);
      const rightPriority = getRoomPriority(right, target);
      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }
      return left.localeCompare(right);
    });

    return allowed;
  }

  function groupRoomOptions(options, target) {
    if (!target) {
      return {
        targetRooms: [],
        otherRooms: options,
      };
    }

    const targetRooms = [];
    const otherRooms = [];

    options.forEach((room) => {
      if (getRoomPriority(room, target) > 0) {
        targetRooms.push(room);
      } else {
        otherRooms.push(room);
      }
    });

    return { targetRooms, otherRooms };
  }

  function appendOptionGroup(selectEl, label, rooms, currentRoom) {
    if (!rooms.length) {
      return;
    }

    const group = document.createElement("optgroup");
    group.label = label;

    rooms.forEach((room) => {
      const option = document.createElement("option");
      option.value = room;
      option.textContent = formatRoomOption(room);
      if (room === currentRoom) {
        option.selected = true;
      }
      group.appendChild(option);
    });

    selectEl.appendChild(group);
  }

  function getRoomPriority(room, target) {
    if (!target) {
      return 0;
    }
    if (target.room === room) {
      return 2;
    }
    if (target.allowedRooms && target.allowedRooms.includes(room)) {
      return 1;
    }
    return 0;
  }

  function formatRoomOption(room) {
    const status = state.lookup.room_status[room];
    if (status === "special_source_only") {
      return `${room} (source-only)`;
    }
    if (status === "rank_restricted") {
      return `${room} (rank 8 only)`;
    }
    if (status === "key_restricted") {
      return `${room} (key-only)`;
    }
    return room;
  }

  function getActiveIdea() {
    return IDEAS.find((idea) => idea.id === state.activeIdeaId) || null;
  }

  function getTargetByCoord(coord) {
    const idea = getActiveIdea();
    if (!idea) {
      return null;
    }
    return getIdeaTargets(idea).find((target) => target.coord === coord) || null;
  }

  function getIdeaTargets(idea) {
    if (!idea) {
      return [];
    }
    if (idea.pattern) {
      return resolvePatternTargets(idea.pattern, state.patternAnchor);
    }
    return idea.targets || [];
  }

  function resolvePatternTargets(pattern, anchor) {
    const cols = ["A", "B", "C", "D", "E"];
    const colIdx = cols.indexOf(anchor.charAt(0));
    const rank = parseInt(anchor.substring(1), 10);
    const targets = [];
    pattern.cells.forEach((cell) => {
      const c = colIdx + cell.dc;
      const r = rank + cell.dr;
      if (c >= 0 && c < 5 && r >= 1 && r <= 9) {
        targets.push({ coord: `${cols[c]}${r}`, matchMode: "filled", label: cell.label });
      }
    });
    return targets;
  }

  function buildIdeaDescription(idea) {
    return idea.description;
  }

  function formatBigInt(value) {
    if (value === null || value === undefined) {
      return "pending";
    }
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function showLookupError(error) {
    const message = [
      "The drafting lookup could not be loaded.",
      `Error: ${error.message}`,
    ].join(" ");
    dom.lookupError.hidden = false;
    dom.lookupError.textContent = message;
    if (dom.activeIdeaCount) dom.activeIdeaCount.textContent = "lookup missing";
  }

  function showLoadingState() {
    if (dom.activeIdeaCount) dom.activeIdeaCount.textContent = "computing...";
    dom.legalRoomCount.textContent = "Loading the room-coordinate lookup...";
  }

  function hideLoadingState() {
    dom.lookupError.hidden = true;
  }
})();