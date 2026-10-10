
const express = require("express");
const pool = require("../db/database");
const { authenticateToken } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { createAuditLog } = require("../utils/auditLogger");

const router = express.Router();

// All ticket routes require authentication.
router.use(authenticateToken);

// Allowed values
const VALID_STATUSES = [
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
];

const VALID_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
];

const VALID_CATEGORIES = [
  "hardware",
  "software",
  "network",
  "account",
  "security",
  "other",
];

// Reusable validation helpers
function isValidId(id) {
  return /^\d+$/.test(String(id)) && Number(id) > 0;
}

function isValidOptionalId(value) {
  return (
    value === null ||
    value === undefined ||
    isValidId(value)
  );
}

function isValidText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEnum(value, allowedValues) {
  return value === undefined || allowedValues.includes(value);
}

// Verify that an assigned user exists and has an eligible role.
async function validateAssignee(db, assignedTo) {
  if (assignedTo === null || assignedTo === undefined) {
    return { valid: true };
  }

  if (!isValidId(assignedTo)) {
    return {
      valid: false,
      status: 400,
      message: "assigned_to must be a positive integer or null.",
    };
  }

  const result = await db.query(
    "SELECT id, role FROM users WHERE id = $1",
    [assignedTo]
  );

  if (result.rows.length === 0) {
    return {
      valid: false,
      status: 404,
      message: "Assigned user not found.",
    };
  }

  if (!["technician", "admin"].includes(result.rows[0].role)) {
    return {
      valid: false,
      status: 400,
      message: "Tickets can only be assigned to technicians or admins.",
    };
  }

  return { valid: true };
}

// Verify that an asset exists.
async function validateAsset(db, assetId) {
  if (assetId === null || assetId === undefined) {
    return { valid: true };
  }

  if (!isValidId(assetId)) {
    return {
      valid: false,
      status: 400,
      message: "asset_id must be a positive integer or null.",
    };
  }

  const result = await db.query(
    "SELECT id FROM assets WHERE id = $1",
    [assetId]
  );

  if (result.rows.length === 0) {
    return {
      valid: false,
      status: 404,
      message: "Asset not found.",
    };
  }

  return { valid: true };
}

// Record an audit event without making a successful ticket operation
// appear to fail if the separate audit logging operation encounters an error.
async function logAudit(details) {
  try {
    await createAuditLog(details);
  } catch (error) {
    console.error("Audit logging failed:", error.message);
  }
}

// GET ALL SUPPORT TICKETS
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

    return res.json(result.rows);
  } catch (error) {
    console.error("Error fetching tickets:", error);

    return res.status(500).json({
      message: "Failed to fetch tickets.",
    });
  }
});

// GET SINGLE SUPPORT TICKET
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      message: "Invalid ticket ID. ID must be a positive integer.",
    });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM tickets WHERE id = $1",
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Ticket not found.",
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching ticket:", error);

    return res.status(500).json({
      message: "Failed to fetch ticket.",
    });
  }
});

// CREATE SUPPORT TICKET
// Any authenticated user can create a ticket.
// Only technicians and admins can assign a ticket during creation.
router.post("/", async (req, res) => {
  const {
    title,
    description,
    priority = "medium",
    status = "open",
    category = "other",
    assigned_to,
    asset_id,
  } = req.body;

  if (!isValidText(title)) {
    return res.status(400).json({
      message: "A non-empty ticket title is required.",
    });
  }

  if (!isValidText(description)) {
    return res.status(400).json({
      message: "A non-empty ticket description is required.",
    });
  }

  if (!isValidEnum(priority, VALID_PRIORITIES)) {
    return res.status(400).json({
      message: "Invalid priority.",
      validValues: VALID_PRIORITIES,
    });
  }

  if (!isValidEnum(status, VALID_STATUSES)) {
    return res.status(400).json({
      message: "Invalid status.",
      validValues: VALID_STATUSES,
    });
  }

  if (!isValidEnum(category, VALID_CATEGORIES)) {
    return res.status(400).json({
      message: "Invalid category.",
      validValues: VALID_CATEGORIES,
    });
  }

  const canAssign = ["technician", "admin"].includes(req.user.role);

  if (assigned_to !== undefined && assigned_to !== null && !canAssign) {
    return res.status(403).json({
      message: "Only technicians and admins can assign tickets.",
    });
  }

  if (assigned_to !== undefined && !isValidOptionalId(assigned_to)) {
    return res.status(400).json({
      message: "assigned_to must be a positive integer or null.",
    });
  }

  if (!isValidOptionalId(asset_id)) {
    return res.status(400).json({
      message: "asset_id must be a positive integer or null.",
    });
  }

  try {
    if (assigned_to !== undefined && assigned_to !== null) {
      const assigneeCheck = await validateAssignee(pool, assigned_to);

      if (!assigneeCheck.valid) {
        return res.status(assigneeCheck.status).json({
          message: assigneeCheck.message,
        });
      }
    }

    if (asset_id !== undefined && asset_id !== null) {
      const assetCheck = await validateAsset(pool, asset_id);

      if (!assetCheck.valid) {
        return res.status(assetCheck.status).json({
          message: assetCheck.message,
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO tickets
        (title, description, priority, status, category,
         created_by, assigned_to, asset_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title.trim(),
        description.trim(),
        priority,
        status,
        category,
        req.user.userId,
        assigned_to ?? null,
        asset_id ?? null,
      ]
    );

    const ticket = result.rows[0];

    await logAudit({
      userId: req.user.userId,
      action: "CREATE_TICKET",
      entityType: "ticket",
      entityId: ticket.id,
      details: {
        title: ticket.title,
        priority: ticket.priority,
        status: ticket.status,
      },
    });

    return res.status(201).json({
      message: "Ticket created successfully.",
      ticket,
    });
  } catch (error) {
    console.error("Error creating ticket:", error);

    return res.status(500).json({
      message: "Failed to create ticket.",
    });
  }
});

// UPDATE SUPPORT TICKET
// Technicians and admins only.
router.put("/:id", requireRole("technician", "admin"), async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      message: "Invalid ticket ID. ID must be a positive integer.",
    });
  }

  const {
    title,
    description,
    priority,
    status,
    category,
    assigned_to,
    asset_id,
  } = req.body;

  if (title !== undefined && !isValidText(title)) {
    return res.status(400).json({
      message: "Title must be a non-empty string.",
    });
  }

  if (description !== undefined && !isValidText(description)) {
    return res.status(400).json({
      message: "Description must be a non-empty string.",
    });
  }

  if (!isValidEnum(priority, VALID_PRIORITIES)) {
    return res.status(400).json({
      message: "Invalid priority.",
      validValues: VALID_PRIORITIES,
    });
  }

  if (!isValidEnum(status, VALID_STATUSES)) {
    return res.status(400).json({
      message: "Invalid status.",
      validValues: VALID_STATUSES,
    });
  }

  if (!isValidEnum(category, VALID_CATEGORIES)) {
    return res.status(400).json({
      message: "Invalid category.",
      validValues: VALID_CATEGORIES,
    });
  }

  if (assigned_to !== undefined && !isValidOptionalId(assigned_to)) {
    return res.status(400).json({
      message: "assigned_to must be a positive integer or null.",
    });
  }

  if (asset_id !== undefined && !isValidOptionalId(asset_id)) {
    return res.status(400).json({
      message: "asset_id must be a positive integer or null.",
    });
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const currentResult = await client.query(
      "SELECT * FROM tickets WHERE id = $1 FOR UPDATE",
      [Number(id)]
    );

    if (currentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        message: "Ticket not found.",
      });
    }

    const oldTicket = currentResult.rows[0];

    if (assigned_to !== undefined && assigned_to !== null) {
      const assigneeCheck = await validateAssignee(client, assigned_to);

      if (!assigneeCheck.valid) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(assigneeCheck.status).json({
          message: assigneeCheck.message,
        });
      }
    }

    if (asset_id !== undefined && asset_id !== null) {
      const assetCheck = await validateAsset(client, asset_id);

      if (!assetCheck.valid) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(assetCheck.status).json({
          message: assetCheck.message,
        });
      }
    }

    const newTitle =
      title !== undefined ? title.trim() : oldTicket.title;

    const newDescription =
      description !== undefined
        ? description.trim()
        : oldTicket.description;

    const newPriority =
      priority !== undefined ? priority : oldTicket.priority;

    const newStatus =
      status !== undefined ? status : oldTicket.status;

    const newCategory =
      category !== undefined ? category : oldTicket.category;

    const newAssignedTo =
      assigned_to !== undefined
        ? assigned_to
        : oldTicket.assigned_to;

    // Explicit null clears the associated asset.
    const newAssetId =
      asset_id !== undefined ? asset_id : oldTicket.asset_id;

    const updateResult = await client.query(
      `UPDATE tickets
       SET title = $1,
           description = $2,
           priority = $3,
           status = $4,
           category = $5,
           assigned_to = $6,
           asset_id = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        newTitle,
        newDescription,
        newPriority,
        newStatus,
        newCategory,
        newAssignedTo,
        newAssetId,
        Number(id),
      ]
    );

    const updatedTicket = updateResult.rows[0];

    // Save status changes in ticket history.
    if (oldTicket.status !== updatedTicket.status) {
      await client.query(
        `INSERT INTO ticket_history
          (ticket_id, user_id, action, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          Number(id),
          req.user.userId,
          "status_changed",
          oldTicket.status,
          updatedTicket.status,
        ]
      );
    }

    // Save assignment changes in ticket history.
    if (oldTicket.assigned_to !== updatedTicket.assigned_to) {
      await client.query(
        `INSERT INTO ticket_history
          (ticket_id, user_id, action, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          Number(id),
          req.user.userId,
          "assignment_changed",
          oldTicket.assigned_to === null
            ? null
            : String(oldTicket.assigned_to),
          updatedTicket.assigned_to === null
            ? null
            : String(updatedTicket.assigned_to),
        ]
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    await logAudit({
      userId: req.user.userId,
      action: "UPDATE_TICKET",
      entityType: "ticket",
      entityId: updatedTicket.id,
      details: {
        changedFields: Object.keys(req.body),
        previousStatus: oldTicket.status,
        newStatus: updatedTicket.status,
        previousAssignee: oldTicket.assigned_to,
        newAssignee: updatedTicket.assigned_to,
      },
    });

    return res.json({
      message: "Ticket updated successfully.",
      ticket: updatedTicket,
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Ticket rollback failed:", rollbackError.message);
      }
    }

    console.error("Error updating ticket:", error);

    return res.status(500).json({
      message: "Failed to update ticket.",
    });
  } finally {
    client.release();
  }
});

// ASSIGN TICKET TO USER
// Technicians and admins only.
router.put(
  "/:id/assign",
  requireRole("technician", "admin"),
  async (req, res) => {
    const { id } = req.params;
    const { assigned_to } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid ticket ID. ID must be a positive integer.",
      });
    }

    if (assigned_to === undefined || assigned_to === null) {
      return res.status(400).json({
        message: "assigned_to is required. Use PUT /:id to unassign a ticket.",
      });
    }

    if (!isValidId(assigned_to)) {
      return res.status(400).json({
        message: "assigned_to must be a positive integer.",
      });
    }

    const client = await pool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      const ticketResult = await client.query(
        "SELECT * FROM tickets WHERE id = $1 FOR UPDATE",
        [Number(id)]
      );

      if (ticketResult.rows.length === 0) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(404).json({
          message: "Ticket not found.",
        });
      }

      const oldTicket = ticketResult.rows[0];

      const assigneeCheck = await validateAssignee(client, assigned_to);

      if (!assigneeCheck.valid) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(assigneeCheck.status).json({
          message: assigneeCheck.message,
        });
      }

      const updateResult = await client.query(
        `UPDATE tickets
         SET assigned_to = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [Number(assigned_to), Number(id)]
      );

      const updatedTicket = updateResult.rows[0];

      if (oldTicket.assigned_to !== updatedTicket.assigned_to) {
        await client.query(
          `INSERT INTO ticket_history
            (ticket_id, user_id, action, old_value, new_value)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            Number(id),
            req.user.userId,
            "assignment_changed",
            oldTicket.assigned_to === null
              ? null
              : String(oldTicket.assigned_to),
            String(updatedTicket.assigned_to),
          ]
        );
      }

      await client.query("COMMIT");
      transactionStarted = false;

      await logAudit({
        userId: req.user.userId,
        action: "ASSIGN_TICKET",
        entityType: "ticket",
        entityId: updatedTicket.id,
        details: {
          previousAssignee: oldTicket.assigned_to,
          newAssignee: updatedTicket.assigned_to,
        },
      });

      return res.json({
        message: "Ticket assigned successfully.",
        ticket: updatedTicket,
      });
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Assignment rollback failed:", rollbackError.message);
        }
      }

      console.error("Error assigning ticket:", error);

      return res.status(500).json({
        message: "Failed to assign ticket.",
      });
    } finally {
      client.release();
    }
  }
);

module.exports = router;