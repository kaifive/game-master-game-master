/**
 * Test data builders. Each builder makes fresh objects from defaults, with a
 * sequence number for unique ids, so no test hand-builds the same object
 * twice (docs/conventions/testing.md).
 */
export type Builder<T> = {
  (overrides?: Partial<T>): T;
  many: (count: number, overrides?: Partial<T>) => T[];
  reset: () => void;
};

export function defineBuilder<T extends object>(defaults: (n: number) => T): Builder<T> {
  let n = 0;
  const build = (overrides: Partial<T> = {}): T => {
    n += 1;
    return { ...structuredClone(defaults(n)), ...overrides };
  };
  return Object.assign(build, {
    many: (count: number, overrides?: Partial<T>) =>
      Array.from({ length: count }, () => build(overrides)),
    reset: () => {
      n = 0;
    },
  });
}
