export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMPORT_EXTENSIONS = [".csv"];
export const MAX_IMPORT_ROWS = 50_000;
export const DUPLICATE_IMPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function hasAllowedImportExtension(filename: string) {
  const lower = filename.trim().toLowerCase();
  return ALLOWED_IMPORT_EXTENSIONS.some((extension) =>
    lower.endsWith(extension),
  );
}
