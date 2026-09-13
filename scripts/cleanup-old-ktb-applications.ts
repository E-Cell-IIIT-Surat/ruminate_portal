/** One-off, exact-target cleanup requested on 2026-09-13. Dry-run unless --apply is supplied. */
import { mkdir, open, readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { db } from "../lib/db";
import { reserveProgramSlug } from "../lib/services/program-slug";

const targets = [
  { id: "cmtzi2p12000004lcudcg93rc", referenceId: "KTB2-2026-1974FC", programId: "cmty1y8le000004l6esi6ym3f" },
  { id: "cmtzi9b4g000204lc79sb7ig2", referenceId: "KTB2-2026-602A8E", programId: "cmty1y8le000004l6esi6ym3f" },
  { id: "cmtzkchqu000104l76ysrr7dm", referenceId: "KTB-2026-AB0758", programId: "cmtziqhtz000204l9ga260tkb" },
  { id: "cmtzl95hl000l04le1odja80v", referenceId: "KTB-2026-36C728", programId: "cmtziqhtz000204l9ga260tkb" },
  { id: "cmtzmdsrn001e04kztx1phs5d", referenceId: "KTB-2026-215413", programId: "cmtziqhtz000204l9ga260tkb" },
];
const programIds = [...new Set(targets.map((item) => item.programId))];
const ids = targets.map((item) => item.id);
const apply = process.argv.includes("--apply");

try {
  await db.$transaction(
    async (tx) => {
      // Lock and recheck the exact records; never delete newly created KTB applications.
      await tx.$queryRaw`SELECT id FROM "Program" WHERE id IN (${Prisma.join(programIds)}) ORDER BY id FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Application" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
      const programs = await tx.program.findMany({ where: { id: { in: programIds } } });
      const applications = await tx.application.findMany({
        where: { id: { in: ids } },
        include: {
          answers: true,
          comments: true,
          files: true,
          revisions: true,
          stageHistory: true,
          statusHistory: true,
          notifications: true,
          reviewerAssignments: true,
          evaluations: { include: { scores: true } },
          team: { include: { members: true, joinRequests: true } },
        },
      });
      if (
        programs.length !== 2 ||
        programs.some((p) => p.name !== "KNOW THE BUSINESS" || !p.archivedAt || p.status !== "ARCHIVED")
      ) {
        throw new Error("Cleanup stopped: both exact KTB events must still be archived.");
      }
      if (!applications.length) {
        console.log("No target applications remain. Nothing deleted.");
        return;
      }
      if (
        applications.length !== targets.length ||
        applications.some(
          (a) =>
            !targets.some((t) => t.id === a.id && t.referenceId === a.referenceId && t.programId === a.programId) ||
            a.status !== "DRAFT" ||
            a.submittedAt ||
            a.files.length ||
            a.team?.isPublic ||
            a.reviewerAssignments.length ||
            a.evaluations.length,
        )
      )
        throw new Error("Cleanup stopped: target count, identity, draft status, files, or review/team state changed.");

      const summary = {
        mode: apply ? "apply" : "dry-run",
        references: applications.map((a) => a.referenceId),
        applications: applications.length,
        answers: applications.reduce((n, a) => n + a.answers.length, 0),
        privateTeams: applications.filter((a) => a.team).length,
        members: applications.reduce((n, a) => n + (a.team?.members.length ?? 0), 0),
        files: 0,
      };
      console.log(JSON.stringify(summary));
      if (!apply) return;

      const directory = path.resolve(".local-backups");
      await mkdir(directory, { recursive: true });
      const backupPath = path.join(directory, `ktb-cleanup-${Date.now()}.json`);
      const backup = JSON.stringify({ createdAt: new Date().toISOString(), programs, applications }, null, 2);
      const file = await open(backupPath, "wx", 0o600);
      try {
        await file.writeFile(backup, "utf8");
        await file.sync();
      } finally {
        await file.close();
      }
      if ((await readFile(backupPath, "utf8")) !== backup)
        throw new Error("Backup verification failed; nothing deleted.");

      const deleted = await tx.application.deleteMany({
        where: { id: { in: ids }, status: "DRAFT", submittedAt: null },
      });
      if (deleted.count !== targets.length) throw new Error("Delete count changed; rolling back.");
      for (const program of programs) {
        // Also unblock recreation on the currently deployed site, without launching any event.
        await reserveProgramSlug(tx, program.slug, null);
        await tx.auditLog.create({
          data: {
            programId: program.id,
            action: "application.cleanup.requested",
            entityType: "Program",
            entityId: program.id,
            metadata: {
              reason: "Owner-requested removal of old KTB drafts, 2026-09-13; local maintenance script",
              applicationIds: applications.filter((a) => a.programId === program.id).map((a) => a.id),
              backupFile: path.basename(backupPath),
            },
          },
        });
      }
      if (await tx.application.count({ where: { id: { in: ids } } })) throw new Error("Delete verification failed.");
      console.log(JSON.stringify({ deleted: deleted.count, backupPath, releasedSlugs: programs.map((p) => p.slug) }));
    },
    { maxWait: 10000, timeout: 60000 },
  );
  console.log(apply ? "Cleanup transaction committed." : "Dry-run complete; database unchanged.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Cleanup failed");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
