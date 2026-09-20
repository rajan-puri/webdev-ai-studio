function readJsonBody(req, maxSizeBytes = 25 * 1024 * 1024) { // 25MB for screenshots
  return new Promise((resolve, reject) => {
    const chunks = [];
    let receivedBytes = 0;

    req.on('data', chunk => {
      receivedBytes += chunk.length;
      if (receivedBytes > maxSizeBytes) {
        reject(new Error('Payload too large. Maximum allowed size is 25MB.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        return resolve({});
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON payload: ' + err.message));
      }
    });

    req.on('error', err => {
      reject(err);
    });
  });
}

function sendJson(res, statusCode, data) {
  if (res.headersSent) return;
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function sendError(res, statusCode, message, code = 'ERROR') {
  sendJson(res, statusCode, {
    success: false,
    error: message,
    code
  });
}

module.exports = {
  readJsonBody,
  sendJson,
  sendError
};
