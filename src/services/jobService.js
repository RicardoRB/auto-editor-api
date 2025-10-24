// jobService.js
const { runAutoEditor } = require("./autoEditorService");
const { log } = require("../utils/logger");
const config = require("../config/config");

const jobs = new Map();
let runningCount = 0;
const queue = [];

function scheduleJob(jobId, full_command, inputPath, outputExt) {
  const jobRecord = jobs.get(jobId);
  const task = async () => {
    try {
      runningCount++;
      log("info", "scheduleJob: task started", { jobId, runningCount });
      await runAutoEditor(jobId, full_command, inputPath, outputExt, jobRecord);
    } finally {
      runningCount--;
      log("info", "scheduleJob: task finished", { jobId, runningCount });
      if (queue.length > 0 && runningCount < config.MAX_CONCURRENT_JOBS) {
        const next = queue.shift();
        log("info", "scheduleJob: dequeued next task", { nextQueued: queue.length });
        next();
      }
    }
  };

  if (runningCount < config.MAX_CONCURRENT_JOBS) {
    log("info", "scheduleJob: starting immediately", { jobId, runningCount });
    task();
  } else {
    queue.push(task);
    log("info", "scheduleJob: queued", { jobId, queueLen: queue.length });
  }
}

function cleanupJobs() {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (job.finishedAt) {
      const finishedTs = new Date(job.finishedAt).getTime();
      if (now - finishedTs > config.JOB_RETENTION_PERIOD) {
        try {
          const d = path.dirname(job.inputPath || "");
          if (fs.existsSync(d)) {
            fs.rmSync(d, { recursive: true, force: true });
            log("info", "cleanup: removed job dir", { jobId: id, dir: d });
          }
        } catch (e) {
          log("error", "cleanup: failed to remove job dir", { jobId: id, err: safeStringify(e?.message || e) });
        }
        jobs.delete(id);
      }
    }
  }
}

module.exports = {
  jobs,
  scheduleJob,
  cleanupJobs
};