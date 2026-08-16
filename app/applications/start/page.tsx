import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { StartApplication } from "@/components/start-application";
import { hasDatabaseConfig } from "@/lib/env";

export const dynamic = "force-dynamic";
export default async function StartPage({ searchParams }: { searchParams: Promise<{ program?: string }> }) {
  if (!hasDatabaseConfig()) return <AuthGate title="Portal setup required" />;
  const session = await auth();
  if (!session?.user) return <AuthGate />;
  const { program } = await searchParams;
  return program ? (
    <StartApplication programId={program} />
  ) : (
    <AuthGate title="Choose a program first" body="Open a published program and select Apply now." />
  );
}
