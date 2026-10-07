const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db/database");

const { authenticateToken } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

const router = express.Router();

// =====================================================
// GET ALL USERS
// Only admins can view the complete user list.
// =====================================================

router.get(
  "/",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
          id,
          first_name,
          last_name,
          email,
          role,
          department,
          created_at
        FROM users
        ORDER BY id`
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching users:", error);

      res.status(500).json({
        message: "Failed to fetch users.",
        error: error.message,
      });
    }
  }
);


// =====================================================
// CREATE USER
// Only admins can create users.
// Admins can create employee or technician accounts.
// =====================================================

router.post(
  "/",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const {
        first_name,
        last_name,
        email,
        password,
        role,
        department
      } = req.body;

      // Required fields
      if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({
          message:
            "First name, last name, email, and password are required."
        });
      }

      // Password validation
      if (password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters long."
        });
      }

      // Only these roles can be created through this endpoint.
      // Admin accounts must be created separately.
      const allowedRoles = ["employee", "technician"];

      const selectedRole = role || "employee";

      if (!allowedRoles.includes(selectedRole)) {
        return res.status(400).json({
          message:
            "Invalid role. Admin accounts cannot be created through this endpoint.",
          valid_roles: allowedRoles
        });
      }

      // Check if email already exists
      const existingUser = await pool.query(
        `SELECT id
         FROM users
         WHERE email = $1`,
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          message: "A user with this email already exists."
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const result = await pool.query(
        `INSERT INTO users (
          first_name,
          last_name,
          email,
          password_hash,
          role,
          department
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          first_name,
          last_name,
          email,
          role,
          department,
          created_at`,
        [
          first_name,
          last_name,
          email,
          passwordHash,
          selectedRole,
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
  }
);


module.exports = router;