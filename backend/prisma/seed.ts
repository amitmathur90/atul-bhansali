// Local dev seed data. Ward names/cities are generic placeholders — edit via the
// admin portal's Ward management page once real constituency data is available.
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env";
import { logger } from "../src/lib/logger";

const prisma = new PrismaClient();

const WARDS = Array.from({ length: 15 }, (_, i) => ({
  wardNumber: i + 1,
  name: `Ward ${i + 1}`,
  city: "Constituency City",
}));

const DEPARTMENTS = [
  "Water Works Department",
  "Public Works Department (Roads)",
  "Drainage & Sanitation Department",
  "Electricity Department",
  "Sanitation Department",
  "Street Lighting Department",
  "Government Schemes Cell",
  "Education Department",
  "Health Department",
  "Women & Child Safety Cell",
  "Traffic Police",
  "Public Transport Department",
  "General Administration",
] as const;

// The 13 categories named verbatim in the PRD, each mapped to its natural department.
const CATEGORIES: { name: string; department: string }[] = [
  { name: "Water Supply", department: "Water Works Department" },
  { name: "Road", department: "Public Works Department (Roads)" },
  { name: "Drainage", department: "Drainage & Sanitation Department" },
  { name: "Electricity", department: "Electricity Department" },
  { name: "Garbage", department: "Sanitation Department" },
  { name: "Street Light", department: "Street Lighting Department" },
  { name: "Government Scheme", department: "Government Schemes Cell" },
  { name: "Education", department: "Education Department" },
  { name: "Hospital", department: "Health Department" },
  { name: "Women Safety", department: "Women & Child Safety Cell" },
  { name: "Traffic", department: "Traffic Police" },
  { name: "Public Transport", department: "Public Transport Department" },
  { name: "Others", department: "General Administration" },
];

const EMERGENCY_CONTACTS: {
  name: string;
  category: "POLICE" | "FIRE" | "AMBULANCE" | "WATER_DEPT" | "ELECTRICITY_DEPT" | "MLA_OFFICE";
  phone: string;
}[] = [
  { name: "Police", category: "POLICE", phone: "100" },
  { name: "Fire Brigade", category: "FIRE", phone: "101" },
  { name: "Ambulance", category: "AMBULANCE", phone: "108" },
  { name: "Water Department Helpline", category: "WATER_DEPT", phone: "1800-000-000" },
  { name: "Electricity Department Helpline", category: "ELECTRICITY_DEPT", phone: "1800-000-001" },
  { name: "MLA Office", category: "MLA_OFFICE", phone: "1800-000-002" },
];

const WELFARE_SCHEMES: { title: string; description: string; eligibility: string }[] = [
  {
    title: "Old Age Pension Scheme",
    description: "Monthly financial assistance for senior citizens without a regular income.",
    eligibility: "Age 60+, resident of the constituency, annual family income below ₹1,00,000.",
  },
  {
    title: "Girl Child Education Scholarship",
    description: "Annual scholarship to support school and college education for girl students.",
    eligibility: "Girl students enrolled in a government school/college within the constituency.",
  },
  {
    title: "Free Health Checkup Camp Scheme",
    description: "Free periodic health checkups and medicines through ward-level health camps.",
    eligibility: "All residents; priority given to BPL cardholders.",
  },
];

const CONTACT_MLA_SETTINGS: Record<string, string> = {
  "contact.officeAddress": "MLA Office, Constituency City",
  "contact.officeHours": "Mon–Sat, 10:00 AM – 5:00 PM",
  "contact.phone": "1800-000-002",
  "contact.email": "office@example.gov.in",
  "contact.googleMapsUrl": "https://maps.google.com/?q=MLA+Office",
  "contact.socialMedia": JSON.stringify({ facebook: "", twitter: "", instagram: "" }),
};

async function main() {
  await prisma.ward.createMany({
    data: WARDS,
    skipDuplicates: true,
  });
  logger.info(`Seeded ${WARDS.length} wards`);

  for (const name of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  logger.info(`Seeded ${DEPARTMENTS.length} departments`);

  for (const cat of CATEGORIES) {
    const department = await prisma.department.findUniqueOrThrow({ where: { name: cat.department } });
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { departmentId: department.id },
      create: { name: cat.name, departmentId: department.id },
    });
  }
  logger.info(`Seeded ${CATEGORIES.length} categories`);

  for (const [i, ec] of EMERGENCY_CONTACTS.entries()) {
    const existing = await prisma.emergencyContact.findFirst({ where: { category: ec.category } });
    if (!existing) {
      await prisma.emergencyContact.create({ data: { ...ec, order: i } });
    }
  }
  logger.info(`Seeded ${EMERGENCY_CONTACTS.length} emergency contacts`);

  for (const scheme of WELFARE_SCHEMES) {
    const existing = await prisma.welfareScheme.findFirst({ where: { title: scheme.title } });
    if (!existing) {
      await prisma.welfareScheme.create({ data: scheme });
    }
  }
  logger.info(`Seeded ${WELFARE_SCHEMES.length} welfare schemes`);

  for (const [key, value] of Object.entries(CONTACT_MLA_SETTINGS)) {
    await prisma.settings.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  logger.info("Seeded Contact-MLA settings");

  const superAdminPasswordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10);
  await prisma.staffMember.upsert({
    where: { username: env.SEED_ADMIN_USERNAME },
    update: {},
    create: {
      name: "Super Admin",
      username: env.SEED_ADMIN_USERNAME,
      passwordHash: superAdminPasswordHash,
      role: "SUPER_ADMIN",
      designation: "Super Admin",
    },
  });
  logger.info(
    `Seeded super admin login — username: ${env.SEED_ADMIN_USERNAME}, password: ${env.SEED_ADMIN_PASSWORD}`,
  );

  const mlaPasswordHash = await bcrypt.hash("MlaChangeMe123!", 10);
  await prisma.staffMember.upsert({
    where: { username: "mla" },
    update: {},
    create: {
      name: "Atul Bhansali",
      username: "mla",
      passwordHash: mlaPasswordHash,
      role: "MLA",
      designation: "Member of Legislative Assembly",
    },
  });
  logger.info("Seeded sample MLA login — username: mla, password: MlaChangeMe123!");

  const staffPasswordHash = await bcrypt.hash("StaffChangeMe123!", 10);
  const sampleStaff = await prisma.staffMember.upsert({
    where: { username: "staff1" },
    update: {},
    create: {
      name: "Field Staff One",
      username: "staff1",
      passwordHash: staffPasswordHash,
      role: "STAFF",
      designation: "Field Officer",
    },
  });
  const firstWard = await prisma.ward.findFirst({ orderBy: { wardNumber: "asc" } });
  if (firstWard) {
    await prisma.staffWardAssignment.upsert({
      where: { staffId_wardId: { staffId: sampleStaff.id, wardId: firstWard.id } },
      update: {},
      create: { staffId: sampleStaff.id, wardId: firstWard.id },
    });
  }
  logger.info("Seeded sample field staff login — username: staff1, password: StaffChangeMe123!");
}

main()
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
