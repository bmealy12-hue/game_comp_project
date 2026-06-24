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

async function fetchPrices(itadId) {
  try {
    const response = await fetch("http://localhost:3000/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itadId })
    });
    const data = await response.json();

    const deals = Array.isArray(data) ? data[0]?.deals : data?.deals;

    if (!Array.isArray(deals) || deals.length === 0) {
      return [{ store: "No deals found", price: "--" }];
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

const params = new URLSearchParams(window.location.search);
const gameId = params.get("id");

async function loadGameDetail() {
  const container = document.querySelector("#game-detail");

  if (!gameId) {
    container.innerHTML = "<p>No game specified.</p>";
    return;
  }

  const url = `https://api.rawg.io/api/games/${gameId}?key=${RAWG_KEY}`;
  const response = await fetch(url);
  const rawgGame = await response.json();

  const itadId = await lookupGameId(rawgGame.name);
  const prices = itadId
    ? await fetchPrices(itadId)
    : [{ store: "Not found on ITAD", price: "--" }];

  renderGameDetail(rawgGame, prices);
}

function renderGameDetail(game, prices) {
  const container = document.querySelector("#game-detail");

  const sortedPrices = [...prices].sort((a, b) => {
    const priceA = parseFloat(a.price.replace(/[^0-9.]/g, ""));
    const priceB = parseFloat(b.price.replace(/[^0-9.]/g, ""));
    return priceA - priceB;
  });

  const priceRows = sortedPrices
    .map(p => `
      <div class="detail-price-row">
        <span>${p.store}</span>
        <span>${p.price}</span>
      </div>
    `)
    .join("");

  container.innerHTML = `
    <img src="${game.background_image}" alt="${game.name}" class="detail-image">
    <h1>${game.name}</h1>
    <p class="detail-rating">★ ${game.rating} / 5</p>
    <div class="detail-prices">${priceRows}</div>
  `;
}

loadGameDetail();