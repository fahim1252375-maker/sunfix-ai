import test from 'node:test';
import assert from 'node:assert/strict';
import type { Asset } from '../types/sunfix';
import { validateWorkspaceAssets } from './workspaceValidation';

function asset(components: unknown[] = []): Asset {
  return {
    id: 'asset-1',
    ownerId: 'user-1',
    name: 'Test site',
    siteType: 'residential',
    locationLabel: 'Test location',
    capacityKw: 5,
    status: 'nominal',
    inverterModel: 'Model X',
    inverterSerial: 'INV-1',
    panelCount: 10,
    installedYear: 2024,
    lastInspectionAt: '',
    isDemo: false,
    components,
    createdAt: '',
    updatedAt: '',
  } as Asset;
}

test('keeps valid assets and valid component records', () => {
  const valid = asset([{ id: 'component-1', name: 'Inverter' }]);
  const result = validateWorkspaceAssets([valid]);

  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].components.length, 1);
  assert.deepEqual(result.issues, []);
});

test('drops null, primitive, array, and malformed asset entries', () => {
  const result = validateWorkspaceAssets([null, 42, [], { id: 'asset-2', name: 'Missing components' }]);

  assert.deepEqual(result.assets, []);
  assert.equal(result.issues.length, 4);
  assert.ok(result.issues.every((issue) => issue.reason === 'asset_not_object' || issue.reason === 'asset_invalid_shape'));
});

test('filters malformed nested components without discarding the parent asset', () => {
  const original = asset([
    null,
    7,
    [],
    { name: 'No id' },
    { id: 'component-ok', name: 'Valid component' },
  ]);
  const result = validateWorkspaceAssets([original]);

  assert.equal(result.assets.length, 1);
  assert.deepEqual(
    result.assets[0].components.map((component) => component.id),
    ['component-ok'],
  );
  assert.equal(result.issues.length, 4);
  assert.deepEqual(original.components, [
    null,
    7,
    [],
    { name: 'No id' },
    { id: 'component-ok', name: 'Valid component' },
  ]);
});

test('keeps assets with no usable components so the views can show an empty state', () => {
  const result = validateWorkspaceAssets([asset([null, { name: 'Missing id' }])]);

  assert.equal(result.assets.length, 1);
  assert.deepEqual(result.assets[0].components, []);
  assert.equal(result.issues.length, 2);
});

test('does not mutate the original asset or its component array', () => {
  const original = asset([{ id: 'component-1' }, null]);
  const originalComponents = original.components;

  const result = validateWorkspaceAssets([original]);

  assert.notEqual(result.assets[0], original);
  assert.notEqual(result.assets[0].components, originalComponents);
  assert.equal(original.components.length, 2);
});

test('reports a safe issue for a non-array workspace asset collection', () => {
  const result = validateWorkspaceAssets({ assets: [] });

  assert.deepEqual(result.assets, []);
  assert.deepEqual(result.issues, [{ path: 'assets', reason: 'asset_invalid_shape' }]);
});
