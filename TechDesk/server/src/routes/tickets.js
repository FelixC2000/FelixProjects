const express = require("express");
const pool = require("../db/database");
const { authenticateToken } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { createAuditLog } = require("../utils/auditLogger");

const router = express.Router();

// All ticket routes require authentication
router.use(authenticateToken);

const VALID_STATUSES = [
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed"
];

const VALID_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical"
];

const VALID_CATEGORIES = [
  "hardware",
  "software",
  "network",
  "account",
  "security",
  "other"
];

// =====================================================
// GET ALL SUPPORT TICKETS
// =====================================================

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          tickets.id,
          tickets.title,
          tickets.description,
          tickets.priority,
          tickets.status,
          tickets.category,
          tickets.created_at,
          tickets.updated_at,

          creator.first_name AS creator_first_name,
          creator.last_name AS creator_last_name,
          creator.email AS creator_email,

          technician.first_name AS technician_first_name,
          technician.last_name AS technician_last_name,
          technician.email AS technician_email,

          assets.asset_tag,
          assets.asset_type,
          assets.manufacturer,
          assets.model,
          assets.serial_number,
          assets.operating_system,
          assets.status AS asset_status

       FROM tickets

       LEFT JOIN users AS creator
          ON tickets.created_by = creator.id

       LEFT JOIN users AS technician
          ON tickets.assigned_to = technician.id

       LEFT JOIN assets
          ON tickets.asset_id = assets.id

       ORDER BY tickets.id DESC`
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Error fetching tickets:", error);

    res.status(500).json({
      message: "Failed to fetch tickets.",
      error: error.message
    });
  }
});

// =====================================================
// GET SINGLE SUPPORT TICKET
// =====================================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM tickets
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Ticket not found."
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Error fetching ticket:", error);

    res.status(500).json({
      message: "Failed to fetch ticket.",
      error: error.message
    });
  }
});

// =====================================================
// UPDATE SUPPORT TICKET
// Technician/Admin only
// =====================================================

router.put(
  "/:id",
  requireRole("technician", "admin"),
  async (req, res) => {

    const {
      title,
      description,
      priority,
      status,
      category,
      assigned_to,
      asset_id
    } = req.body;

    // Validate request before opening database connection
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        message: "Invalid priority.",
        valid_priorities: VALID_PRIORITIES
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid status.",
        valid_statuses: VALID_STATUSES
      });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: "Invalid category.",
        valid_categories: VALID_CATEGORIES
      });
    }

    const client = await pool.connect();

    try {
      const { id } = req.params;

      await client.query("BEGIN");

      // Get current ticket
      const currentTicket = await client.query(
        `SELECT *
         FROM tickets
         WHERE id = $1`,
        [id]
      );

      if (currentTicket.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Ticket not found."
        });
      }

      const oldTicket = currentTicket.rows[0];

      // If assigned_to was supplied, verify that the user exists
      // and has a technician/admin role.
      if (assigned_to !== undefined && assigned_to !== null) {
        const assignedUser = await client.query(
          `SELECT id, first_name, last_name, email, role
           FROM users
           WHERE id = $1`,
          [assigned_to]
        );

        if (assignedUser.rows.length === 0) {
          await client.query("ROLLBACK");

          return res.status(404).json({
            message: "Assigned user not found."
          });
        }

        if (!["technician", "admin"].includes(assignedUser.rows[0].role)) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            message:
              "Tickets can only be assigned to technicians or administrators."
          });
        }
      }

      // Update ticket
      const updatedTicket = await client.query(
        `UPDATE tickets
         SET
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            priority = COALESCE($3, priority),
            status = COALESCE($4, status),
            category = COALESCE($5, category),
            assigned_to = COALESCE($6, assigned_to),
            asset_id = COALESCE($7, asset_id),
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *`,
        [
          title,
          description,
          priority,
          status,
          category,
          assigned_to,
          asset_id,
          id
        ]
      );

      // Record status change
      if (status && status !== oldTicket.status) {
        await client.query(
          `INSERT INTO ticket_history (
              ticket_id,
              user_id,
              action,
              old_value,
              new_value
           )
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id,
            req.user.userId,
            "status_changed",
            oldTicket.status,
            status
          ]
        );
      }

      // Record assignment change
      if (
        assigned_to !== undefined &&
        String(assigned_to) !== String(oldTicket.assigned_to)
      ) {
        await client.query(
          `INSERT INTO ticket_history (
              ticket_id,
              user_id,
              action,
              old_value,
              new_value
           )
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id,
            req.user.userId,
            "ticket_assigned",
            oldTicket.assigned_to
              ? String(oldTicket.assigned_to)
              : null,
            String(assigned_to)
          ]
        );
      }

      // Commit transaction
      await client.query("COMMIT");

      // =====================================================
      // AUTOMATIC AUDIT LOG - UPDATE TICKET
      // =====================================================

      const changedFields = [];

      if (title !== undefined) {
        changedFields.push("title");
      }

      if (description !== undefined) {
        changedFields.push("description");
      }

      if (priority !== undefined) {
        changedFields.push("priority");
      }

      if (status !== undefined) {
        changedFields.push("status");
      }

      if (category !== undefined) {
        changedFields.push("category");
      }

      if (assigned_to !== undefined) {
        changedFields.push("assigned_to");
      }

      if (asset_id !== undefined) {
        changedFields.push("asset_id");
      }

      await createAuditLog({
        userId: req.user.userId,
        action: "UPDATE_TICKET",
        entityType: "ticket",
        entityId: Number(id),
        details:
          changedFields.length > 0
            ? `Ticket #${id} updated. Fields changed: ${changedFields.join(", ")}`
            : `Ticket #${id} update request completed`
      });

      res.json({
        message: "Ticket updated successfully.",
        ticket: updatedTicket.rows[0]
      });

    } catch (error) {

      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }

      console.error("Error updating ticket:", error);

      res.status(500).json({
        message: "Failed to update ticket.",
        error: error.message
      });

    } finally {
      client.release();
    }
  }
);

// =====================================================
// ASSIGN TICKET TO USER
// Technician/Admin only
// =====================================================

router.put(
  "/:id/assign",
  requireRole("technician", "admin"),
  async (req, res) => {

    const { assigned_to } = req.body;

    if (!assigned_to) {
      return res.status(400).json({
        message: "Assigned user ID is required."
      });
    }

    const client = await pool.connect();

    try {
      const { id } = req.params;

      await client.query("BEGIN");

      // Check ticket
      const ticketResult = await client.query(
        `SELECT *
         FROM tickets
         WHERE id = $1`,
        [id]
      );

      if (ticketResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Ticket not found."
        });
      }

      const oldTicket = ticketResult.rows[0];

      // Check assigned user
      const userResult = await client.query(
        `SELECT
            id,
            first_name,
            last_name,
            email,
            role
         FROM users
         WHERE id = $1`,
        [assigned_to]
      );

      if (userResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "User not found."
        });
      }

      const assignedUser = userResult.rows[0];

      // Only technicians and admins can receive support tickets
      if (!["technician", "admin"].includes(assignedUser.role)) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message:
            "Tickets can only be assigned to technicians or administrators."
        });
      }

      // Update assignment
      const updatedTicket = await client.query(
        `UPDATE tickets
         SET
            assigned_to = $1,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [assigned_to, id]
      );

      // Record assignment history
      await client.query(
        `INSERT INTO ticket_history (
            ticket_id,
            user_id,
            action,
            old_value,
            new_value
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          req.user.userId,
          "ticket_assigned",
          oldTicket.assigned_to
            ? String(oldTicket.assigned_to)
            : null,
          String(assigned_to)
        ]
      );

      await client.query("COMMIT");

      // =====================================================
      // AUTOMATIC AUDIT LOG - ASSIGN TICKET
      // =====================================================

      await createAuditLog({
        userId: req.user.userId,
        action: "ASSIGN_TICKET",
        entityType: "ticket",
        entityId: Number(id),
        details: `Ticket #${id} assigned to user #${assigned_to}`
      });

      res.json({
        message: "Ticket assigned successfully.",
        ticket: updatedTicket.rows[0],
        assigned_user: assignedUser
      });

    } catch (error) {

      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }

      console.error("Error assigning ticket:", error);

      res.status(500).json({
        message: "Failed to assign ticket.",
        error: error.message
      });

    } finally {
      client.release();
    }
  }
);

// =====================================================
// CREATE SUPPORT TICKET
// Authenticated users
// =====================================================

router.post("/", async (req, res) => {
  try {

    const {
      title,
      description,
      priority,
      status,
      category,
      assigned_to,
      asset_id
    } = req.body;

    // Required fields
    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required."
      });
    }

    // Validate priority
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        message: "Invalid priority.",
        valid_priorities: VALID_PRIORITIES
      });
    }

    // Validate status
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid status.",
        valid_statuses: VALID_STATUSES
      });
    }

    // Validate category
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: "Invalid category.",
        valid_categories: VALID_CATEGORIES
      });
    }

    // Only technicians/admins can assign a ticket during creation
    if (assigned_to && !["technician", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to assign tickets."
      });
    }

    const result = await pool.query(
      `INSERT INTO tickets (
        title,
        description,
        priority,
        status,
        category,
        created_by,
        assigned_to,
        asset_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        title,
        description,
        priority || "medium",
        status || "open",
        category || null,

        // IMPORTANT:
        // Use the authenticated user's ID.
        // Do not trust created_by from the request body.
        req.user.userId,

        assigned_to || null,
        asset_id || null
      ]
    );

    // =====================================================
    // AUTOMATIC AUDIT LOG
    // =====================================================

    await createAuditLog({
      userId: req.user.userId,
      action: "CREATE_TICKET",
      entityType: "ticket",
      entityId: result.rows[0].id,
      details: `Ticket "${result.rows[0].title}" created`
    });

    res.status(201).json({
      message: "Support ticket created successfully.",
      ticket: result.rows[0]
    });

  } catch (error) {
    console.error("Error creating ticket:", error);

    res.status(500).json({
      message: "Failed to create support ticket.",
      error: error.message
    });
  }
});

module.exports = router;
