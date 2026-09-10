/* Panashe Banhire — portfolio behaviour
   Projects are loaded from data/projects.json, then enriched from the public
   GitHub API so the site stays current as repositories are pushed. */

(function () {
  "use strict";

  var GITHUB_USER = "iAmPanBan";
  var grid = document.getElementById("project-grid");
  var searchInput = document.getElementById("project-search");
  var countEl = document.getElementById("result-count");
  var emptyEl = document.getElementById("empty-state");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));

  var projects = [];
  var state = { filter: "all", query: "" };

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

  /* ----- header shadow ----- */

  var header = document.querySelector(".site-header");
  var onScroll = function () {
    header.classList.toggle("is-stuck", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
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
      project.language, year(project)
    ].concat(project.stack || []).join(" ").toLowerCase();
  }

  /* ----- rendering ----- */

  function cardMarkup(project) {
    var tags = (project.stack || []).slice(0, 4).map(function (tag) {
      return '<li class="tag">' + esc(tag) + "</li>";
    }).join("");

    var links = [];
    if (project.live) {
      links.push('<a href="' + esc(project.live) + '" rel="noopener" target="_blank">Live site ↗</a>');
    }
    if (project.repo) {
      links.push('<a href="' + esc(project.repo) + '" rel="noopener" target="_blank">Code ↗</a>');
    }
    if (project.private) {
      links.push('<span class="lock">Private repository</span>');
    }

    return '<article class="card" data-category="' + esc(project.category) + '">' +
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
    var visible = projects.filter(function (project) {
      var matchesFilter = state.filter === "all" || project.category === state.filter;
      var matchesQuery = !q || haystack(project).indexOf(q) !== -1;
      return matchesFilter && matchesQuery;
    });

    grid.innerHTML = visible.map(cardMarkup).join("");
    emptyEl.hidden = visible.length !== 0;
    countEl.textContent = visible.length + " of " + projects.length + " projects";
  }

  function updateCounts() {
    var langs = {};
    projects.forEach(function (p) { if (p.language) { langs[p.language] = true; } });

    Array.prototype.forEach.call(document.querySelectorAll("[data-count-projects]"), function (el) {
      el.textContent = String(projects.length);
    });
    var langEl = document.querySelector("[data-count-langs]");
    if (langEl) { langEl.textContent = String(Object.keys(langs).length); }
  }

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
