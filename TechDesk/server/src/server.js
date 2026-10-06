const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { authenticateToken } = require("./middleware/authMiddleware");
require("dotenv").config();

const usersRouter = require("./routes/users");
const ticketsRouter = require("./routes/tickets");
const assetsRouter = require("./routes/assets");
const commentsRouter = require("./routes/comments");
const troubleshootingRouter = require("./routes/troubleshooting");
const historyRouter = require("./routes/history");
const authRouter = require("./routes/auth");


const app = express();

app.use(cors());
app.use(express.json());




app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/troubleshooting", troubleshootingRouter);
app.use("/api/history", historyRouter);
app.use("/api/auth", authRouter);

app.get("/", (req, res) => {
  res.json({
    message: "TechDesk API is running!",
  });
});

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

const PORT = process.env.PORT || 5000;

app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({
    message: "You are authenticated.",
    user: req.user
  });
});

app.listen(PORT, () => {
  console.log(`TechDesk server running on http://localhost:${PORT}`);
});