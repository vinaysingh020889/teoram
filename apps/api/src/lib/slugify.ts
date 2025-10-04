export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")   // replace non-alphanumeric with hyphens
    .replace(/(^-|-$)+/g, "");     // remove leading/trailing hyphens
}
