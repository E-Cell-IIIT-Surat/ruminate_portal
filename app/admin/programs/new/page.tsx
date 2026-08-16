import { PageHeader } from "@/components/ui";
import { ProgramForm } from "@/components/program-form";

export default function NewProgramPage() {
  return (
    <>
      <PageHeader
        eyebrow="New program"
        title="Create a program"
        description="Start with the operating rules. The form, stages, and evaluation follow next."
      />
      <ProgramForm />
    </>
  );
}
