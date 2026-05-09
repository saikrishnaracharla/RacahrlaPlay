/**
 * server/middleware/errorHandler.js
 *
 * WHY centralised error handling:
 *  - Ensures ALL errors return a consistent JSON shape (never HTML)
 *  - Prevents stack traces leaking to production clients
 *  - Differentiates user errors (4xx) from server bugs (5xx)
 *  - Catches async errors thrown in route handlers
 */

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isDev  = process.env.NODE_ENV !== 'production';

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}:`, err.message);

  res.status(status).json({
    success: false,
    error:   err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
}

function notFound(req, res) {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
}

// Wrap async route handlers so thrown errors go to errorHandler
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, notFound, asyncHandler };
