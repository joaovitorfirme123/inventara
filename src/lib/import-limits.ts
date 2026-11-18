export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
// Limite do corpo compactado (gzip) enviado pelo navegador: fica abaixo do teto de 4,5 MB da Vercel.
export const MAX_IMPORT_COMPRESSED_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMPORT_EXTENSIONS = [".csv"];
export const MAX_IMPORT_ROWS = 150_000;
export const DUPLICATE_IMPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function hasAllowedImportExtension(filename: string) {
  const lower = filename.trim().toLowerCase();
  return ALLOWED_IMPORT_EXTENSIONS.some((extension) =>
    lower.endsWith(extension),
  );
}
