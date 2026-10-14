const TOKEN_SHAPES: readonly RegExp[] = [
  /AIza[0-9A-Za-z\-_]{10,}/g,
  /sk-[A-Za-z0-9]{10,}/g,
  /ghp_[A-Za-z0-9]{10,}/g,
  /github_pat_[A-Za-z0-9_]{10,}/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  /ya29\.[0-9A-Za-z\-_]+/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

export function redact(text: string, secrets: readonly string[]): string {
  let out = text;
  const hidden = [...secrets]
    .filter((secret) => secret.length >= 4)
    .sort((left, right) => right.length - left.length);
  for (const secret of hidden) {
    out = out.split(secret).join('[redacted]');
  }
  for (const shape of TOKEN_SHAPES) {
    out = out.replace(shape, '[redacted]');
  }
  return out;
}
