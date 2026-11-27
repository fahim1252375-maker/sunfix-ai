export const MAX_EVIDENCE_IMAGE_BYTES = 10 * 1024 * 1024;

export function validateEvidenceImage(file: Pick<File, 'type' | 'size'>): string | null {
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    return 'Choose a JPEG or PNG image.';
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return 'The selected image is empty or has an invalid size.';
  }
  if (file.size > MAX_EVIDENCE_IMAGE_BYTES) {
    return 'Photos must be 10 MB or smaller.';
  }
  return null;
}
