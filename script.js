const apiUrl = "https://api.themoviedb.org/3";
const apiKey = "5694797ffe3b28f53036e86e4ae22bac";
const imageBaseUrl = "https://image.tmdb.org/t/p/w500";
const fallbackImage = "https://placehold.co/500x750/10243b/ffffff?text=No+Poster";

const elements = {
    heroSearch: document.getElementById("heroSearch"),
    heroInput: document.getElementById("heroInput"),
    trendingList: document.getElementById("trendingList"),
    popularList: document.getElementById("popularList"),
    trailerList: document.getElementById("trailerList"),
    watchlistList: document.getElementById("watchlistList"),
    popularPeopleList: document.getElementById("popularPeopleGrid")
};

let activeMoviesMap = new Map();

async function tmdbFetch(path, params = {}) {
    if (!apiKey) {
        throw new Error("Please configure your TMDB API key.");
    }
    const url = new URL(`${apiUrl}${path}`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("language", "en-US");
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, value);
        }
    });
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`TMDB request failed: ${response.status}`);
    }
    return response.json();
}

async function getTrendingMovies() {
    const data = await tmdbFetch("/trending/movie/week");
    const movies = data.results || [];
    movies.forEach(m => activeMoviesMap.set(m.id, m));
    return movies;
}

async function getPopularMovies() {
    const data = await tmdbFetch("/movie/popular");
    const movies = data.results || [];
    movies.forEach(m => activeMoviesMap.set(m.id, m));
    return movies;
}

async function getUpcomingMovies() {
    const data = await tmdbFetch("/movie/upcoming");
    const movies = data.results || [];
    movies.forEach(m => activeMoviesMap.set(m.id, m));
    return movies;
}

async function getPopularPeople() {
    const data = await tmdbFetch("/person/popular");
    return data.results || [];
}

function renderMovieGrid(container, movies) {
    if (!container) return;
    container.replaceChildren();
    if (!movies.length) {
        container.innerHTML = `
            <div class="col-12">
                <p class="text-muted">No movies found.</p>
            </div>
        `;
        return;
    }
    movies.forEach(movie => {
        activeMoviesMap.set(movie.id, movie);

        const column = document.createElement("div");
        column.className = "col";
        const poster = movie.poster_path
            ? `${imageBaseUrl}${movie.poster_path}`
            : fallbackImage;
        const title = movie.title || movie.name || "Untitled";
        const rating = Number(movie.vote_average || 0).toFixed(1);
        
        column.innerHTML = `
            <article class="movie-card card h-100 shadow-sm">
                <img
                    class="movie-card__poster card-img-top"
                    src="${poster}"
                    alt="${title}"
                    loading="lazy"
                >
                <div class="movie-card__body card-body d-flex flex-column">
                    <h3 class="movie-card__title card-title h5">
                        ${title}
                    </h3>

                    <p class="movie-card__rating text-warning">
                        ★ ${rating}/10
                    </p>

                    <button
                        class="btn btn-dark mt-auto movie-card__watchlist-button"
                        type="button"
                        data-movie-id="${movie.id}"
                    >
                        Add to Watchlist
                    </button>
                </div>
            </article>
        `;

        const image = column.querySelector("img");
        image.addEventListener("error", () => {
            image.src = fallbackImage;
        }, { once: true });

        container.appendChild(column);
    });
}

function renderPeopleGrid(container, people) {
    if (!container) return;
    container.replaceChildren();

    if (!people.length) {
        container.innerHTML = `
            <div class="col-12">
                <p class="text-muted">No people found.</p>
            </div>
        `;
        return;
    }

    people.forEach(person => {
        const column = document.createElement("div");
        column.className = "col";
        const poster = person.profile_path
            ? `${imageBaseUrl}${person.profile_path}`
            : fallbackImage;
        const name = person.name || "Unknown";
        column.innerHTML = `
            <article class="person-card card h-auto shadow-sm">
                <img
                    class="person-card__poster card-img-top"
                    src="${poster}"
                    alt="${name}"
                    loading="lazy"
                >
                <div class="person-card__body card-body">
                    <h3 class="person-card__title card-title h5">
                        ${name}
                    </h3>
                </div>
            </article>
        `;

        const image = column.querySelector("img");
        image.addEventListener("error", () => {
            image.src = fallbackImage;
        }, { once: true });

        container.appendChild(column);
    });
}

function getWatchlist() {
    try {
        return JSON.parse(localStorage.getItem("movieWatchlist")) || [];
    } catch (error) {
        console.error("Unable to read watchlist:", error);
        return [];
    }
}

function saveWatchlist(movies) {
    localStorage.setItem("movieWatchlist", JSON.stringify(movies));
}

function renderWatchlist() {
    const watchlist = getWatchlist();
    if (!elements.watchlistList) return;

    if (!watchlist.length) {
        elements.watchlistList.innerHTML = `
            <div class="col-12">
                <p class="text-muted">Your watchlist is empty.</p>
            </div>
        `;
        return;
    }

    renderMovieGrid(elements.watchlistList, watchlist);

    elements.watchlistList
        .querySelectorAll(".movie-card__watchlist-button")
        .forEach(button => {
            button.textContent = "Remove from Watchlist";
        });
}

document.addEventListener("click", event => {
    const button = event.target.closest(".movie-card__watchlist-button");
    if (!button) return;

    const movieId = Number(button.dataset.movieId);
    const watchlist = getWatchlist();
    const alreadySaved = watchlist.some(movie => movie.id === movieId);

    let updatedWatchlist;

    if (alreadySaved) {
        updatedWatchlist = watchlist.filter(movie => movie.id !== movieId);
    } else {
        const movieData = activeMoviesMap.get(movieId);
        if (!movieData) return;

        updatedWatchlist = [...watchlist, movieData];
    }

    saveWatchlist(updatedWatchlist);
    renderWatchlist();
});

async function searchMovies(query) {
    if (!query.trim()) return;

    try {
        const data = await tmdbFetch("/search/movie", {
            query: query.trim(),
            page: 1,
            include_adult: false
        });
        const results = data.results || [];
        results.forEach(m => activeMoviesMap.set(m.id, m));
        
        renderMovieGrid(elements.popularList, results);
        
        const heading = document.getElementById("popularHeading");
        if (heading) {
            heading.textContent = `Search Results: ${query.trim()}`;
        }
        document.getElementById("popular")?.scrollIntoView({
            behavior: "smooth"
        });
    } catch (error) {
        console.error("Movie search failed:", error);
        alert("Unable to search movies. Please try again.");
    }
}

if (elements.heroSearch) {
    elements.heroSearch.addEventListener("submit", event => {
        event.preventDefault();
        searchMovies(elements.heroInput.value);
    });
}

const navbarSearch = document.querySelector('header form[role="search"]');
if (navbarSearch) {
    navbarSearch.addEventListener("submit", event => {
        event.preventDefault();
        const input = navbarSearch.querySelector('input[type="search"]');
        if (input) {
            if (elements.heroInput) {
                elements.heroInput.value = input.value;
            }
            searchMovies(input.value);
        }
    });
}

function setActiveTab(selector, activeButton) {
    document.querySelectorAll(selector).forEach((button) => {
        const isActive = button === activeButton;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
}

async function init() {
    document.querySelectorAll("[data-period]").forEach((button) => {
        button.addEventListener("click", () => {
            const period = button.dataset.period;
            setActiveTab("[data-period]", button);
        });
    });
        
    try {
        const [trendingMovies, popularMovies, upcomingMovies, popularPeople] =
            await Promise.all([
                getTrendingMovies(),
                getPopularMovies(),
                getUpcomingMovies(),
                getPopularPeople()
            ]);
            
        renderMovieGrid(elements.trendingList, trendingMovies);
        renderMovieGrid(elements.popularList, popularMovies);
        renderMovieGrid(elements.trailerList, upcomingMovies);
        renderPeopleGrid(elements.popularPeopleList, popularPeople);

        renderWatchlist();

    } catch (error) {
        console.error("Error initializing Movie Explorer:", error);
    }
}

init();