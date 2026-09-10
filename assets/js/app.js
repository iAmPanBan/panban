/* Panashe Banhire — portfolio behaviour
   Projects are loaded from data/projects.json, then enriched from the public
   GitHub API so the site stays current as repositories are pushed. */

(function () {
  "use strict";

  var GITHUB_USER = "iAmPanBan";
  var DEFAULT_CATEGORY = "apps";

  var grid = document.getElementById("project-grid");
  var searchInput = document.getElementById("project-search");
  var countEl = document.getElementById("result-count");
  var emptyEl = document.getElementById("empty-state");
  var progressEl = document.getElementById("progress");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));

  var projects = [];
  var state = { filter: DEFAULT_CATEGORY, query: "" };

  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var LABELS = {
    apps: "Apps & Products",
    sites: "Websites",
    business: "Client & Business",
    labs: "Experiments"
  };

  /* ----- theme ----- */

  var toggle = document.getElementById("theme-toggle");
  var stored = null;
  try { stored = localStorage.getItem("pb-theme"); } catch (e) { /* blocked */ }
  if (stored === "dark" || stored === "light") {
    document.documentElement.setAttribute("data-theme", stored);
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      if (!current) {
        current = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("pb-theme", next); } catch (e) { /* blocked */ }
    });
  }

  /* ----- scroll: header state and progress bar ----- */

  var header = document.querySelector(".site-header");
  function onScroll() {
    header.classList.toggle("is-stuck", window.scrollY > 8);
    if (progressEl) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      progressEl.style.transform = "scaleX(" + ratio + ")";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  var yearEl = document.getElementById("year");
  if (yearEl) { yearEl.textContent = String(new Date().getFullYear()); }

  /* ----- helpers ----- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function year(project) {
    var d = project.updated || project.created || "";
    return d.slice(0, 4);
  }

  function haystack(project) {
    return [
      project.title, project.name, project.description, project.category,
      LABELS[project.category], project.language, year(project)
    ].concat(project.stack || []).join(" ").toLowerCase();
  }

  /* ----- count-up figures ----- */

  function countUp(el, target) {
    var plain = el.hasAttribute("data-plain");
    var format = function (n) { return plain ? String(n) : String(n); };
    if (calm) { el.textContent = format(target); return; }

    var start = performance.now();
    var duration = 900;
    (function step(now) {
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(Math.round(target * eased));
      if (t < 1) { requestAnimationFrame(step); }
    })(start);
  }

  /* ----- rendering ----- */

  function cardMarkup(project, index) {
    var tags = (project.stack || []).slice(0, 4).map(function (tag) {
      return '<li class="tag">' + esc(tag) + "</li>";
    }).join("");

    var links = [];
    if (project.live) {
      links.push('<a href="' + esc(project.live) + '" rel="noopener" target="_blank">' +
        'Live site <span class="arrow" aria-hidden="true">↗</span></a>');
    }
    if (project.repo) {
      links.push('<a href="' + esc(project.repo) + '" rel="noopener" target="_blank">' +
        'Code <span class="arrow" aria-hidden="true">↗</span></a>');
    }
    if (project.private) {
      links.push('<span class="lock">Private repository</span>');
    }

    var delay = calm ? 0 : Math.min(index, 14) * 0.045;

    return '<article class="card" data-category="' + esc(project.category) + '"' +
      ' style="animation-delay:' + delay.toFixed(3) + 's">' +
      '<div class="card-top">' +
        '<h3 class="card-title">' + esc(project.title) + "</h3>" +
        '<span class="card-year">' + esc(year(project)) + "</span>" +
      "</div>" +
      '<p class="card-desc">' + esc(project.description) + "</p>" +
      (tags ? '<ul class="tags">' + tags + "</ul>" : "") +
      '<div class="card-links">' + links.join("") + "</div>" +
      "</article>";
  }

  function render() {
    var q = state.query.trim().toLowerCase();
    var searching = q.length > 0;

    // A search looks across every category; browsing stays inside the chosen one.
    var visible = projects.filter(function (project) {
      if (searching) { return haystack(project).indexOf(q) !== -1; }
      return project.category === state.filter;
    });

    grid.innerHTML = visible.map(cardMarkup).join("");
    emptyEl.hidden = visible.length !== 0;

    countEl.textContent = searching
      ? visible.length + " of " + projects.length + " projects match “" + q + "”"
      : visible.length + " " + (LABELS[state.filter] || "projects").toLowerCase() +
        " · " + projects.length + " projects in total";

    chips.forEach(function (chip) {
      chip.classList.toggle("is-dimmed", searching);
    });
  }

  function updateCounts() {
    var langs = {};
    projects.forEach(function (p) { if (p.language) { langs[p.language] = true; } });

    Array.prototype.forEach.call(document.querySelectorAll("[data-count-projects]"), function (el) {
      if (el.hasAttribute("data-countup")) { countUp(el, projects.length); }
      else { el.textContent = String(projects.length); }
    });
    var langEl = document.querySelector("[data-count-langs]");
    if (langEl) { countUp(langEl, Object.keys(langs).length); }
    var sinceEl = document.querySelector("[data-plain]");
    if (sinceEl) { countUp(sinceEl, 2020); }
  }

  /* ----- head tracking: surfaces turn toward the pointer ----- */

  function track(el, event, maxDeg) {
    var box = el.getBoundingClientRect();
    var px = (event.clientX - box.left) / box.width - 0.5;
    var py = (event.clientY - box.top) / box.height - 0.5;
    el.style.setProperty("--ry", (px * maxDeg).toFixed(2) + "deg");
    el.style.setProperty("--rx", (-py * maxDeg).toFixed(2) + "deg");
    el.classList.add("is-tracking");
  }

  function release(el) {
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.classList.remove("is-tracking");
  }

  if (!calm) {
    grid.addEventListener("pointermove", function (event) {
      var card = event.target.closest ? event.target.closest(".card") : null;
      if (card) { track(card, event, 7); }
    });
    grid.addEventListener("pointerout", function (event) {
      var card = event.target.closest ? event.target.closest(".card") : null;
      if (card && !card.contains(event.relatedTarget)) { release(card); }
    });

    var heroCard = document.querySelector(".hero-card");
    var hero = document.querySelector(".hero");
    if (heroCard && hero) {
      heroCard.classList.add("tilt");
      hero.addEventListener("pointermove", function (event) { track(heroCard, event, 5); });
      hero.addEventListener("pointerleave", function () { release(heroCard); });
    }
  }

  /* ----- the horizon grid behind the hero ----- */

  (function horizonGrid() {
    var canvas = document.getElementById("grid-field");
    if (!canvas) { return; }
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, running = false, offset = 0, last = 0;

    function readColor(name, alpha) {
      var raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      var hex = raw.replace("#", "");
      if (hex.length === 3) { hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]; }
      var n = parseInt(hex, 16);
      if (isNaN(n)) { return "rgba(128,128,160," + alpha + ")"; }
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var box = canvas.getBoundingClientRect();
      W = box.width; H = box.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      if (!W || !H) { return; }
      ctx.clearRect(0, 0, W, H);

      var horizon = H * 0.62;
      var vx = W * 0.5;
      var floor = readColor("--accent", 0.5);
      var rail = readColor("--accent-2", 0.42);
      var rows = 22;
      var cols = 15;

      ctx.lineWidth = 1;

      // rails converging on the vanishing point
      ctx.strokeStyle = rail;
      for (var c = -cols; c <= cols; c++) {
        var spread = (c / cols) * W * 1.6;
        ctx.globalAlpha = 0.16 + 0.2 * (1 - Math.abs(c) / cols);
        ctx.beginPath();
        ctx.moveTo(vx, horizon);
        ctx.lineTo(vx + spread, H);
        ctx.stroke();
      }

      // rungs rushing toward the viewer
      ctx.strokeStyle = floor;
      for (var i = 0; i < rows; i++) {
        var z = i + offset;
        var y = horizon + (H * 0.28) / (z * 0.42 + 0.42);
        if (y > H + 2) { continue; }
        ctx.globalAlpha = Math.max(0, 0.4 * (1 - i / rows));
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // the horizon itself
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = rail;
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(W, horizon);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (!running) { return; }
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      offset = (offset + dt * 0.55) % 1;
      draw();
      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);

    // repaint when the palette flips
    new MutationObserver(draw).observe(document.documentElement, {
      attributes: true, attributeFilter: ["data-theme"]
    });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);

    if (calm) { return; }

    // only run while the hero is on screen
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; last = 0; requestAnimationFrame(frame); }
      else if (!visible) { running = false; }
    }).observe(canvas);
  })();

  /* ----- boot sequence ----- */

  (function bootSequence() {
    var visor = document.getElementById("visor");
    if (calm) {
      document.body.classList.remove("booting");
      if (visor) { visor.remove(); }
      return;
    }
    window.setTimeout(function () {
      document.body.classList.remove("booting");
      if (visor) { visor.remove(); }
    }, 1400);
  })();

  /* ----- live GitHub enrichment (public repos only) ----- */

  function enrich() {
    return fetch("https://api.github.com/users/" + GITHUB_USER + "/repos?per_page=100&sort=pushed")
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (repos) {
        if (!Array.isArray(repos)) { return; }
        var known = {};
        projects.forEach(function (p) { known[p.name.toLowerCase()] = p; });

        repos.forEach(function (repo) {
          if (repo.fork) { return; }
          var match = known[repo.name.toLowerCase()];
          if (match) {
            // keep the live record honest: dates, links and visibility
            match.updated = (repo.pushed_at || "").slice(0, 10) || match.updated;
            match.repo = repo.html_url;
            match.private = false;
            if (repo.homepage) { match.live = repo.homepage; }
            if (repo.description && !match.description) { match.description = repo.description; }
          } else if (repo.name.toLowerCase() !== GITHUB_USER.toLowerCase()) {
            // a repository pushed since this site was last built
            projects.push({
              name: repo.name,
              title: repo.name.replace(/[-_]+/g, " "),
              description: repo.description || "Recent project — see the repository for details.",
              category: "labs",
              stack: repo.language ? [repo.language] : [],
              language: repo.language,
              private: false,
              repo: repo.html_url,
              live: repo.homepage || null,
              created: (repo.created_at || "").slice(0, 10),
              updated: (repo.pushed_at || "").slice(0, 10)
            });
          }
        });

        projects.sort(function (a, b) { return (b.updated || "").localeCompare(a.updated || ""); });
      })
      .catch(function () { /* offline or rate limited — the bundled data stands */ });
  }

  /* ----- events ----- */

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      state.filter = chip.getAttribute("data-filter");
      if (state.query) { state.query = ""; searchInput.value = ""; }
      render();
    });
  });

  searchInput.addEventListener("input", function () {
    state.query = searchInput.value;
    render();
  });

  /* ----- boot ----- */

  fetch("data/projects.json")
    .then(function (res) { return res.json(); })
    .then(function (data) {
      projects = data;
      render();
      updateCounts();
      return enrich();
    })
    .then(function () {
      render();
      updateCounts();
    })
    .catch(function () {
      countEl.textContent = "";
      grid.innerHTML = '<p class="empty">Projects could not be loaded. ' +
        'They are all on <a href="https://github.com/' + GITHUB_USER +
        '?tab=repositories" rel="noopener">GitHub</a>.</p>';
    });
})();
