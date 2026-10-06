const express = require("express");
const pool = require("../db/database");
const { authenticateToken } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

const router = express.Router();

// All audit-log routes require authentication
router.use(authenticateToken);

// =====================================================
// GET ALL AUDIT LOGS
// =====================================================
router.get(
  "/",
  requireRole("technician", "admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
            al.id,
            al.user_id,
            u.first_name,
            u.last_name,
            u.email,
            al.action,
            al.entity_type,
            al.entity_id,
            al.details,
            al.created_at
         FROM audit_logs al
         LEFT JOIN users u
           ON al.user_id = u.id
         ORDER BY al.created_at DESC`
      );

      res.json(result.rows);

    } catch (error) {
      console.error("Error fetching audit logs:", error);

      res.status(500).json({
        message: "Failed to fetch audit logs.",
        error: error.message
      });
    }
  }
);

// =====================================================
// GET AUDIT LOG BY ID
// =====================================================
router.get(
  "/:id",
  requireRole("technician", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT
            al.id,
            al.user_id,
            u.first_name,
            u.last_name,
            u.email,
            al.action,
            al.entity_type,
            al.entity_id,
            al.details,
            al.created_at
         FROM audit_logs al
         LEFT JOIN users u
           ON al.user_id = u.id
         WHERE al.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Audit log not found."
        });
      }

      res.json(result.rows[0]);

    } catch (error) {
      console.error("Error fetching audit log:", error);

      res.status(500).json({
        message: "Failed to fetch audit log.",
        error: error.message
      });
    }
  }
);

// =====================================================
// CREATE AUDIT LOG
// =====================================================
router.post(
  "/",
  requireRole("technician", "admin"),
  async (req, res) => {
    try {
      const {
        action,
        entity_type,
        entity_id,
        details
      } = req.body;

      if (!action) {
        return res.status(400).json({
          message: "Action is required."
        });
      }

      const result = await pool.query(
        `INSERT INTO audit_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            details
         )
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          req.user.userId,
          action,
          entity_type || null,
          entity_id || null,
          details || null
        ]
      );

      res.status(201).json({
        message: "Audit log created successfully.",
        auditLog: result.rows[0]
      });

    } catch (error) {
      console.error("Error creating audit log:", error);

      res.status(500).json({
        message: "Failed to create audit log.",
        error: error.message
      });
    }
  }
);

module.exports = router;
