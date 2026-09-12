import Link from "next/link";
import { publicPrograms } from "@/lib/data/public";
import { registrationState } from "@/lib/domain/program";
import { Badge } from "@/components/ui";

export async function HomePrograms() {
  let programs: Awaited<ReturnType<typeof publicPrograms>> = [];
  let failed = false;
  try {
    programs = await publicPrograms();
  } catch {
    failed = true;
  }
  const active = programs.filter((program) => ["OPEN", "UPCOMING"].includes(registrationState(program))).slice(0, 6);
  return (
    <section id="programs" className="home-programs">
      <p className="eyebrow">Take part</p>
      <h2>Programs & opportunities</h2>
      <p>Explore upcoming events, choose your program, and register from its details page.</p>
      <div className="program-grid">
        {active.map((program) => (
          <Link className="program-card" href={`/programs/${program.slug}`} key={program.id}>
            <Badge tone={registrationState(program) === "OPEN" ? "green" : "blue"}>{registrationState(program)}</Badge>
            <h3>{program.name}</h3>
            <p>{program.shortDescription}</p>
            <span>View details & register →</span>
          </Link>
        ))}
      </div>
      {!active.length && (
        <p role="status">
          {failed
            ? "Programs could not load. Please try the program directory again shortly."
            : "New programs will appear here when registration opens or is scheduled."}
        </p>
      )}
      <Link className="button button-secondary" href="/programs">
        View all programs & past events
      </Link>
    </section>
  );
}
