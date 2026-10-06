const express = require("express");
const pool = require("../db/database");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticateToken);

// Get history for a specific ticket
router.get("/ticket/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;

    const result = await pool.query(
      `SELECT
          ticket_history.id,
          ticket_history.ticket_id,
          ticket_history.action,
          ticket_history.old_value,
          ticket_history.new_value,
          ticket_history.created_at,

          users.first_name,
          users.last_name,
          users.email

       FROM ticket_history

       LEFT JOIN users
          ON ticket_history.user_id = users.id

       WHERE ticket_history.ticket_id = $1

       ORDER BY ticket_history.created_at ASC`,
      [ticketId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Error fetching ticket history:", error);

    res.status(500).json({
      message: "Failed to fetch ticket history.",
      error: error.message
    });
  }
});

// Add a history record
router.post("/", async (req, res) => {
  try {
    const {
      ticket_id,
      user_id,
      action,
      old_value,
      new_value
    } = req.body;

    if (!ticket_id || !action) {
      return res.status(400).json({
        message: "Ticket ID and action are required."
      });
    }

    const result = await pool.query(
      `INSERT INTO ticket_history (
          ticket_id,
          user_id,
          action,
          old_value,
          new_value
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        ticket_id,
        user_id || null,
        action,
        old_value || null,
        new_value || null
      ]
    );

    res.status(201).json({
      message: "Ticket history recorded successfully.",
      history: result.rows[0]
    });

  } catch (error) {
    console.error("Error creating ticket history:", error);

    res.status(500).json({
      message: "Failed to record ticket history.",
      error: error.message
    });
  }
});

module.exports = router;