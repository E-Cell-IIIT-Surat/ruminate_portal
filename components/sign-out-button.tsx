import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      className="sign-out-form"
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button className="sign-out-button" type="submit">
        Sign out
      </button>
    </form>
  );
}
