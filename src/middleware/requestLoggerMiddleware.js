// requestLoggerMiddleware.js
const { logger } = require("../utils/logger");

function requestLogger(req, res, next) {
  const start = Date.now();
  logger.info(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection?.remoteAddress,
  });
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : 
                  res.statusCode >= 400 ? 'warn' : 
                  res.statusCode >= 300 ? 'info' : 'success';
    
    logger[level](`${req.method} ${req.originalUrl} completed`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration_ms: duration,
    });
  });
  
  next();
}

module.exports = { requestLogger };