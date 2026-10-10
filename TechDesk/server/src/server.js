
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

// Validate required database environment variables.
const requiredDbVariables = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
];

const missingDbVariables = requiredDbVariables.filter(
  (variable) => !process.env[variable]
);

if (missingDbVariables.length > 0) {
  console.error(
    `Missing required environment variables: ${missingDbVariables.join(", ")}`
  );
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("Missing required environment variable: JWT_SECRET");
  process.exit(1);
}

// PostgreSQL connection pool.
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

// Handle errors from idle database connections.
pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

// Middleware.
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health check.
app.get("/", (req, res) => {
  res.status(200).json({
    message: "TechDesk API is running!",
    status: "ok",
  });
});

// Database connection check.
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");

    res.status(200).json({
      message: "PostgreSQL connection successful!",
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      message: "Database connection failed.",
    });
  }
});

// Authentication check.
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.status(200).json({
    message: "You are authenticated.",
    user: req.user,
  });
});

// API routes.
app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/troubleshooting", troubleshootingRouter);
app.use("/api/history", historyRouter);
app.use("/api/auth", authRouter);
app.use("/api/audit", auditRouter);

// Handle unknown routes.
app.use((req, res) => {
  res.status(404).json({
    message: "Endpoint not found.",
  });
});

// Central error handler.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error("Unhandled server error:", error.message);

  const status =
    Number.isInteger(error.status) &&
    error.status >= 400 &&
    error.status < 600
      ? error.status
      : 500;

  res.status(status).json({
    message:
      status < 500 ? error.message : "Internal server error.",
  });
});

// Render assigns PORT automatically.
const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`TechDesk server listening on port ${PORT}`);
});

// Graceful shutdown.
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received. Shutting down TechDesk...`);

  // Force shutdown if the server does not close in time.
  const forceShutdown = setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, 10000);

  forceShutdown.unref();

  server.close(async (serverError) => {
    try {
      await pool.end();

      if (serverError) {
        throw serverError;
      }

      console.log("HTTP server and database pool closed.");
      clearTimeout(forceShutdown);
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error.message);
      clearTimeout(forceShutdown);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));