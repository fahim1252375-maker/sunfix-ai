import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_EVIDENCE_IMAGE_BYTES, validateEvidenceImage } from './fileValidation';

test('accepts non-empty JPEG and PNG evidence within the size limit', () => {
  assert.equal(validateEvidenceImage({ type: 'image/jpeg', size: 1024 }), null);
  assert.equal(validateEvidenceImage({ type: 'image/png', size: MAX_EVIDENCE_IMAGE_BYTES }), null);
});

test('rejects unsupported, empty, invalid-sized, and oversized evidence images', () => {
  assert.match(validateEvidenceImage({ type: 'image/gif', size: 1024 }) || '', /JPEG or PNG/);
  assert.match(validateEvidenceImage({ type: 'image/jpeg', size: 0 }) || '', /empty or has an invalid size/);
  assert.match(validateEvidenceImage({ type: 'image/jpeg', size: Number.NaN }) || '', /empty or has an invalid size/);
  assert.match(
    validateEvidenceImage({ type: 'image/jpeg', size: MAX_EVIDENCE_IMAGE_BYTES + 1 }) || '',
    /10 MB or smaller/,
  );
});
