// autoEditorService.js
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { log } = require("../utils/logger");

function validateCommandTemplate(cmd) {
  if (typeof cmd !== "string") {
    log("error", "validateCommandTemplate: not a string", { valueType: typeof cmd });
    return { ok: false, message: "full_command debe ser una cadena." };
  }

  if (!cmd.includes("{input}") || !cmd.includes("{output}")) {
    log("error", "validateCommandTemplate: missing placeholders", { cmdSnippet: cmd.slice(0,200) });
    return {
      ok: false,
      message: "La plantilla debe incluir {input} y {output}.",
    };
  }

  if (!/^\s*auto-editor\b/.test(cmd)) {
    log("error", 'validateCommandTemplate: does not start with auto-editor', { cmdSnippet: cmd.slice(0,200) });
    return { ok: false, message: 'La plantilla debe empezar con "auto-editor".' };
  }

  return { ok: true };
}

function parseCommandArgs(cmdStr) {
  cmdStr = cmdStr.trim();
  const args = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  
  for (let i = 0; i < cmdStr.length; i++) {
    const ch = cmdStr[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (ch === " " && !inSingle && !inDouble) {
      if (current.length > 0) {
        args.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current.length > 0) args.push(current);
  return args;
}

function makeJobDir(jobId) {
  const dir = path.join("/tmp", `autoeditor-job-${jobId}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function runAutoEditor(jobId, template, inputPath, outputExt, jobRecord) {
  return new Promise((resolve) => {
    const jobDir = makeJobDir(jobId);
    const outputFile = path.join(jobDir, `output.${outputExt}`);
    const cmd = template
      .replace(/{input}/g, inputPath)
      .replace(/{output}/g, outputFile);

    const args = parseCommandArgs(cmd);
    
    // No removemos auto-editor del comando ya que está en el template
    if (args.length === 0) {
      jobRecord.status = "ERROR";
      jobRecord.error = "Comando inválido: está vacío";
      log("error", "runAutoEditor: invalid empty command", {
        jobId,
        partialCmd: cmd.slice(0, 200),
      });
      return resolve();
    }

    jobRecord.status = "PROCESSING";
    jobRecord.startedAt = new Date().toISOString();
    log("info", "runAutoEditor: starting auto-editor", { jobId, args, argsCount: args.length });

    // Timeout de 30 minutos
    const timeout = setTimeout(() => {
      if (ae && !ae.killed) {
        ae.kill();
        jobRecord.status = "ERROR";
        jobRecord.error = "Timeout después de 30 minutos";
        jobRecord.finishedAt = new Date().toISOString();
        log("error", "runAutoEditor: timeout killed process", { jobId });
        resolve();
      }
    }, 30 * 60 * 1000);

    const ae = spawn(args[0], args.slice(1), {
      stdio: ["inherit", "pipe", "pipe"],
      shell: true
    });

    let stdout = "";
    let stderr = "";
    ae.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      if (s.length < 1000) log("debug", "auto-editor_stdout", { jobId, data: s });
    });
    ae.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      log("debug", "auto-editor_stderr_chunk", { jobId, chunk: s.slice(0, 500) });
    });

    ae.on("error", (err) => {
      jobRecord.status = "ERROR";
      jobRecord.error = `spawn error: ${err.message}`;
      jobRecord.finishedAt = new Date().toISOString();
      log("error", "runAutoEditor: spawn error", { jobId, err: err.message });
      resolve();
    });

    ae.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputFile)) {
        jobRecord.status = "FINISHED";
        jobRecord.finishedAt = new Date().toISOString();
        jobRecord.outputPath = outputFile;
        jobRecord.outputExt = outputExt;
        log("info", "runAutoEditor: finished successfully", {
          jobId,
          output: outputFile,
        });
      } else {
        jobRecord.status = "ERROR";
        jobRecord.error = `auto-editor exited with code ${code}. stderr: ${stderr.slice(0, 1000)}`;
        jobRecord.finishedAt = new Date().toISOString();
        log("error", "runAutoEditor: failed", {
          jobId,
          exitCode: code,
          stderrSnippet: stderr.slice(0, 1000),
        });
      }
      resolve();
    });
  });
}

module.exports = {
  validateCommandTemplate,
  runAutoEditor: runAutoEditor,
  makeJobDir,
  parseCommandArgs,
};