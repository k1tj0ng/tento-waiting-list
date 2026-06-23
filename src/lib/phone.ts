export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatAuMobile(value: string): string {
  let d = digitsOnly(value);

  if (d.startsWith("61")) {
    d = "0" + d.slice(2);
  }
  d = d.slice(0, 10);

  const parts: string[] = [];
  if (d.length > 0) parts.push(d.slice(0, 4));
  if (d.length > 4) parts.push(d.slice(4, 7));
  if (d.length > 7) parts.push(d.slice(7, 10));

  return parts.join(" ");
}

export function isValidAuMobile(value: string): boolean {
  const d = digitsOnly(value);
  return /^04\d{8}$/.test(d);
}

export function toTelHref(value: string): string {
  const d = digitsOnly(value);
  if (d.startsWith("0")) return "+61" + d.slice(1);
  if (d.startsWith("61")) return "+" + d;
  return d;
}
