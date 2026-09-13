import { PageHeader } from "@/components/ui";
import { ProgramForm } from "@/components/program-form";

export default async function NewProgramPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const workshop = (await searchParams).type === "WORKSHOP";
  return (
    <>
      <PageHeader
        eyebrow="New program"
        title={workshop ? "Create a workshop with a custom form" : "Create a program"}
        description="Start with the operating rules. The form, stages, and evaluation follow next."
      />
      <ProgramForm initialType={workshop ? "WORKSHOP" : "EVENT"} />
    </>
  );
}
