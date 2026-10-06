const express = require("express");
const pool = require("../db/database");
const { authenticateToken } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

const router = express.Router();

// All troubleshooting routes require authentication
router.use(authenticateToken);

// =====================================================
// GET TROUBLESHOOTING STEPS FOR A TICKET
// Authenticated users
// =====================================================

router.get("/ticket/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;

    const result = await pool.query(
      `SELECT
          id,
          ticket_id,
          step_number,
          description,
          result,
          completed,
          created_at
       FROM troubleshooting_steps
       WHERE ticket_id = $1
       ORDER BY step_number ASC`,
      [ticketId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Error fetching troubleshooting steps:", error);

    res.status(500).json({
      message: "Failed to fetch troubleshooting steps.",
      error: error.message
    });
  }
});

// =====================================================
// ADD TROUBLESHOOTING STEP
// Technician/Admin only
// =====================================================

router.post(
  "/",
  requireRole("technician", "admin"),
  async (req, res) => {
    try {
      const {
        ticket_id,
        step_number,
        description,
        result,
        completed
      } = req.body;

      if (!ticket_id || !step_number || !description) {
        return res.status(400).json({
          message: "Ticket ID, step number, and description are required."
        });
      }

      // Make sure the ticket exists
      const ticketResult = await pool.query(
        `SELECT id
         FROM tickets
         WHERE id = $1`,
        [ticket_id]
      );

      if (ticketResult.rows.length === 0) {
        return res.status(404).json({
          message: "Ticket not found."
        });
      }

      const newStep = await pool.query(
        `INSERT INTO troubleshooting_steps (
            ticket_id,
            step_number,
            description,
            result,
            completed
         )
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          ticket_id,
          step_number,
          description,
          result || null,
          completed || false
        ]
      );

      res.status(201).json({
        message: "Troubleshooting step added successfully.",
        step: newStep.rows[0]
      });

    } catch (error) {
      console.error("Error adding troubleshooting step:", error);

      res.status(500).json({
        message: "Failed to add troubleshooting step.",
        error: error.message
      });
    }
  }
);

module.exports = router;
