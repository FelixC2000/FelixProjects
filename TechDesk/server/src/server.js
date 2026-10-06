const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.get("/", (req, res) => {
  res.json({
    message: "TechDesk API is running!",
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "PostgreSQL connection successful!",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      message: "Database connection failed.",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5432;

app.listen(PORT, () => {
  console.log(`TechDesk server running on http://localhost:${PORT}`);
});