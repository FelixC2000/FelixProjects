const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/database");

const router = express.Router();

// =====================================================
// REGISTER
// Public registration can ONLY create employee accounts.
// Users cannot choose their own role.
// =====================================================

router.post("/register", async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      department
    } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        message:
          "First name, last name, email, and password are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long."
      });
    }

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

    // Hash the password before storing it.
    const passwordHash = await bcrypt.hash(password, 12);

    // IMPORTANT:
    // The role is intentionally NOT taken from req.body.
    // Every user registered through this public endpoint
    // is automatically assigned the employee role.
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
        "employee",
        department || null
      ]
    );

    res.status(201).json({
      message: "User registered successfully.",
      user: result.rows[0]
    });

  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Failed to register user.",
      error: error.message
    });
  }
});


// =====================================================
// LOGIN
// =====================================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({
        message:
          "This account does not have a password configured."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    // Create JWT containing only the information
    // needed by the application.
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h"
      }
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Failed to login.",
      error: error.message
    });
  }
});


module.exports = router;
