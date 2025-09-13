import express from "express";
import bodyParser from "body-parser";
import Tool1 from "./tool1.js";

const app = express();
app.use(bodyParser.json());

let toolInstance = null;

app.post("/start-tool1", (req, res) => {
  const { itemId, priceThreshold, authToken, csrfToken } = req.body;
  if (!authToken || !csrfToken || !itemId || !priceThreshold) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  if (toolInstance) {
    toolInstance.stop();
  }

  toolInstance = Tool1.action({ itemId, priceThreshold, authToken, csrfToken });
  res.json({ status: "Tool1 started" });
});

app.post("/stop-tool1", (req, res) => {
  if (toolInstance) {
    toolInstance.stop();
    toolInstance = null;
    return res.json({ status: "Tool1 stopped" });
  }
  res.json({ status: "Tool1 was not running" });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running...");
});
