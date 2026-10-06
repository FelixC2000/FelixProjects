const express = require("express");
const pool = require("../db/database");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticateToken);

// Get comments for a specific ticket
router.get("/ticket/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;

    const result = await pool.query(
      `SELECT
          ticket_comments.id,
          ticket_comments.ticket_id,
          ticket_comments.comment,
          ticket_comments.created_at,

          users.first_name,
          users.last_name,
          users.email

       FROM ticket_comments

       LEFT JOIN users
          ON ticket_comments.user_id = users.id

       WHERE ticket_comments.ticket_id = $1

       ORDER BY ticket_comments.created_at ASC`,
      [ticketId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Error fetching comments:", error);

    res.status(500).json({
      message: "Failed to fetch ticket comments.",
      error: error.message
    });
  }
});

// Add a comment to a ticket
router.post("/", async (req, res) => {
  try {
    const {
      ticket_id,
      user_id,
      comment
    } = req.body;

    if (!ticket_id || !comment) {
      return res.status(400).json({
        message: "Ticket ID and comment are required."
      });
    }

    const result = await pool.query(
      `INSERT INTO ticket_comments (
          ticket_id,
          user_id,
          comment
       )
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        ticket_id,
        user_id || null,
        comment
      ]
    );

    res.status(201).json({
      message: "Comment added successfully.",
      comment: result.rows[0]
    });

  } catch (error) {
    console.error("Error adding comment:", error);

    res.status(500).json({
      message: "Failed to add comment.",
      error: error.message
    });
  }
});

module.exports = router;