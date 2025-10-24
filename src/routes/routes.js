// routes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const config = require("../config/config");
const { validateCommandTemplate, makeJobDir } = require("../services/autoEditorService");
const { jobs, scheduleJob } = require("../services/jobService");
const { log } = require("../utils/logger");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, "/tmp"),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.originalname}`;
      cb(null, unique);
    },
  }),
  limits: {
    fileSize: config.FILE_SIZE_LIMIT,
  },
});

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.post(
  "/api/uploadposts/auto-editor/jobs/upload",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        log("warn", "upload: no file provided", { ip: req.ip });
        return res
          .status(400)
          .json({ success: false, message: "file (binary) es requerido." });
      }

      const { full_command, output_extension } = req.body || {};
      if (!full_command) {
        log("warn", "upload: missing full_command", { ip: req.ip });
        return res
          .status(400)
          .json({ success: false, message: "full_command es requerido." });
      }
      if (!output_extension) {
        log("warn", "upload: missing output_extension", { ip: req.ip });
        return res
          .status(400)
          .json({ success: false, message: "output_extension es requerido." });
      }

      const normalizedExt = output_extension.replace(/^\./, "").toLowerCase();
      if (!config.ALLOWED_EXTENSIONS.includes(normalizedExt)) {
        log("warn", "upload: unsupported extension", { normalizedExt });
        return res.status(400).json({
          success: false,
          message: `output_extension no soportado. Permitidos: ${config.ALLOWED_EXTENSIONS.join(", ")}`,
        });
      }

      const validation = validateCommandTemplate(full_command);
      if (!validation.ok) {
        log("warn", "upload: command validation failed", { reason: validation.message });
        return res
          .status(400)
          .json({ success: false, message: validation.message });
      }

      const jobId = uuidv4();
      const jobDir = makeJobDir(jobId);

      const originalExt = path.extname(req.file.filename) || path.extname(req.file.originalname) || "";
      const inputFilename = `input${originalExt}`;
      const inputPath = path.join(jobDir, inputFilename);
      fs.renameSync(req.file.path, inputPath);
      log("info", "upload: file moved to job dir", { jobId, inputPath });

      const record = {
        job_id: jobId,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        inputPath,
        outputPath: null,
        outputExt: normalizedExt,
        error: null,
      };
      jobs.set(jobId, record);
      log("info", "upload: job created", { jobId, createdAt: record.createdAt });

      scheduleJob(jobId, full_command, inputPath, normalizedExt);

      return res
        .status(202)
        .json({ success: true, job_id: jobId, status: record.status });
    } catch (err) {
      log("error", "Upload error", { err: safeStringify(err?.message || err) });
      return res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  }
);

router.get("/api/uploadposts/auto-editor/jobs/:jobId", (req, res) => {
  const jobId = req.params.jobId;
  log("info", "job_status_requested", { jobId });
  const job = jobs.get(jobId);
  if (!job) {
    log("warn", "job_status_not_found", { jobId });
    return res
      .status(404)
      .json({ success: false, message: "Job no encontrado." });
  }

  const response = {
    job_id: job.job_id,
    status: job.status,
    duration_seconds: job.duration_seconds || null,
    output_extension: job.outputExt || job.outputExt === undefined ? job.outputExt : job.outputExt,
  };
  return res.json(response);
});

router.get("/api/uploadposts/auto-editor/jobs/:jobId/download", (req, res) => {
  const jobId = req.params.jobId;
  log("info", "download_requested", { jobId, ip: req.ip });
  const job = jobs.get(jobId);
  if (!job) {
    log("warn", "download: job not found", { jobId });
    return res
      .status(404)
      .json({ success: false, message: "Job no encontrado." });
  }

  if (job.status !== "FINISHED") {
    log("warn", "download: job not finished", { jobId, status: job.status });
    return res.status(409).json({
      success: false,
      message: `Job status es ${job.status}. Solo disponible cuando FINISHED.`,
    });
  }
  if (!job.outputPath || !fs.existsSync(job.outputPath)) {
    log("error", "download: output file missing", { jobId, outputPath: job.outputPath });
    return res
      .status(500)
      .json({ success: false, message: "Archivo de salida no encontrado." });
  }

  const filename = `output.${job.outputExt || "bin"}`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  const contentType = config.MIME_TYPES[job.outputExt] || "application/octet-stream";
  res.setHeader("Content-Type", contentType);

  log("info", "download: streaming output", { jobId, filename });
  const stream = fs.createReadStream(job.outputPath);
  stream.pipe(res);
});

router.get("/api/uploadposts/auto-editor/jobs", (req, res) => {
  const all = Array.from(jobs.values()).map((j) => ({
    job_id: j.job_id,
    status: j.status,
    createdAt: j.createdAt,
  }));
  res.json(all);
});

module.exports = router;