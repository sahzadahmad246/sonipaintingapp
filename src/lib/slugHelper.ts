import { Model } from "mongoose";

interface SlugOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  baseSlug: string;
  field?: string; // Default: 'slug'
}

/**
 * Generates a unique slug for a MongoDB model.
 * If the slug exists, it appends a counter (e.g., my-slug-1).
 */
export async function generateUniqueSlug({
  model,
  baseSlug,
  field = "slug",
}: SlugOptions): Promise<string> {
  const originalSlug = baseSlug;
  let slug = originalSlug;
  let counter = 1;

  while (await model.findOne({ [field]: slug })) {
    slug = `${originalSlug}-${counter}`;
    counter++;
  }

  return slug;
}
