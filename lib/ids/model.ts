import { z } from "zod";

/** An event's URL name, such as "holiday-2026". Safe to use as a path segment. */
export const Slug = z
  .string()
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes.");
export type Slug = z.infer<typeof Slug>;

/** Any document id: letters, numbers, dash and underscore. Safe as a Firebase key. */
export const EntityId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, dashes and underscores.");
export type EntityId = z.infer<typeof EntityId>;
