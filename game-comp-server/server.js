const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

const ITAD_KEY = "4f85f7081a4e48e3326449f29b269588d1cd0ac1";

// Look up an ITAD game ID by title
app.post("/api/lookup", async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.json({ id: null });
  }

  const url = `https://api.isthereanydeal.com/lookup/id/title/v1?key=${ITAD_KEY}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([title])
    });

    const data = await response.json();
    console.log("ITAD raw response for", title, ":", data); 

    res.json({ id: data[title] || null });
  } catch (error) {
    console.error("Error fetching ITAD data:", error);
    res.json({ id: null });
  }
});

// Get prices for an ITAD game ID
app.post("/api/prices", async (req, res) => {
  const { itadId } = req.body;

  const url = `https://api.isthereanydeal.com/games/prices/v3?key=${ITAD_KEY}&country=GB`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([itadId])
  });

  const data = await response.json();
  res.json(data);
});

// Keywords that signal a deal isn't an actual video game.
// ITAD's deals feed includes software, training, and certification
// products alongside games - there's no clean field to separate them,
// so this is a pragmatic text-match filter we expand as new junk appears.
const NON_GAME_KEYWORDS = [
  "soundtrack", "ost", "dlc", "season pass", "expansion pass",
  "artbook", "art book", "demo", "playtest", "upgrade",
  "deluxe edition upgrade", "digital extras", "bonus content",
  "wallpaper", "cosmetic", "skin pack", "currency pack",
  "certificate", "certification", "exam", "course", "training",
  "tutorial", "aws", "azure", "comptia", "cisco", "microsoft office",
  "software license", "license key", "voucher", "gift card",
  "subscription", "vpn", "antivirus", "online tutor", "programming",
  "coding bootcamp", "masterclass", "e-learning", "elearning",
  "udemy", "coursera","tutoral", "skillshare", "linkedin learning", "pluralsight",
  "photoshop", "illustrator", "after effects", "premiere pro", "linux", "mobile app",
  "Deluxe", "bundle"
];

function isLikelyNotAGame(title) {
  const lowerTitle = title.toLowerCase();
  return NON_GAME_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
}

app.post("/api/deals", async (req, res) => {
  const desiredCount = Math.min(req.body?.count || 12, 60);
  const realGames = [];
  let offset = 0;
  const pageSize = 30;
  const maxPages = 5; // safety cap so a bad day on ITAD's end can't loop forever

  try {
    for (let page = 0; page < maxPages; page++) {
      const url = `https://api.isthereanydeal.com/deals/v2?key=${ITAD_KEY}&country=GB&limit=${pageSize}&offset=${offset}&sort=-cut`;
      const response = await fetch(url);
      const data = await response.json();

      const batch = data.list || [];
      if (batch.length === 0) break; // ITAD has nothing left to give us

      const filtered = batch.filter(deal => !isLikelyNotAGame(deal.title));
      realGames.push(...filtered);

      if (realGames.length >= desiredCount) break;

      offset += pageSize;
    }

    res.json({ list: realGames.slice(0, desiredCount) });
  } catch (error) {
    console.error("Error fetching ITAD deals:", error);
    res.status(500).json({ error: "Failed to fetch deals" });
  }
});


app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});