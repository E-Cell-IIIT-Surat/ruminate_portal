/** Quote CSV cells and neutralize spreadsheet formulas, including leading whitespace. */
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  let start = 0;
  while (start < text.length && (text.charCodeAt(start) <= 31 || /\s/.test(text[start]))) start++;
  if (/^[=+@-]/.test(text.slice(start)) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
