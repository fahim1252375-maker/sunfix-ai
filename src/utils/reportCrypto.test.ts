import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanonicalReportPayload,
  canonicalizeJson,
  computeCanonicalSha256,
  verifyReportEnvelopeJson,
} from './reportCrypto';
import { DEMO_CASES, DEMO_EVIDENCE, DEMO_REPORTS, DEMO_WORK_ORDERS } from '../data/demoData';

test('canonicalizeJson produces identical strings regardless of key insertion order', () => {
  const a = canonicalizeJson({ b: 2, a: { y: true, x: 'hello' } });
  const b = canonicalizeJson({ a: { x: 'hello', y: true }, b: 2 });
  assert.equal(a, b);
});

test('computeCanonicalSha256 and verifyReportEnvelopeJson detect a 1-character tamper', async () => {
  const payload = buildCanonicalReportPayload({
    report: DEMO_REPORTS[0],
    linkedCase: DEMO_CASES[1],
    linkedWo: DEMO_WORK_ORDERS[0],
    linkedEvidence: DEMO_EVIDENCE,
  });
  const sha256 = await computeCanonicalSha256(payload);
  assert.equal(sha256.length, 64);

  const validJson = JSON.stringify({ payload, sha256 });
  const okRes = await verifyReportEnvelopeJson(validJson);
  assert.equal(okRes.ok, true);
  assert.equal(okRes.computedHash, sha256);

  // Tamper 1 character in summary
  const tamperedPayload = { ...payload, summary: payload.summary.replace('Routine', 'R0utine') };
  const tamperedJson = JSON.stringify({ payload: tamperedPayload, sha256 });
  const failRes = await verifyReportEnvelopeJson(tamperedJson);
  assert.equal(failRes.ok, false);
  assert.notEqual(failRes.computedHash, sha256);
});
