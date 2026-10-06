const express = require("express");
const pool = require("../db/database");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticateToken);

// Get all assets
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          assets.id,
          assets.asset_tag,
          assets.asset_type,
          assets.manufacturer,
          assets.model,
          assets.serial_number,
          assets.operating_system,
          assets.status,

          users.first_name,
          users.last_name,
          users.email

       FROM assets

       LEFT JOIN users
          ON assets.assigned_user_id = users.id

       ORDER BY assets.id DESC`
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Error fetching assets:", error);

    res.status(500).json({
      message: "Failed to fetch assets.",
      error: error.message
    });
  }
});

// Create a new asset
router.post("/", async (req, res) => {
  try {
    const {
      asset_tag,
      asset_type,
      manufacturer,
      model,
      serial_number,
      operating_system,
      status,
      assigned_user_id
    } = req.body;

    if (!asset_tag || !asset_type) {
      return res.status(400).json({
        message: "Asset tag and asset type are required."
      });
    }

    const result = await pool.query(
      `INSERT INTO assets (
          asset_tag,
          asset_type,
          manufacturer,
          model,
          serial_number,
          operating_system,
          status,
          assigned_user_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        asset_tag,
        asset_type,
        manufacturer || null,
        model || null,
        serial_number || null,
        operating_system || null,
        status || "active",
        assigned_user_id || null
      ]
    );

    res.status(201).json({
      message: "Asset created successfully.",
      asset: result.rows[0]
    });

  } catch (error) {
    console.error("Error creating asset:", error);

    res.status(500).json({
      message: "Failed to create asset.",
      error: error.message
    });
  }
});

module.exports = router;