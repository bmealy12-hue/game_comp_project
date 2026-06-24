const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

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

app.post("/api/deals", async (req, res) => {
  const url = `https://api.isthereanydeal.com/deals/v2?key=${ITAD_KEY}&country=GB&limit=6&sort=-cut`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching ITAD deals:", error);
    res.status(500).json({ error: "Failed to fetch deals" });
  }
});


app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

