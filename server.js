// server.js
import express from "express";
import cors from "cors";
import Tool1 from "./tool1.js"; // your Tool1 module

const app = express();
app.use(cors());
app.use(express.json());

let currentToken = null;
let tool1InstanceRunning = false;

app.post("/login", (req, res) => {
  const { authToken, csrfToken } = req.body;
  if (!authToken || !csrfToken) return res.status(400).send({ error: "Missing tokens" });

  currentToken = { authToken, csrfToken };
  
  if (!tool1InstanceRunning) {
    tool1InstanceRunning = true;
    Tool1.action({
      itemId: "61b3606767433d2dc58913a9", // example ID
      priceThreshold: 1700,
      authToken: currentToken.authToken,
      csrfToken: currentToken.csrfToken
    });
  }

  res.send({ success: true });
});

app.listen(process.env.PORT || 3000, () => console.log("Server running"));
