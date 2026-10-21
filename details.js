/* Details page logic: details, cast, trailers, recommendations and watchlist. */
"use strict";

const TMDB_API_KEY = "PASTE_YOUR_TMDB_API_KEY_HERE";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w185";
const WATCHLIST_KEY = "movieExplorerWatchlist";

const params = new URLSearchParams(window.location.search);
const mediaType = params.get("type") === "tv" ? "tv" : "movie";
const mediaId = params.get("id");

const elements = {
  backdrop: document.getElementById("backdrop"),
  poster: document.getElementById("poster"),
  title: document.getElementById("title"),
  typeLabel: document.getElementById("typeLabel"),
  meta: document.getElementById("meta"),
  score: document.getElementById("score"),
  overview: document.getElementById("overview"),
  watchlist: document.getElementById("watchlist"),
  cast: document.getElementById("cast"),
  videos: document.getElementById("videos"),
  recommendations: document.getElementById("recommendations"),
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toastMessage")
};

let titleData = null;
let toastInstance = null;

document.addEventListener("DOMContentLoaded", initDetails);

async function initDetails() {
  if (window.bootstrap && elements.toast) {
    toastInstance = bootstrap.Toast.getOrCreateInstance(elements.toast, { delay: 2800 });
  }

  if (!mediaId) {
    showPageError("No title was selected. Return to Discover and choose a movie or TV show.");
    return;
  }

  if (!TMDB_API_KEY || TMDB_API_KEY === "PASTE_YOUR_TMDB_API_KEY_HERE") {
    showPageError("Add your TMDB API key to details.js and script.js, then refresh this page.");
    return;
  }

  elements.watchlist?.addEventListener("click", toggleWatchlist);

  try {
    const [details, credits, videos, recommendations] = await Promise.all([
      tmdbFetch(`/${mediaType}/${mediaId}`, { append_to_response: "videos" }),
      tmdbFetch(`/${mediaType}/${mediaId}/credits`),
      tmdbFetch(`/${mediaType}/${mediaId}/videos`),
      tmdbFetch(`/${mediaType}/${mediaId}/recommendations`, { page: 1 })
    ]);

    titleData = { ...details, media_type: mediaType };
    renderDetails(details);
    renderCast(credits.cast || []);
    renderVideos(videos.results || []);
    renderRecommendations(recommendations.results || []);
    updateWatchlistButton();
  } catch (error) {
    showPageError(error.message);
  }
}

async function tmdbFetch(path, query = {}) {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("language", "en-US");

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });

  const response = await fetch(url);
  if (!response.ok) {
    let message = `TMDB request failed (${response.status}).`;
    try {
      const data = await response.json();
      if (data.status_message) message = data.status_message;
    } catch (_) {}
    throw new Error(message);
  }
  return response.json();
}

function renderDetails(data) {
  const title = data.title || data.name || "Untitled";
  const releaseDate = data.release_date || data.first_air_date || "";
  const year = releaseDate ? releaseDate.slice(0, 4) : "Year unknown";
  const runtime = data.runtime ? `${data.runtime} min` : (data.episode_run_time?.[0] ? `${data.episode_run_time[0]} min/episode` : "");
  const genres = (data.genres || []).map((genre) => genre.name).join(", ");
  const metaParts = [year, runtime, genres].filter(Boolean);

  document.title = `${title} | Movie Explorer`;
  elements.title.textContent = title;
  elements.typeLabel.textContent = mediaType === "tv" ? "TV SHOW DETAILS" : "MOVIE DETAILS";
  elements.meta.textContent = metaParts.join(" • ");
  elements.score.textContent = data.vote_average ? `${Number(data.vote_average).toFixed(1)}` : "—";
  elements.overview.textContent = data.overview || "No overview is available for this title.";
  elements.poster.src = data.poster_path ? `${TMDB_IMAGE_BASE}${data.poster_path}` : "";
  elements.poster.alt = `${title} poster`;
  elements.poster.hidden = !data.poster_path;

  if (data.backdrop_path) {
    elements.backdrop.style.backgroundImage = `url("${TMDB_BACKDROP_BASE}${data.backdrop_path}")`;
  }
}

function renderCast(cast) {
  elements.cast.innerHTML = "";
  const people = cast.slice(0, 12);

  if (!people.length) {
    elements.cast.innerHTML = '<div class="col-12"><p class="empty-state">Cast information is not available.</p></div>';
    return;
  }

  people.forEach((person) => {
    const col = document.createElement("div");
    col.className = "col";
    const image = person.profile_path
      ? `<img class="cast-card__image" src="${escapeAttribute(`${TMDB_PROFILE_BASE}${person.profile_path}`)}" alt="${escapeAttribute(person.name || "Cast member")}" loading="lazy">`
      : '<div class="cast-card__image d-flex align-items-center justify-content-center text-secondary">No photo</div>';

    col.innerHTML = `
      <article class="cast-card">
        <div class="cast-card__image-wrap">${image}</div>
        <div class="cast-card__body">
          <h3 class="cast-card__name">${escapeHTML(person.name || "Unknown")}</h3>
          <p class="cast-card__character">${escapeHTML(person.character || "Cast")}</p>
        </div>
      </article>`;
    elements.cast.appendChild(col);
  });
}

function renderVideos(videos) {
  elements.videos.innerHTML = "";
  const playable = videos.filter((video) => video.site === "YouTube" && ["Trailer", "Teaser", "Clip"].includes(video.type)).slice(0, 6);

  if (!playable.length) {
    elements.videos.innerHTML = '<div class="col-12"><p class="empty-state">No YouTube trailers or clips are available for this title.</p></div>';
    return;
  }

  playable.forEach((video) => {
    const col = document.createElement("div");
    col.className = "col";
    const youtubeUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.key)}`;
    col.innerHTML = `
      <article class="card video-card">
        <iframe class="video-card__frame" src="${youtubeUrl}" title="${escapeAttribute(video.name || "Movie trailer")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        <p class="video-card__title">${escapeHTML(video.name || video.type || "Video")}</p>
      </article>`;
    elements.videos.appendChild(col);
  });
}

function renderRecommendations(items) {
  elements.recommendations.innerHTML = "";
  const results = items.slice(0, 10);

  if (!results.length) {
    elements.recommendations.innerHTML = '<div class="col-12"><p class="empty-state">No recommendations are available for this title yet.</p></div>';
    return;
  }

  results.forEach((item) => {
    const col = document.createElement("div");
    col.className = "col";
    const title = item.title || item.name || "Untitled";
    const date = item.release_date || item.first_air_date || "";
    const rating = Number(item.vote_average);
    const poster = item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : "";
    const url = `details.html?type=${encodeURIComponent(mediaType)}&id=${encodeURIComponent(item.id)}`;

    col.innerHTML = `
      <article class="card movie-card">
        <a class="movie-card__link" href="${url}" aria-label="View details for ${escapeAttribute(title)}">
          <div class="movie-card__poster-wrap">
            ${poster ? `<img class="movie-card__poster" src="${escapeAttribute(poster)}" alt="${escapeAttribute(title)} poster" loading="lazy">` : '<div class="movie-card__poster movie-card__poster--missing">Poster unavailable</div>'}
            ${Number.isFinite(rating) && rating > 0 ? `<span class="movie-card__rating">★ ${rating.toFixed(1)}</span>` : ""}
          </div>
          <div class="movie-card__body">
            <h3 class="movie-card__title">${escapeHTML(title)}</h3>
            <p class="movie-card__date">${escapeHTML(date ? date.slice(0, 4) : "Release date unavailable")}</p>
            <span class="movie-card__type">${mediaType === "tv" ? "TV show" : "Movie"}</span>
          </div>
        </a>
      </article>`;
    elements.recommendations.appendChild(col);
  });
}

function toggleWatchlist() {
  if (!titleData) return;

  const watchlist = getWatchlist();
  const existingIndex = watchlist.findIndex((item) => String(item.id) === String(titleData.id) && (item.media_type || "movie") === mediaType);

  if (existingIndex >= 0) {
    watchlist.splice(existingIndex, 1);
    showToast("Removed from your watchlist.");
  } else {
    watchlist.unshift({
      id: titleData.id,
      media_type: mediaType,
      title: titleData.title || titleData.name || "Untitled",
      name: titleData.name,
      release_date: titleData.release_date,
      first_air_date: titleData.first_air_date,
      poster_path: titleData.poster_path,
      vote_average: titleData.vote_average
    });
    showToast("Added to your watchlist.");
  }

  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  updateWatchlistButton();
}

function updateWatchlistButton() {
  if (!titleData || !elements.watchlist) return;
  const isSaved = getWatchlist().some((item) => String(item.id) === String(titleData.id) && (item.media_type || "movie") === mediaType);
  elements.watchlist.textContent = isSaved ? "✓ Remove from watchlist" : "＋ Add to watchlist";
  elements.watchlist.classList.toggle("btn-warning", !isSaved);
  elements.watchlist.classList.toggle("btn-outline-light", isSaved);
}

function getWatchlist() {
  try {
    const saved = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (_) {
    return [];
  }
}

function showPageError(message) {
  elements.title.textContent = "Unable to load this title";
  elements.overview.textContent = message;
  elements.meta.textContent = "";
  elements.score.textContent = "—";
  elements.cast.innerHTML = `<div class="col-12"><p class="empty-state">${escapeHTML(message)}</p></div>`;
  elements.videos.innerHTML = "";
  elements.recommendations.innerHTML = "";
  if (elements.watchlist) elements.watchlist.disabled = true;
}

function showToast(message) {
  if (elements.toastMessage) elements.toastMessage.textContent = message;
  if (toastInstance) toastInstance.show();
  else window.alert(message);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function escapeAttribute(value) {
  return escapeHTML(value);
}
