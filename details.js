const apiUrl = "https://api.themoviedb.org/3";
const apiKey = "5694797ffe3b28f53036e86e4ae22bac";
const imageBaseUrl = "https://image.tmdb.org/t/p/w500";
const profileImageBaseUrl = "https://image.tmdb.org/t/p/w185";
const backdropImageBaseUrl = "https://image.tmdb.org/t/p/original";
const defaultProfileImage = "https://via.placeholder.com/500x750?text=No+Image";

const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get("id");
const mediaType = urlParams.get("media_type");
const WATCHLIST_KEY = "movieExplorerWatchlist";

const elements = {
    trailerContainer: document.getElementById("trailerContainer"),
    trailer: document.getElementById("trailer"),
    backdrop: document.getElementById("backdrop"),
    poster: document.getElementById("poster"),
    movieDetails: document.getElementById("movie-details"),
    castGrid: document.getElementById("cast"),
    score: document.getElementById("score"),
    watchlistButton: document.getElementById("watchlistButton"),
};

async function tmdbFetch(path,params={}){
    if(!apiKey){
        throw new Error("Please configure your TMDB API")
    }
    const url = new URL(`${apiUrl}${path}`);
    url.searchParams.set("api_key",apiKey);
    url.searchParams.set("language","en-US");
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, value);
        }
    });
    console.log("Fetching TMDB URL:", url.toString());
    const response = await fetch(url);
   try{
    if (!response.ok) {
        throw new Error(`TMDB request failed: ${response.status}`);
        data = response.json();
        console.log(data);
        }
    }catch(error){
        throw new Error(error.message)
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
  elements.poster.src = data.poster_path ? `${imageBaseUrl}${data.poster_path}` : "";
  elements.poster.alt = `${title} poster`;
  elements.poster.hidden = !data.poster_path;

  if (data.backdrop_path) {
    elements.backdrop.style.backgroundImage = `url("${backdropImageBaseUrl}${data.backdrop_path}")`;
  }
}

