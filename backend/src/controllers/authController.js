const bcrypt = require("bcryptjs");
const { z } = require("zod");
const prisma = require("../config/prisma");
const { signToken } = require("../utils/jwt");
const calendarService = require("../services/calendarService");

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

// Only patients self-register. Doctors/admins are created by an admin (see adminController).
async function register(req, res) {
  const { name, email, password, phone } = RegisterSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, phone, role: "PATIENT" },
  });

  const token = signToken(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, role: user.role } });
}

async function login(req, res) {
  const { email, password } = z
    .object({ email: z.string().email(), password: z.string() })
    .parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, phone: true },
  });
  res.json({ user });
}

// ---- Google Calendar OAuth linking ----
function googleConnect(req, res) {
  const url = calendarService.getAuthUrl(req.user.id);
  res.json({ url });
}

async function googleCallback(req, res) {
  const { code, state: userId } = req.query;
  await calendarService.handleOAuthCallback(code, userId);
  res.redirect(`${process.env.FRONTEND_URL}/settings?calendar=connected`);
}

module.exports = { register, login, me, googleConnect, googleCallback };
