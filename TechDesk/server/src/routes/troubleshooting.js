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

    // Validate ticket ID
    const ticketIdNumber = Number(ticketId);

    if (!Number.isInteger(ticketIdNumber) || ticketIdNumber <= 0) {
      return res.status(400).json({
        message: "Invalid ticket ID."
      });
    }

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
       ORDER BY step_number ASC, id ASC`,
      [ticketIdNumber]
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
        description,
        result,
        completed
      } = req.body;

      // Validate ticket ID
      const ticketIdNumber = Number(ticket_id);

      if (!Number.isInteger(ticketIdNumber) || ticketIdNumber <= 0) {
        return res.status(400).json({
          message: "A valid ticket ID is required."
        });
      }

      // Validate description
      if (
        typeof description !== "string" ||
        description.trim().length === 0
      ) {
        return res.status(400).json({
          message: "Troubleshooting description is required."
        });
      }

      // Make sure the ticket exists
      const ticketResult = await pool.query(
        `SELECT id
         FROM tickets
         WHERE id = $1`,
        [ticketIdNumber]
      );

      if (ticketResult.rows.length === 0) {
        return res.status(404).json({
          message: "Ticket not found."
        });
      }

      // =================================================
      // AUTOMATIC STEP NUMBER
      // The backend determines the next step number.
      // =================================================

      const nextStepResult = await pool.query(
        `SELECT COALESCE(MAX(step_number), 0) + 1 AS next_step
         FROM troubleshooting_steps
         WHERE ticket_id = $1`,
        [ticketIdNumber]
      );

      const nextStep = nextStepResult.rows[0].next_step;

      // Normalize completed value
      const isCompleted = completed === true;

      // Insert troubleshooting step
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
          ticketIdNumber,
          nextStep,
          description.trim(),
          result ? String(result).trim() : null,
          isCompleted
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