// server.js (Express example)
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let tokens = {
  authToken: "",
  csrfToken: "",
  updatedAt: null
};

app.post("/update-tokens", (req, res) => {
  const { authToken, csrfToken } = req.body;
  if (!authToken || !csrfToken) {
    return res.status(400).json({ error: "Missing tokens" });
  }
  tokens = { authToken, csrfToken, updatedAt: new Date() };
  console.log("Tokens updated:", tokens);
  res.json({ success: true });
});

app.get("/tokens", (req, res) => {
  res.json(tokens);
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Server running on port ${port}`));
