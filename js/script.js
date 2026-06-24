


const searchCache = {};

async function lookupGameId(title) {
  try {
    const response = await fetch("http://localhost:3000/api/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    const data = await response.json();
    console.log("looking up:", title, "> got back:", data);
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
    console.log("Price data received:", data);

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


async function fetchGames(searchTerm) {
  if (searchCache[searchTerm]) {
    return searchCache[searchTerm];
  }

  const url = `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${searchTerm}&page_size=12`;

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
let currentResults = [];


// Render the game cards in the grid
function createGameCard(game) {
  const lowestPrice = getLowestPrice(game);

  // Build the price tags, highlighting the lowest price
  const priceTags = game.prices
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

  const stars = "★".repeat(Math.round(game.rating / 2));

  // Build the HTML for the game card
  return `
  <a href="game.html?id=${game.rawgId}" class="card-link">
    <div class="card">
      <img src="${game.image}" alt="${game.title}">
      <div class="card-body">
        <h2>${game.title}</h2>
        <div class="genre-tags">${genreTags}</div>
        <div class="rating">${stars} <span>${game.rating}/10</span></div>
        <div class="prices">${priceTags}</div>
        <span class="best-deal">Best deal: ${game.bestDeal}</span>
      </div>
    </div>
  `;
}

// Render the list of games in the grid
function renderGames(gameList) {
  const grid = document.querySelector("#card-grid");

  if (gameList.length === 0) {
    grid.innerHTML = `
      <p class="no-results">
        No results found. Try a different search or adjust your filters.
      </p>
    `;
    return;
  }

  // Build HTML for every game and join into a single string
  const allCardsHTML =gameList.map(createGameCard).join("");
  grid.innerHTML = allCardsHTML;
}

// run it once the page has loaded
renderGames([]);


// Apply the selected filters and sorting to the current results
function applyFilters() {
  let filtered = currentResults;

  if (selectedGenre !== "All") {
    filtered = filtered.filter(game => game.genres.includes(selectedGenre));
  }

  if (selectedPlatform !== "All") {
  filtered = filtered.filter(game =>
    game.platforms.some(p => p.includes(selectedPlatform))
  );
}

  if (searchText !== "") {
    filtered = filtered.filter(game =>
      game.title.toLowerCase().includes(searchText.toLowerCase())
    );
  }

  let sorted = [...filtered]; // Create a copy for sorting

  if (selectedSort === "price-low") {
    sorted.sort((a, b) => getLowestPrice(a) - getLowestPrice(b));
  } else if (selectedSort === "price-high") {
    sorted.sort((a, b) => getLowestPrice(b) - getLowestPrice(a));
  } else if (selectedSort === "rating-high") {
    sorted.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
  }

  renderGames(sorted);
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

    applyFilters();
  });
});

// Handle search input
const searchInput = document.querySelector(".search");

if (!searchInput) {
  console.error("Search input element not found: .search");
}

const performSearch = debounce(async () => {
  searchText = searchInput.value;

  if (searchText.trim() === "") {
    currentResults = [];
    renderGames([]);
    return;
  }

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
    const email = data.user.email;
    const initials = email.slice(0, 2).toUpperCase();

    authContainer.innerHTML = `
      <div class="user-menu">
        <div class="user-avatar">${initials}</div>
        <span class="user-email">${email}</span>
        <button id="logout-btn">Log out</button>
      </div>
    `;

    document.querySelector("#logout-btn").addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      window.location.reload();
    });
  }
}

updateNavbarAuth();

