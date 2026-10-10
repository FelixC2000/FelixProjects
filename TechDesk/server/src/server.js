
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const { authenticateToken } = require("./middleware/authMiddleware");

const usersRouter = require("./routes/users");
const ticketsRouter = require("./routes/tickets");
const assetsRouter = require("./routes/assets");
const commentsRouter = require("./routes/comments");
const troubleshootingRouter = require("./routes/troubleshooting");
const historyRouter = require("./routes/history");
const authRouter = require("./routes/auth");
const auditRouter = require("./routes/audit");

const app = express();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "TechDesk API is running!",
  });
});

// Database connection check
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "PostgreSQL connection successful!",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      message: "Database connection failed.",
    });
  }
});

// Authentication check
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({
    message: "You are authenticated.",
    user: req.user,
  });
});

// API routes
app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/troubleshooting", troubleshootingRouter);
app.use("/api/history", historyRouter);
app.use("/api/auth", authRouter);
app.use("/api/audit", auditRouter);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: "Endpoint not found.",
  });
});

// Central error handler
app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.status || 500).json({
    message:
      error.status && error.status < 500
        ? error.message
        : "Internal server error.",
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`TechDesk server running on http://localhost:${PORT}`);
});

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down TechDesk server...");

  server.close(async () => {
    try {
      await pool.end();
      console.log("Database connection pool closed.");
      process.exit(0);
    } catch (error) {
      console.error("Error closing database pool:", error.message);
      process.exit(1);
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);