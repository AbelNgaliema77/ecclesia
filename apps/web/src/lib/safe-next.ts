export const safeNext = (value: string | string[] | undefined | null): string => {
  const candidate = Array.isArray(value) ? value[0] : value;
  const internal =
    candidate?.startsWith("/") === true &&
    !candidate.startsWith("//") &&
    !candidate.startsWith("/\\");
  return internal && candidate ? candidate : "/";
};
