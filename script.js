/* Home page logic: TMDB requests, cards, search, tabs and watchlist. */
"use strict";

const TMDB_API_KEY = "PASTE_YOUR_TMDB_API_KEY_HERE";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w185";
const WATCHLIST_KEY = "movieExplorerWatchlist";

const elements = {
  trendingList: document.getElementById("trendingList"),
  trailerList: document.getElementById("trailerList"),
  popularList: document.getElementById("popularList"),
  watchlistList: document.getElementById("watchlistList"),
  leaderboard: document.getElementById("leaderboard"),
  searchForm: document.getElementById("searchForm"),
  searchInput: document.getElementById("searchInput"),
  heroSearch: document.getElementById("heroSearch"),
  heroInput: document.getElementById("heroInput"),
  trendingHeading: document.getElementById("trendingHeading"),
  popularHeading: document.getElementById("popularHeading"),
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toastMessage")
};

let currentTrendingPeriod = "day";
let currentPopularKind = "movie";
let toastInstance = null;

document.addEventListener("DOMContentLoaded", init);

function init() {
  if (window.bootstrap && elements.toast) {
    toastInstance = bootstrap.Toast.getOrCreateInstance(elements.toast, { delay: 2800 });
  }

  document.querySelectorAll("[data-period]").forEach((button) => {
    button.addEventListener("click", () => {
      currentTrendingPeriod = button.dataset.period;
      setActiveTab("[data-period]", button);
      loadTrending(currentTrendingPeriod);
    });
  });

  document.querySelectorAll("[data-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      currentPopularKind = button.dataset.kind;
      setActiveTab("[data-kind]", button);
      loadPopular(currentPopularKind);
    });
  });

  elements.searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    searchTitles(elements.searchInput.value);
  });

  elements.heroSearch?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = elements.heroInput.value.trim();
    if (elements.searchInput) elements.searchInput.value = query;
    searchTitles(query);
  });

  loadTrending(currentTrendingPeriod);
  loadUpcoming();
  loadPopular(currentPopularKind);
  loadPopularPeople();
  renderWatchlist();
}

function setActiveTab(selector, activeButton) {
  document.querySelectorAll(selector).forEach((button) => {
    const isActive = button === activeButton;
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("btn-dark", isActive);
    button.classList.toggle("btn-outline-dark", !isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

async function tmdbFetch(path, params = {}) {
  if (!TMDB_API_KEY || TMDB_API_KEY === "PASTE_YOUR_TMDB_API_KEY_HERE") {
    throw new Error("Add your TMDB API key to script.js and details.js before using the app.");
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("language", "en-US");

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url);
  if (!response.ok) {
    let message = `TMDB request failed (${response.status}).`;
    try {
      const errorData = await response.json();
      if (errorData.status_message) message = errorData.status_message;
    } catch (_) {}
    throw new Error(message);
  }
  return response.json();
}

async function loadTrending(period) {
  setLoading(elements.trendingList, 5);
  try {
    const data = await tmdbFetch(`/trending/all/${period}`);
    renderMovieGrid(elements.trendingList, (data.results || []).slice(0, 10));
    if (elements.trendingHeading) {
      elements.trendingHeading.textContent = period === "day" ? "Trending today" : "Trending this week";
    }
  } catch (error) {
    showGridError(elements.trendingList, error.message);
  }
}

async function loadUpcoming() {
  setLoading(elements.trailerList, 5);
  try {
    const data = await tmdbFetch("/movie/upcoming", { region: "IN", page: 1 });
    renderMovieGrid(elements.trailerList, (data.results || []).slice(0, 10));
  } catch (error) {
    showGridError(elements.trailerList, error.message);
  }
}

async function loadPopular(kind) {
  setLoading(elements.popularList, 5);
  try {
    const data = await tmdbFetch(`/${kind}/popular`, { page: 1 });
    renderMovieGrid(elements.popularList, (data.results || []).slice(0, 10), kind);
    if (elements.popularHeading) {
      elements.popularHeading.textContent = kind === "movie" ? "Popular movies" : "Popular TV shows";
    }
  } catch (error) {
    showGridError(elements.popularList, error.message);
  }
}

async function searchTitles(rawQuery) {
  const query = String(rawQuery || "").trim();
  if (!query) {
    showToast("Enter a title to search.");
    return;
  }

  if (elements.trendingHeading) elements.trendingHeading.textContent = `Search results for “${query}”`;
  if (elements.trendingList) elements.trendingList.scrollIntoView({ behavior: "smooth", block: "start" });
  setLoading(elements.trendingList, 5);

  try {
    const data = await tmdbFetch("/search/multi", { query, include_adult: false, page: 1 });
    const results = (data.results || []).filter((item) => item.media_type === "movie" || item.media_type === "tv");
    renderMovieGrid(elements.trendingList, results.slice(0, 20));
    if (!results.length) showToast("No matching movies or TV shows found.");
  } catch (error) {
    showGridError(elements.trendingList, error.message);
  }
}

async function loadPopularPeople() {
  if (!elements.leaderboard) return;
  try {
    const data = await tmdbFetch("/person/popular", { page: 1 });
    const people = (data.results || []).slice(0, 8);
    elements.leaderboard.innerHTML = "";

    if (!people.length) {
      elements.leaderboard.innerHTML = '<div class="col"><p class="empty-state">No people found.</p></div>';
      return;
    }

    people.forEach((person) => {
      const col = document.createElement("div");
      col.className = "col";
      const knownFor = (person.known_for || [])
        .map((item) => item.title || item.name)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ") || "Actor / creator";

      const avatar = person.profile_path
        ? `<img src="${TMDB_PROFILE_BASE}${escapeAttribute(person.profile_path)}" alt="" loading="lazy">`
        : escapeHTML(getInitials(person.name));

      col.innerHTML = `
        <article class="people-card">
          <div class="people-card__avatar">${avatar}</div>
          <div>
            <h3 class="people-card__name">${escapeHTML(person.name || "Unknown person")}</h3>
            <p class="people-card__known-for">${escapeHTML(knownFor)}</p>
          </div>
        </article>`;
      elements.leaderboard.appendChild(col);
    });
  } catch (error) {
    elements.leaderboard.innerHTML = `<div class="col-12"><p class="empty-state">${escapeHTML(error.message)}</p></div>`;
  }
}

function renderMovieGrid(container, items, defaultKind = null) {
  if (!container) return;
  container.innerHTML = "";

  if (!items || !items.length) {
    container.innerHTML = '<div class="col-12"><p class="empty-state">No titles to show right now. Try another search or tab.</p></div>';
    return;
  }

  items.forEach((item) => {
    const mediaType = item.media_type || defaultKind || (item.first_air_date !== undefined ? "tv" : "movie");
    const title = item.title || item.name || "Untitled";
    const date = item.release_date || item.first_air_date || "";
    const year = date ? date.slice(0, 4) : "Release date unavailable";
    const rating = Number(item.vote_average);
    const poster = item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : "";
    const detailUrl = `details.html?type=${encodeURIComponent(mediaType)}&id=${encodeURIComponent(item.id)}`;

    const col = document.createElement("div");
    col.className = "col";
    col.innerHTML = `
      <article class="card movie-card">
        <a class="movie-card__link" href="${detailUrl}" aria-label="View details for ${escapeAttribute(title)}">
          <div class="movie-card__poster-wrap">
            ${poster
              ? `<img class="movie-card__poster" src="${escapeAttribute(poster)}" alt="${escapeAttribute(title)} poster" loading="lazy">`
              : `<div class="movie-card__poster movie-card__poster--missing">Poster unavailable</div>`}
            ${Number.isFinite(rating) && rating > 0 ? `<span class="movie-card__rating">★ ${rating.toFixed(1)}</span>` : ""}
          </div>
          <div class="movie-card__body">
            <h3 class="movie-card__title">${escapeHTML(title)}</h3>
            <p class="movie-card__date">${escapeHTML(year)}</p>
            <span class="movie-card__type">${mediaType === "tv" ? "TV show" : "Movie"}</span>
          </div>
        </a>
      </article>`;
    container.appendChild(col);
  });
}

function renderWatchlist() {
  if (!elements.watchlistList) return;
  let watchlist = [];
  try {
    watchlist = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
    if (!Array.isArray(watchlist)) watchlist = [];
  } catch (_) {
    watchlist = [];
  }

  if (!watchlist.length) {
    elements.watchlistList.innerHTML = '<div class="col-12"><p class="empty-state">Your watchlist is empty. Open a title and choose “Add to watchlist”.</p></div>';
    return;
  }

  renderMovieGrid(elements.watchlistList, watchlist);
}

function setLoading(container, count = 5) {
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const col = document.createElement("div");
    col.className = "col";
    col.innerHTML = '<div class="placeholder-glow"><span class="placeholder col-12 movie-grid__placeholder"></span></div>';
    container.appendChild(col);
  }
}

function showGridError(container, message) {
  if (!container) return;
  container.innerHTML = `<div class="col-12"><p class="empty-state">${escapeHTML(message)}<br><small>Check your API key and internet connection, then refresh.</small></p></div>`;
}

function showToast(message) {
  if (elements.toastMessage) elements.toastMessage.textContent = message;
  if (toastInstance) toastInstance.show();
  else window.alert(message);
}

function getInitials(name) {
  return String(name || "?").split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function escapeAttribute(value) {
  return escapeHTML(value);
}
