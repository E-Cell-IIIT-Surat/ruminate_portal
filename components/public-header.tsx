import { Brand } from "@/components/brand";
import { ButtonLink } from "@/components/ui";
import Link from "next/link";
import { auth } from "@/auth";
import { hasDatabaseConfig } from "@/lib/env";

export async function PublicHeader() {
  const session = hasDatabaseConfig() ? await auth() : null;
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Brand />
        <nav aria-label="Primary navigation">
          <Link href="/programs">Programs</Link>
          {!session?.user && <Link href="/signin">Sign in</Link>}
          <ButtonLink href={session?.user ? "/dashboard" : "/signin"} variant="secondary">
            My portal
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
