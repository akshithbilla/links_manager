// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // to serve your HTML/CSS/JS

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected to Atlas"))
  .catch(err => console.error("MongoDB connection error:", err));


// Schema & model
const linkSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
  },
  { timestamps: true }
);

const Link = mongoose.model("Link", linkSchema);

// Routes

// GET all links
app.get("/api/links", async (req, res) => {
  try {
    const links = await Link.find().sort({ createdAt: -1 });
    res.json(links);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST create link
app.post("/api/links", async (req, res) => {
  try {
    const { name, url } = req.body;
    const newLink = await Link.create({ name, url });
    res.status(201).json(newLink);
  } catch (err) {
    res.status(400).json({ error: "Invalid data" });
  }
});

// PUT update link
app.put("/api/links/:id", async (req, res) => {
  try {
    const { name, url } = req.body;
    const updated = await Link.findByIdAndUpdate(
      req.params.id,
      { name, url },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Update failed" });
  }
});

// DELETE remove link
app.delete("/api/links/:id", async (req, res) => {
  try {
    await Link.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ error: "Delete failed" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
