// authMiddleware.js
const { log } = require("../utils/logger");
const config = require("../config/config");

function authenticate(req, res, next) {
  const auth = req.get("authorization") || "";
  const expectedHeader = `Bearer ${config.API_KEY}`;
  const currentHeader = `Bearer ${auth.split(" ")[1] || ""}`;
  
  if (expectedHeader !== currentHeader) {
    log("warn", "auth: failed", { headerPresent: !!auth, ip: req.ip });
    return res.status(401).json({
      success: false,
      message: "Missing or invalid Authorization header (use: Bearer your-api-key-here).",
    });
  }
  
  log("info", "auth: ok", { ip: req.ip });
  next();
}

module.exports = { authenticate };