// Prisma unique constraint violation code
const PRISMA_UNIQUE_VIOLATION = "P2002";

function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} ->`, err);

  // Double-booking race condition lands here as a Prisma unique constraint error
  if (err.code === PRISMA_UNIQUE_VIOLATION) {
    return res.status(409).json({
      error: "This slot was just booked by someone else. Please choose another slot.",
    });
  }

  if (err.name === "ZodError") {
    return res.status(400).json({ error: "Validation failed", details: err.errors });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
  });
}

// Wrap async route handlers so thrown errors reach errorHandler instead of hanging
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };
