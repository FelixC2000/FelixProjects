const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Access token is required."
      });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        message: "Invalid authorization format."
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();

  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired access token."
    });
  }
}

module.exports = {
  authenticateToken
};