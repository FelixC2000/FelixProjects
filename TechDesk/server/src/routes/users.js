const express = require("express");
const pool = require("../db/database");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, first_name, last_name, email, role, department, created_at FROM users ORDER BY id"
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);

    res.status(500).json({
      message: "Failed to fetch users.",
      error: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      role,
      department
    } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({
        message: "First name, last name, and email are required."
      });
    }

    const result = await pool.query(
      `INSERT INTO users (
        first_name,
        last_name,
        email,
        role,
        department
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, first_name, last_name, email, role, department, created_at`,
      [
        first_name,
        last_name,
        email,
        role || "employee",
        department || null
      ]
    );

    res.status(201).json({
      message: "User created successfully.",
      user: result.rows[0]
    });

  } catch (error) {
    console.error("Error creating user:", error);

    res.status(500).json({
      message: "Failed to create user.",
      error: error.message
    });
  }
});
module.exports = router;