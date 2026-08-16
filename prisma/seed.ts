import { PrismaClient, RoleName, ProgramType, ProgramStatus, ParticipationMode, FieldType } from "@prisma/client";
import { permissions, rolePermissionMap } from "../lib/permissions";

const prisma = new PrismaClient();

async function assign(userId: string, roleName: RoleName) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    create: { userId, roleId: role.id },
    update: {},
  });
}

async function programWithForm(
  input: {
    slug: string;
    name: string;
    type: ProgramType;
    mode: ParticipationMode;
    capacity?: number;
    waitlist?: boolean;
    review: boolean;
    sections: {
      title: string;
      fields: {
        key: string;
        label: string;
        type: FieldType;
        required?: boolean;
        fileTypes?: string[];
        maxBytes?: number;
      }[];
    }[];
    stages: string[];
  },
  adminId: string,
) {
  const existing = await prisma.program.findUnique({ where: { slug: input.slug } });
  if (existing) return existing;
  const opens = new Date(Date.now() - 86_400_000);
  const closes = new Date(Date.now() + 30 * 86_400_000);
  const program = await prisma.program.create({
    data: {
      slug: input.slug,
      name: input.name,
      shortDescription: `${input.name} sample configuration for development and workflow testing.`,
      description: `Development-only ${input.name} configuration. It uses the shared Ruminate program engine.`,
      type: input.type,
      status: ProgramStatus.REGISTRATION_OPEN,
      registrationOpenAt: opens,
      registrationCloseAt: closes,
      startAt: new Date(Date.now() + 40 * 86_400_000),
      capacity: input.capacity,
      waitlistEnabled: input.waitlist ?? false,
      participationMode: input.mode,
      teamMinSize: input.mode === "TEAM" ? 1 : 1,
      teamMaxSize: input.mode === "TEAM" ? 4 : 1,
      requiresReview: input.review,
      createdById: adminId,
    },
  });
  const form = await prisma.form.create({ data: { programId: program.id, name: `${input.name} application` } });
  const version = await prisma.formVersion.create({
    data: { formId: form.id, version: 1, status: "PUBLISHED", publishedAt: new Date(), publishedById: adminId },
  });
  for (const [sectionIndex, section] of input.sections.entries()) {
    const created = await prisma.formSection.create({
      data: { formVersionId: version.id, title: section.title, order: sectionIndex + 1 },
    });
    for (const [fieldIndex, field] of section.fields.entries())
      await prisma.formField.create({
        data: {
          sectionId: created.id,
          key: field.key,
          label: field.label,
          type: field.type,
          required: field.required ?? false,
          allowedFileTypes: field.fileTypes ?? [],
          maxFileSizeBytes: field.maxBytes,
          order: fieldIndex + 1,
        },
      });
  }
  const stages = [];
  for (const [index, name] of input.stages.entries())
    stages.push(
      await prisma.programStage.create({
        data: {
          programId: program.id,
          name,
          order: index + 1,
          isInitial: index === 0,
          isTerminal: index === input.stages.length - 1,
        },
      }),
    );
  if (input.review) {
    const rubric = await prisma.rubric.create({
      data: { programId: program.id, stageId: stages[Math.min(1, stages.length - 1)].id, name: "Round 1 rubric" },
    });
    for (const [index, criterion] of ["Problem relevance", "Innovation", "Feasibility", "Impact"].entries())
      await prisma.rubricCriterion.create({
        data: { rubricId: rubric.id, name: criterion, maxScore: 10, weight: index === 0 ? 1.5 : 1, order: index + 1 },
      });
  }
  return program;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Development seed is disabled in production");
  for (const key of permissions) await prisma.permission.upsert({ where: { key }, create: { key }, update: {} });
  for (const name of Object.values(RoleName)) {
    const role = await prisma.role.upsert({ where: { name }, create: { name }, update: {} });
    for (const key of rolePermissionMap[name]) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
  }
  const admin = await prisma.user.upsert({
    where: { email: "admin@ruminate.local" },
    create: { email: "admin@ruminate.local", name: "Development Admin" },
    update: {},
  });
  const participant = await prisma.user.upsert({
    where: { email: "participant@ruminate.local" },
    create: { email: "participant@ruminate.local", name: "Development Participant", institution: "IIIT Surat" },
    update: {},
  });
  const reviewer = await prisma.user.upsert({
    where: { email: "reviewer@ruminate.local" },
    create: { email: "reviewer@ruminate.local", name: "Development Reviewer" },
    update: {},
  });
  const manager = await prisma.user.upsert({
    where: { email: "manager@ruminate.local" },
    create: { email: "manager@ruminate.local", name: "Development Program Manager" },
    update: {},
  });
  await assign(admin.id, RoleName.SUPER_ADMIN);
  await assign(participant.id, RoleName.PARTICIPANT);
  await assign(reviewer.id, RoleName.REVIEWER);
  await assign(manager.id, RoleName.PROGRAM_MANAGER);
  const startupFields = [
    {
      title: "Team",
      fields: [{ key: "startup_name", label: "Startup name", type: FieldType.SHORT_TEXT, required: true }],
    },
    {
      title: "Startup information",
      fields: [
        { key: "problem", label: "Problem", type: FieldType.LONG_TEXT, required: true },
        { key: "solution", label: "Solution", type: FieldType.LONG_TEXT, required: true },
        { key: "target_market", label: "Target market", type: FieldType.LONG_TEXT, required: true },
        {
          key: "pitch_deck",
          label: "Pitch deck",
          type: FieldType.FILE,
          required: true,
          fileTypes: ["application/pdf"],
          maxBytes: 10 * 1024 * 1024,
        },
      ],
    },
  ];
  const udbhav = await programWithForm(
    {
      slug: "udbhav-2026-demo",
      name: "UdbhAV 2026 · Development Demo",
      type: ProgramType.STARTUP_COMPETITION,
      mode: ParticipationMode.TEAM,
      review: true,
      sections: startupFields,
      stages: ["Application", "Round 1", "Round 2", "Final"],
    },
    admin.id,
  );
  await programWithForm(
    {
      slug: "ssip-demo",
      name: "SSIP · Development Demo",
      type: ProgramType.SSIP,
      mode: ParticipationMode.TEAM,
      review: true,
      sections: [
        {
          title: "Proposal",
          fields: [
            { key: "problem_statement", label: "Problem statement", type: FieldType.LONG_TEXT, required: true },
            { key: "innovation", label: "Innovation", type: FieldType.LONG_TEXT, required: true },
            { key: "budget", label: "Budget", type: FieldType.NUMBER, required: true },
            {
              key: "proposal",
              label: "Proposal document",
              type: FieldType.FILE,
              required: true,
              fileTypes: ["application/pdf"],
              maxBytes: 10 * 1024 * 1024,
            },
          ],
        },
      ],
      stages: ["Submission", "Initial review", "Revision", "Committee review", "Decision"],
    },
    admin.id,
  );
  await programWithForm(
    {
      slug: "industry-visit-demo",
      name: "Industry Visit · Development Demo",
      type: ProgramType.INDUSTRY_VISIT,
      mode: ParticipationMode.INDIVIDUAL,
      capacity: 50,
      waitlist: true,
      review: false,
      sections: [
        {
          title: "Registration",
          fields: [
            { key: "phone", label: "Phone", type: FieldType.PHONE, required: true },
            { key: "student_id", label: "Student ID", type: FieldType.SHORT_TEXT, required: true },
            { key: "emergency_contact", label: "Emergency contact", type: FieldType.PHONE, required: true },
            { key: "consent", label: "I agree to the visit rules", type: FieldType.CONSENT, required: true },
          ],
        },
      ],
      stages: ["Registration", "Confirmed"],
    },
    admin.id,
  );
  await prisma.programManager.upsert({
    where: { programId_userId: { programId: udbhav.id, userId: manager.id } },
    create: { programId: udbhav.id, userId: manager.id },
    update: {},
  });
  console.log(
    "Development seed complete: admin, participant, reviewer, manager, UdbhAV, SSIP, and Industry Visit configurations.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
