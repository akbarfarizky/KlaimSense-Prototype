/**
 * Seed PostgreSQL dengan data sintetis KlaimSense.
 *
 * Prasyarat:
 *   1. DATABASE_URL sudah diisi pada .env
 *   2. npx prisma generate
 *   3. npx prisma db push   (atau migrate dev)
 *
 * Jalankan: npm run db:seed
 *
 * Catatan: script ini hanya mengisi struktur data inti (rumah sakit, klaim,
 * sensor, rule, kebijakan). Bila database tidak tersedia, aplikasi tetap
 * berjalan penuh dengan mock repository in-memory.
 */
import { PrismaClient } from "@prisma/client";
import { getSyntheticDataset } from "../src/lib/data/synthetic";
import { POLICY_DOCUMENTS, RULE_DEFINITIONS } from "../src/lib/reference-data";

const prisma = new PrismaClient();

async function main() {
  const dataset = getSyntheticDataset();
  console.log(
    `[seed] Menyiapkan ${dataset.hospitals.length} rumah sakit, ${dataset.claims.length} klaim, ${dataset.sensorEvents.length} event sensor…`,
  );

  // Rule & kebijakan
  for (const rule of RULE_DEFINITIONS) {
    await prisma.rule.upsert({
      where: { ruleId: rule.ruleId },
      create: {
        ruleId: rule.ruleId,
        name: rule.name,
        category: rule.category,
        severity: rule.severity,
        scoreImpact: rule.scoreImpact,
        active: rule.active,
        description: rule.description,
        threshold: rule.threshold,
        formula: rule.formula,
        example: rule.example,
        dataUsed: rule.dataUsed,
        policyRefs: rule.policyRefs,
      },
      update: {
        name: rule.name,
        description: rule.description,
        threshold: rule.threshold,
        formula: rule.formula,
        example: rule.example,
      },
    });
  }

  for (const doc of POLICY_DOCUMENTS) {
    await prisma.policyDocument.upsert({
      where: { docId: doc.docId },
      create: {
        docId: doc.docId,
        title: doc.title,
        issuer: doc.issuer,
        year: doc.year,
        available: doc.available,
        excerpt: doc.excerpt,
        tags: doc.tags,
      },
      update: { excerpt: doc.excerpt, available: doc.available },
    });
  }

  // Rumah sakit & kapasitas
  for (const hospital of dataset.hospitals) {
    await prisma.hospital.upsert({
      where: { id: hospital.id },
      create: {
        id: hospital.id,
        name: hospital.name,
        region: hospital.region,
        class: hospital.class,
        ownership: hospital.ownership,
        beds: hospital.beds,
        doctors: hospital.doctors,
        physiotherapists: hospital.physiotherapists,
        dialysisMachines: hospital.dialysisMachines,
        dialysisShiftsPerDay: hospital.dialysisShiftsPerDay,
        physioSessionsPerTherapistPerDay: hospital.physioSessionsPerTherapistPerDay,
        rooms: hospital.rooms,
        capacity: {
          create: {
            fisioterapi: hospital.dailyCapacity.fisioterapi,
            hemodialisis: hospital.dailyCapacity.hemodialisis,
          },
        },
      },
      update: { name: hospital.name, beds: hospital.beds },
    });
  }

  // Klaim (dalam batch)
  const BATCH = 200;
  for (let i = 0; i < dataset.claims.length; i += BATCH) {
    const slice = dataset.claims.slice(i, i + BATCH);
    await prisma.claim.createMany({
      data: slice.map((claim) => ({
        id: claim.id,
        hospitalId: claim.hospitalId,
        patientRef: claim.patientRef,
        serviceType: claim.serviceType,
        serviceDate: new Date(`${claim.serviceDate}T00:00:00.000Z`),
        quantity: claim.quantity,
        unitPrice: claim.unitPrice,
        totalValue: claim.totalValue,
        description: claim.description,
        previouslyPaid: claim.previouslyPaid,
        paidReferenceId: claim.paidReferenceId ?? null,
        aggregateDailyLine: claim.aggregateDailyLine,
        duplicateOf: claim.duplicateOf ?? null,
      })),
      skipDuplicates: true,
    });
    console.log(`[seed] Klaim ${Math.min(i + BATCH, dataset.claims.length)}/${dataset.claims.length}`);
  }

  // Event sensor
  for (let i = 0; i < dataset.sensorEvents.length; i += BATCH) {
    const slice = dataset.sensorEvents.slice(i, i + BATCH);
    await prisma.sensorEvent.createMany({
      data: slice.map((event) => ({
        id: event.id,
        hospitalId: event.hospitalId,
        machineId: event.machineId,
        status: event.status,
        powerWatts: event.powerWatts,
        currentAmps: event.currentAmps,
        timestamp: new Date(event.timestamp),
        signatureValid: event.signatureValid,
        periodDate: new Date(`${event.periodDate}T00:00:00.000Z`),
      })),
      skipDuplicates: true,
    });
  }

  console.log("[seed] Selesai.");
}

main()
  .catch((error) => {
    console.error("[seed] Gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
