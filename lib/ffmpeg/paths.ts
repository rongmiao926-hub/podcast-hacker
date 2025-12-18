export function tmpPath(name: string) {
  // Vercel serverless typically uses /tmp
  return `/tmp/${name}`;
}
