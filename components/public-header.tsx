import { Brand } from "@/components/brand";
import { PublicNav } from "@/components/public-nav";
import { auth } from "@/auth";
import { hasDatabaseConfig } from "@/lib/env";

export async function PublicHeader() {
  const session = hasDatabaseConfig()
    ? await auth().catch((error) => {
        console.error("[public-header] auth lookup failed", error);
        return null;
      })
    : null;
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Brand />
        <PublicNav signedIn={Boolean(session?.user)} />
      </div>
    </header>
  );
}
