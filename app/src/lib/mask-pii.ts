export function maskPhone(text: string): string {
  return text.replace(/1[3-9]\d{9}/g, (m) => m.slice(0, 3) + "****" + m.slice(7));
}

export function maskIdCard(text: string): string {
  return text.replace(/\d{17}[\dXx]/gi, (m) => m.slice(0, 6) + "********" + m.slice(14));
}

export function maskPii(text: string): string {
  return maskIdCard(maskPhone(text));
}
