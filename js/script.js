const searchCache = {};

const genreSlugs = {
  "Action":   "action",
  "RPG":      "role-playing-games-rpg",
  "Strategy": "strategy",
  "Indie":    "indie"
};

const platformIds = {
  "PC":               "4",
  "PlayStation":      "18,187",
  "Xbox":             "1,186",
  "Nintendo Switch":  "7"
};

function applyRawgFilters(url, genre, platform) {
  const u = new URL(url);
  if (genre !== "All" && genreSlugs[genre])   u.searchParams.set("genres",    genreSlugs[genre]);
  if (platform !== "All" && platformIds[platform]) u.searchParams.set("platforms", platformIds[platform]);
  return u.toString();
}

async function lookupGameId(title) {
  try {
    const response = await fetch("http://localhost:3000/api/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    const data = await response.json();
    return data.id || null;
  } catch (error) {
    console.error("Price server unreachable:", error);
    return null;
  }
}

function parsePriceNumber(priceText) {
  if (!priceText || typeof priceText !== 'string') return null;

  // Remove currency symbols and commas
  const cleanedText = priceText
    .replace(/[^0-9.]/g, '') // Remove all non-numeric and non-dot characters
    .replace(/,+/g, ''); // Remove commas if any

  // Check if cleanedText has multiple dots, invalid number
  const dotCount = (cleanedText.match(/\./g) || []).length;
  if (dotCount > 1) return null;

  const numeric = parseFloat(cleanedText);
  return Number.isFinite(numeric) ? numeric : null;
}

async function fetchPrices(itadId) {
  try {
    const response = await fetch("http://localhost:3000/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itadId })
    });
    const data = await response.json();

    const deals = Array.isArray(data)
      ? data[0]?.deals
      : data?.deals;

    if (!Array.isArray(deals) || deals.length === 0) {
      return [{ store: "No Deals Found", price: "--" }];
    }

    return deals.map(deal => ({
      store: deal.shop?.name || deal.store || "Unknown store",
      price: `£${Number(deal.price?.amount ?? deal.price ?? 0).toFixed(2)}`
    }));
  } catch (error) {
    console.error("Price fetch failed:", error);
    return [{ store: "Error", price: "--" }];
  }
}


function pageSize() {
  return localStorage.getItem("compactView") === "true" ? 15 : 12;
}

async function fetchGames(searchTerm) {
  if (searchCache[searchTerm]) {
    return searchCache[searchTerm];
  }

  const url = `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${searchTerm}&page_size=${pageSize()}`;

  const response = await fetch(url);
  const data = await response.json();

  const formattedGames = await Promise.all(
    data.results.map(game => formatGame(game))
  );

  searchCache[searchTerm] = formattedGames;
  return formattedGames;
}

// Convert the RAWG API game object into our internal format
async function formatGame(rawgGame) {
  const itadId = await lookupGameId(rawgGame.name);

  const prices = itadId
    ? await fetchPrices(itadId)
    : [{ store: "Not found on ITAD", price: "--" }];

  return {
    title: rawgGame.name,
    image: rawgGame.background_image || "https://placehold.co/300x160/1a1a2e/ffffff?text=No+Image",
    rating: rawgGame.rating ? rawgGame.rating.toFixed(1) : "N/A",
    genres: rawgGame.genres.map(g => g.name),
    platforms: rawgGame.platforms
      ? rawgGame.platforms.map(p => p.platform.name)
      : [],
    prices: prices,
    bestDeal: prices[0] ? prices[0].store : "Unknown",
    rawgId: rawgGame.id 
  };
}

function debounce(func, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

let selectedGenre = "All";
let selectedPlatform = "All";
let searchText = "";
let selectedSort = "default";
let currentTab = "hot";
let currentResults = [];
let currentDiscoveryResults = [];


// Render the game cards in the grid
function createGameCard(game) {
  const lowestPrice = getLowestPrice(game);

  // Build the price tags, highlighting the lowest price
  const priceTags = [...game.prices]
    .sort((a, b) => parsePriceNumber(a.price) - parsePriceNumber(b.price))
    .slice(0, 3)
    .map(p => {
      const numericPrice = parsePriceNumber(p.price);
      const isLowest = numericPrice !== null && numericPrice === lowestPrice;
      const className = isLowest ? "price-tag price-best" : "price-tag";
      return `<span class="${className}">${p.store} ${p.price}</span>`;
    })
    .join("");

    // Build the genre tags
  const genreTags = game.genres
    .map(g => `<span class="genre-tag">${g}</span>`)
    .join("");

  const stars = "★".repeat(Math.round(game.rating / 1));
  const showRatings = localStorage.getItem("showRatings") !== "false";

  // Build the HTML for the game card
  return `
  <a href="game.html?id=${game.rawgId}" class="card-link">
    <div class="card">
      <img src="${game.image}" alt="${game.title}">
      <div class="card-body">
        <h2>${game.title}</h2>
        <div class="genre-tags">${genreTags}</div>
        ${showRatings ? `<div class="rating">${stars} <span>${game.rating}/5</span></div>` : ""}
        <div class="prices">${priceTags}</div>
        <span class="best-deal">Best deal: ${game.bestDeal}</span>
      </div>
    </div>
  </a>
  `;
}

// Render the list of games in the grid
function renderGames(gameList) {
  const grid = document.querySelector("#card-grid");

  if (gameList.length === 0) {
    if (searchText.trim() === "") {
      grid.innerHTML = "";
    } else {
      grid.innerHTML = `
        <p class="no-results">
          No results found. Try a different search or adjust your filters.
        </p>
      `;
    }
    return;
  }

  // Build HTML for every game and join into a single string
  const allCardsHTML =gameList.map(createGameCard).join("");
  grid.innerHTML = allCardsHTML;
}

async function fetchHotPicks(genre = "All", platform = "All") {
  const url = applyRawgFilters(
    `https://api.rawg.io/api/games?key=${RAWG_KEY}&ordering=-added&dates=2025-01-01,2026-12-31&page_size=${pageSize()}`,
    genre, platform
  );
  const response = await fetch(url);
  const data = await response.json();
  return Promise.all(data.results.map(game => formatGame(game)));
}

async function fetchTopRated(genre = "All", platform = "All") {
  const url = applyRawgFilters(
    `https://api.rawg.io/api/games?key=${RAWG_KEY}&ordering=-rating&page_size=${pageSize()}`,
    genre, platform
  );
  const response = await fetch(url);
  const data = await response.json();
  return Promise.all(data.results.map(game => formatGame(game)));
}

// Upcoming games have no real price yet, so this skips the ITAD lookup/price
// pipeline entirely (it would just waste 2 network calls per game for nothing)
// and builds the card shape directly with a placeholder price.
async function fetchUpcomingGames(genre = "All", platform = "All") {
  const today = new Date().toISOString().split("T")[0];
  const oneYearOut = new Date();
  oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
  const futureDate = oneYearOut.toISOString().split("T")[0];

  const url = applyRawgFilters(
    `https://api.rawg.io/api/games?key=${RAWG_KEY}&dates=${today},${futureDate}&ordering=-added&page_size=${pageSize()}`,
    genre, platform
  );
  const response = await fetch(url);
  const data = await response.json();

  return data.results.map(rawgGame => ({
    title: rawgGame.name,
    image: rawgGame.background_image || "https://placehold.co/300x160/1a1a2e/ffffff?text=No+Image",
    rating: rawgGame.rating ? rawgGame.rating.toFixed(1) : "N/A",
    genres: rawgGame.genres.map(g => g.name),
    platforms: rawgGame.platforms ? rawgGame.platforms.map(p => p.platform.name) : [],
    prices: [{ store: "Releases", price: rawgGame.released || "TBA" }],
    bestDeal: "Not yet released",
    rawgId: rawgGame.id
  }));
}

// When the deals tab has an active genre/platform filter, start from the ITAD
// deals feed (which always has real prices), then enrich each deal with a
// RAWG search to get genre/platform data, then filter. This guarantees prices
// are always present — unlike going RAWG-first and hoping ITAD has an entry.
async function fetchDealsWithGenreFilter(genre, platform) {
  const deals = await fetchSpecialDeals(48);

  const enriched = await Promise.all(deals.map(async deal => {
    try {
      const url = `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(deal.title)}&page_size=1`;
      const res = await fetch(url);
      const data = await res.json();
      const match = data.results?.[0];
      return {
        ...deal,
        genres:    match?.genres?.map(g => g.name)             ?? [],
        platforms: match?.platforms?.map(p => p.platform.name) ?? []
      };
    } catch {
      return deal;
    }
  }));

  let filtered = enriched;
  if (genre    !== "All") filtered = filtered.filter(d => d.genres.includes(genre));
  if (platform !== "All") filtered = filtered.filter(d => d.platforms.some(p => p.includes(platform)));

  const results = filtered.length > 0 ? filtered : deals;
  return results.slice(0, pageSize());
}

// Filtering for non-game deals (DLC, certifications, training courses, etc.)
// now happens server-side in /api/deals, which pages through ITAD's results
// until it has 12 real games - so this just formats what comes back.
async function fetchSpecialDeals(count = 12) {
  try {
    const response = await fetch("http://localhost:3000/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count })
    });
    const data = await response.json();

    return data.list.map(deal => ({
      title: deal.title,
      image: deal.assets?.boxart || deal.assets?.banner145 || "https://placehold.co/300x160/1a1a2e/ffffff?text=No+Image",
      rating: "N/A",
      genres: [],
      platforms: [],
      prices: [
        { store: deal.deal.shop.name, price: `£${deal.deal.price.amount.toFixed(2)}` },
        { store: "Was", price: `£${deal.deal.regular.amount.toFixed(2)}` }
      ],
      bestDeal: `${deal.deal.cut}% off`,
      rawgId: null
    }));
  } catch (error) {
    console.error("Special deals fetch failed:", error);
    return [];
  }
}

renderGames([]);


async function loadDiscoverySection(tab) {
  const grid = document.querySelector("#discovery-grid");
  grid.innerHTML = "<p>Loading...</p>";
  currentTab = tab;

  const g = selectedGenre;
  const p = selectedPlatform;

  try {
    let games;

    if (tab === "hot")             games = await fetchHotPicks(g, p);
    else if (tab === "top-rated")  games = await fetchTopRated(g, p);
    else if (tab === "upcoming")   games = await fetchUpcomingGames(g, p);
    else if (tab === "deals") {
      games = (g !== "All" || p !== "All")
        ? await fetchDealsWithGenreFilter(g, p)
        : await fetchSpecialDeals();
    }

    currentDiscoveryResults = games || [];
    applyFilters();
  } catch (err) {
    console.error("Failed to load section:", err);
    grid.innerHTML = "<p class='no-results'>Failed to load games. Try refreshing.</p>";
  }
}

document.querySelectorAll(".discovery-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".discovery-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    loadDiscoverySection(tab.dataset.tab);
  });
});

loadDiscoverySection("hot");


function filterAndSort(games) {
  let filtered = games;

  if (selectedGenre !== "All") {
    filtered = filtered.filter(game => game.genres.includes(selectedGenre));
  }

  if (selectedPlatform !== "All") {
    filtered = filtered.filter(game =>
      game.platforms.some(p => p.includes(selectedPlatform))
    );
  }

  let sorted = [...filtered];

  if (selectedSort === "price-low") {
    sorted.sort((a, b) => getLowestPrice(a) - getLowestPrice(b));
  } else if (selectedSort === "price-high") {
    sorted.sort((a, b) => getLowestPrice(b) - getLowestPrice(a));
  } else if (selectedSort === "rating-high") {
    sorted.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
  }

  return sorted;
}

function applyFilters() {
  if (searchText.trim() !== "") {
    const textFiltered = currentResults.filter(game =>
      game.title.toLowerCase().includes(searchText.toLowerCase())
    );
    renderGames(filterAndSort(textFiltered));
  } else {
    const sorted = filterAndSort(currentDiscoveryResults);
    const grid = document.querySelector("#discovery-grid");
    const filtersActive = selectedGenre !== "All" || selectedPlatform !== "All";
    grid.innerHTML = sorted.length
      ? sorted.map(createGameCard).join("")
      : filtersActive
        ? "<p class='no-results'>No games match your filters.</p>"
        : "<p class='no-results'>Failed to load games. Try refreshing.</p>";
  }
}

function getLowestPrice(game) {
  const values = game.prices
    .map(p => parsePriceNumber(p.price))
    .filter(v => v !== null);

  return values.length ? Math.min(...values) : Infinity;
}

function cleanSearchTerm(text) {
  return text 
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .trim();
}

// Find every dropdown button on the page
document.querySelectorAll('.dropdown-btn').forEach(btn => {

  btn.addEventListener('click', () => {
    const menu = btn.nextElementSibling;
    menu.classList.toggle('open');
  });

});

// Click anywhere else to close any open dropdown
document.addEventListener('click', (e) => {
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    if (!menu.parentElement.contains(e.target)) {
      menu.classList.remove('open');
    }
  });
});

// Clicking an item: update the label, close the menu
document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    const dropdown = item.closest('.dropdown');
    const label = dropdown.querySelector('.dropdown-label');
    const isGenre = label.closest('.dropdown-btn').textContent.includes('Genre');

    // Update the visible label and close the menu
    label.textContent = item.textContent;
    dropdown.querySelector('.dropdown-menu').classList.remove('open');

    // Update the right tracking variable
    if (isGenre) {
      selectedGenre = item.textContent;
    } else {
      selectedPlatform = item.textContent;
    }

    // Genre/platform change: re-fetch from API with the new filter applied.
    // Sort stays client-side so no re-fetch needed there.
    if (searchText.trim() !== "") {
      applyFilters();
    } else {
      loadDiscoverySection(currentTab);
    }
  });
});

// Handle search input
const searchInput = document.querySelector(".search");

if (!searchInput) {
  console.error("Search input element not found: .search");
}

const performSearch = debounce(async () => {
  searchText = searchInput.value;
  const discoverySection = document.querySelector(".discovery-section");

  if (searchText.trim() === "") {
    currentResults = [];
    renderGames([]);
    discoverySection.style.display = "block";
    applyFilters();
    return;
  }

  discoverySection.style.display = "none";

  const grid = document.querySelector("#card-grid");
  grid.innerHTML = "<p>Loading...</p>";

  try {
    currentResults = await fetchGames(cleanSearchTerm(searchText));
    applyFilters();
  } catch (error) {
    grid.innerHTML = "<p>Something went wrong. Is your server running?</p>";
    console.error(error);
  }
}, 400);

searchInput.addEventListener("input", performSearch);

const sortSelect = document.querySelector("#sort-select");

// Handle sorting changes
sortSelect.addEventListener("change", () => {
  selectedSort = sortSelect.value;
  applyFilters();
});

async function updateNavbarAuth() {
  const { data } = await supabaseClient.auth.getUser();
  const authContainer = document.querySelector("#navbar-auth");

  if (data.user) {
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("username, avatar")
      .eq("id", data.user.id)
      .single();

    const displayAvatar = profile?.avatar ?? "👤";
    const displayName = profile?.username ?? data.user.email;

    authContainer.innerHTML = `
      <div class="user-menu">
        <button class="user-menu-trigger" id="user-menu-trigger">
          <span class="user-avatar">${displayAvatar}</span>
          <span class="user-name">${displayName}</span>
          <span class="menu-caret">▾</span>
        </button>
        <div class="user-dropdown" id="user-dropdown">
          <a href="account.html" class="user-dropdown-item">Account</a>
          <a href="settings.html" class="user-dropdown-item">Settings</a>
          <button class="user-dropdown-item user-dropdown-danger" id="logout-btn">Log out</button>
        </div>
      </div>
    `;

    document.querySelector("#user-menu-trigger").addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelector("#user-dropdown").classList.toggle("open");
    });

    document.addEventListener("click", () => {
      const dropdown = document.querySelector("#user-dropdown");
      if (dropdown) dropdown.classList.remove("open");
    });

    document.querySelector("#logout-btn").addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      window.location.reload();
    });
  }
}

function applyPageSettings() {
  if (localStorage.getItem("compactView") === "true") {
    document.querySelectorAll(".card-grid").forEach(g => g.classList.add("compact-grid"));
  }
}

updateNavbarAuth();
applyPageSettings();