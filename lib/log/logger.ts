type Level = "info" | "warn" | "error";
type Context = Record<string, unknown>;

const SECRET = /pass(word|phrase)?|secret|token|authorization|cookie|api[-_]?key/i;

/** Copies a value for logging with secrets removed and errors flattened. */
function clean(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[deep]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        SECRET.test(k) ? "[redacted]" : clean(v, depth + 1),
      ]),
    );
  }
  return value;
}

type Options = {
  write?: (level: Level, line: string) => void;
  now?: () => Date;
};

const defaultWrite = (level: Level, line: string) => {
  // The one place allowed to write to the console for normal logs.
  // eslint-disable-next-line no-console
  if (level === "info") console.log(line);
  else if (level === "warn") console.warn(line);
  else console.error(line);
};

/** Structured JSON logs, one line each, with secrets never written. */
export function createLogger({ write = defaultWrite, now = () => new Date() }: Options = {}) {
  const emit = (level: Level, msg: string, context: Context = {}) => {
    const body = clean(context) as Context;
    write(level, JSON.stringify({ level, msg, time: now().toISOString(), ...body }));
  };
  return {
    info: (msg: string, context?: Context) => {
      emit("info", msg, context);
    },
    warn: (msg: string, context?: Context) => {
      emit("warn", msg, context);
    },
    error: (msg: string, context?: Context) => {
      emit("error", msg, context);
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;

export const log = createLogger();
