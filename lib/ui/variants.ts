type ClassValue = string | false | null | undefined;

/** Joins class names, skipping empty values. */
export const cx = (...classes: ClassValue[]): string => classes.filter(Boolean).join(" ");

type VariantMap = Record<string, Record<string, string>>;
type Choice<V extends VariantMap> = { [K in keyof V]?: keyof V[K] };

/**
 * Class names for a component's variants, so components never build
 * class strings by hand (docs/conventions/engineering.md).
 */
export function variants<V extends VariantMap>(config: {
  base: string;
  variants: V;
  defaults: { [K in keyof V]: keyof V[K] };
}) {
  return (choice: Choice<V> & { className?: string } = {}): string => {
    const picked = Object.keys(config.variants).map((name) => {
      const key = choice[name] ?? config.defaults[name];
      return config.variants[name]?.[key as string];
    });
    return cx(config.base, ...picked, choice.className);
  };
}
