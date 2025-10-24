// config.js
module.exports = {
  PORT: process.env.PORT || 3000,
  API_KEY: process.env.API_KEY || "3000",
  MAX_CONCURRENT_JOBS: process.env.MAX_CONCURRENT_JOBS || 2,
  FILE_SIZE_LIMIT: process.env.FILE_SIZE_LIMIT || 1024 * 1024 * 1024 * 5, // 5 GB
  ALLOWED_EXTENSIONS: process.env.ALLOWED_EXTENSIONS || [
    "mp4",
    "wav",
    "mp3",
    "mov",
    "webm",
    "mkv",
    "aac",
    "ogg",
  ],
  CLEANUP_INTERVAL: process.env.CLEANUP_INTERVAL || 60 * 60 * 1000, // 1 hour
  JOB_RETENTION_PERIOD: process.env.JOB_RETENTION_PERIOD || 24 * 3600 * 1000, // 24 hours
  MIME_TYPES: process.env.MIME_TYPES || {
    mp4: "video/mp4",
    mov: "video/quicktime",
    mkv: "video/x-matroska",
    webm: "video/webm",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    aac: "audio/aac",
    ogg: "audio/ogg",
  },
};
