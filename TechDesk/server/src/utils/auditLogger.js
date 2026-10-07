const pool = require("../db/database");

/**
 * Creates an audit log entry.
 *
 * @param {Object} data
 * @param {number} data.userId - ID of the authenticated user
 * @param {string} data.action - Action performed
 * @param {string} data.entityType - Type of entity affected
 * @param {number|null} data.entityId - ID of affected entity
 * @param {string|null} data.details - Additional information
 */
async function createAuditLog({
  userId,
  action,
  entityType,
  entityId = null,
  details = null
}) {
  try {
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
        userId,
        action,
        entityType,
        entityId,
        details
      ]
    );

    return result.rows[0];

  } catch (error) {
    console.error("Audit logging error:", error);

    // We don't want an audit-log failure to break
    // the main operation.
    return null;
  }
}

module.exports = {
  createAuditLog
};
