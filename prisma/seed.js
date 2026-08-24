const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@clinic.com" },
    update: {},
    create: {
      name: "Clinic Admin",
      email: "admin@clinic.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const doctorPassword = await bcrypt.hash("Doctor@123", 10);
  const doctorUser = await prisma.user.upsert({
    where: { email: "dr.sharma@clinic.com" },
    update: {},
    create: {
      name: "Dr. Sharma",
      email: "dr.sharma@clinic.com",
      passwordHash: doctorPassword,
      role: "DOCTOR",
      doctorProfile: {
        create: {
          specialisation: "General Physician",
          slotDurationMin: 30,
          workingHours: {
            mon: ["09:00", "17:00"],
            tue: ["09:00", "17:00"],
            wed: ["09:00", "17:00"],
            thu: ["09:00", "17:00"],
            fri: ["09:00", "17:00"],
            sat: null,
            sun: null,
          },
        },
      },
    },
  });

  console.log("Seeded:", { admin: admin.email, doctor: doctorUser.email });
  console.log("Admin login: admin@clinic.com / Admin@123");
  console.log("Doctor login: dr.sharma@clinic.com / Doctor@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
