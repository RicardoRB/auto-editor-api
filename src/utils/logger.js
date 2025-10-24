// logger.js

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
}

function formatMetadata(meta) {
  if (!meta || Object.keys(meta).length === 0) return '';
  
  const important = ['jobId', 'ip', 'status', 'port', 'method', 'url', 'duration_ms'];
  const formatted = [];
  
  for (const key of important) {
    if (key in meta) {
      const value = meta[key];
      if (key === 'status') {
        formatted.push(`${key}: ${value}`);
      } else if (key === 'duration_ms') {
        formatted.push(`duration: ${value}ms`);
      } else {
        formatted.push(`${key}: ${value}`);
      }
    }
  }

  // Add other important metadata that might be present
  const errorKeys = Object.keys(meta).filter(k => k.toLowerCase().includes('error'));
  for (const key of errorKeys) {
    if (meta[key]) {
      formatted.push(`${key}: ${meta[key]}`);
    }
  }

  return formatted.length ? ` [${formatted.join(' | ')}]` : '';
}

function safeStringify(v) {
  try {
    return typeof v === "string" ? v : JSON.stringify(v);
  } catch (e) {
    return String(v);
  }
}

function log(level, message, meta = {}) {

  // Console formatting
  const timestamp = formatTime(new Date());
  const metadata = JSON.stringify(meta);

  let levelFormatted;
  let icon;

  switch (level) {
    case 'info':
      icon = '○';
      levelFormatted = icon + ' INFO ';
      break;
    case 'warn':
      icon = '⚠';
      levelFormatted = icon + ' WARN ';
      break;
    case 'error':
      icon = '✖';
      levelFormatted = icon + ' ERROR';
      break;
    case 'debug':
      icon = '⚡';
      levelFormatted = icon + ' DEBUG';
      break;
    case 'success':
      icon = '✓';
      levelFormatted = icon + ' OK   ';
      break;
    default:
      icon = '•';
      levelFormatted = icon + ` ${level.toUpperCase()}`;
  }

  // Build the final log line with padding and alignment
  const logLine = `${timestamp} ${levelFormatted} ${message}${metadata}`;

  // Output to console
  if (level === 'error') {
    console.error(logLine);
    // If there's an error stack, print it with proper formatting
    if (meta.error?.stack) {
      console.error('  └─ ' + meta.error.stack.replace(/\n/g, '\n     '));
    }
  } else {
    console.log(logLine);
  }

  // For JSON logging to file if needed
  // fs.appendFileSync('app.log', JSON.stringify(entry) + '\n');
}

// Helper methods for common log levels
const logger = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
  debug: (message, meta) => log('debug', message, meta),
  success: (message, meta) => log('success', message, meta)
};

module.exports = { log, logger, safeStringify };