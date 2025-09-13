import express from "express";
import bodyParser from "body-parser";
import puppeteer from "puppeteer";
import tool1 from "./tool1.js";

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

let tool1Instance = null;

app.post("/start-tool1", async (req, res) => {
  const { authToken, itemId, priceThreshold } = req.body;

  if (!authToken || !itemId || !priceThreshold) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  console.log("Received request to start Tool1:", req.body);
  res.json({ status: "Starting Tool1..." });

  try {
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();

    // Go to Rollercoin homepage
    await page.goto("https://rollercoin.com", { waitUntil: "networkidle2" });

    // Set localStorage token
    await page.evaluate((token) => {
      localStorage.setItem("token", token);
    }, authToken);
    console.log("Set auth token in localStorage.");

    // Navigate to marketplace/buy to generate x-csrf cookie
    await page.goto("https://rollercoin.com/marketplace/buy", { waitUntil: "networkidle2" });

    // Wait for x-csrf cookie
    let csrfCookie;
    for (let i = 0; i < 20; i++) {
      const cookies = await page.cookies();
      csrfCookie = cookies.find(c => c.name === "x-csrf");
      if (csrfCookie) break;
      await new Promise(r => setTimeout(r, 500));
    }

    if (!csrfCookie) {
      console.error("CSRF token not found");
      await browser.close();
      return;
    }

    console.log("CSRF token:", csrfCookie.value);

    // Run Tool1 and keep reference for stopping
    tool1Instance = tool1;
    tool1.action({
      authToken,
      csrfToken: csrfCookie.value,
      itemId,
      priceThreshold,
      page
    });

  } catch (err) {
    console.error("Error starting Tool1:", err);
  }
});

app.post("/stop-tool1", (req, res) => {
  if (tool1Instance && typeof tool1Instance.stop === "function") {
    tool1Instance.stop();
    tool1Instance = null;
    res.json({ status: "Tool1 stopped." });
  } else {
    res.status(400).json({ error: "Tool1 is not running." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
