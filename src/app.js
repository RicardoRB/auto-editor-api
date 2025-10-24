// app.js
const express = require("express");
const bodyParser = require("body-parser");
const config = require("./config/config");
const routes = require("./routes/routes");
const { requestLogger } = require("./middleware/requestLoggerMiddleware");
const { cleanupJobs } = require("./services/jobService");
const { log } = require("./utils/logger");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(requestLogger);

// Routes
app.use(routes);

// Cleanup job files periodically
setInterval(cleanupJobs, config.CLEANUP_INTERVAL);

// Start server
app.listen(config.PORT, "0.0.0.0", () => {
  log("info", "server_started", { port: config.PORT });
});