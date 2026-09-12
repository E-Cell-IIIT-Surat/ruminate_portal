// Event administration uses the institution's timezone consistently on browsers and servers.
export function eventTimeToIso(value: FormDataEntryValue | string | null): string | null {
  if (!value) return null;
  return new Date(`${String(value)}+05:30`).toISOString();
}

export function eventTimeInput(value?: string | null): string {
  if (!value) return "";
  return new Date(new Date(value).getTime() + 330 * 60_000).toISOString().slice(0, 16);
}
