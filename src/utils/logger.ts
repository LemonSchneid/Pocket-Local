type LogMetadata = Record<string, unknown>;

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
};

export const logError = (
  context: string,
  error: unknown,
  metadata?: LogMetadata,
) => {
  const payload = {
    context,
    ...formatError(error),
    metadata,
  };
  console.error("[Pocket Export]", payload);
};

export const logWarning = (
  context: string,
  message: string,
  metadata?: LogMetadata,
) => {
  const payload = { context, message, metadata };
  console.warn("[Pocket Export]", payload);
};
