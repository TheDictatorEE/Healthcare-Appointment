const { PrismaClient } = require("@prisma/client");

// Singleton so we don't exhaust DB connections in dev with hot-reload
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

module.exports = prisma;
