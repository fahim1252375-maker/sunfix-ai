import test from 'node:test';
import assert from 'node:assert/strict';
import { mapInferenceSource } from './inferenceSource';

test('hybrid inference reports only the source confirmed by Firebase AI Logic', () => {
  assert.equal(mapInferenceSource('on_device', 'prefer_on_device'), 'on_device');
  assert.equal(mapInferenceSource('in_cloud', 'prefer_on_device'), 'in_cloud');
  assert.equal(mapInferenceSource(undefined, 'prefer_on_device'), 'unavailable');
});

test('cloud-only mode remains cloud when the SDK omits the optional source field', () => {
  assert.equal(mapInferenceSource('in_cloud', 'only_in_cloud'), 'in_cloud');
  assert.equal(mapInferenceSource(undefined, 'only_in_cloud'), 'in_cloud');
});
