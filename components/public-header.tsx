import { Brand } from "@/components/brand";
import { ButtonLink } from "@/components/ui";
import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Brand />
        <nav aria-label="Primary navigation">
          <Link href="/programs">Programs</Link>
          <Link href="/signin">Sign in</Link>
          <ButtonLink href="/dashboard" variant="secondary">
            My portal
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
