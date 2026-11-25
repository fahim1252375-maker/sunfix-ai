import test from 'node:test';
import assert from 'node:assert/strict';
import { computeShadedPvModuleIndices, computeSolarPosition } from './solarPosition';

test('computeSolarPosition returns higher noon altitude than morning and flags simulated location', () => {
  const morning = computeSolarPosition({ latitudeDeg: 33.45, longitudeDeg: -112.07, hourDecimal: 7.5, dayOfYear: 172 });
  const noon = computeSolarPosition({ latitudeDeg: 33.45, longitudeDeg: -112.07, hourDecimal: 12.0, dayOfYear: 172 });

  assert.equal(noon.isSimulatedLocation, true);
  assert.ok(noon.altitudeDeg > morning.altitudeDeg, `Expected noon altitude (${noon.altitudeDeg}) > morning (${morning.altitudeDeg})`);
  assert.ok(noon.irradianceWm2 > morning.irradianceWm2);
  assert.ok(noon.sunVector[1] > morning.sunVector[1]);
});

test('computeShadedPvModuleIndices links STR-LOW scenario and parapet shading to PV module indices', () => {
  const solarLow = computeSolarPosition({ latitudeDeg: 33.45, longitudeDeg: -112.07, hourDecimal: 16.5, dayOfYear: 355 });
  const placements = [
    { pos: [-13.4, 3.8, -7.2] as [number, number, number], stringIndex: 0 },
    { pos: [-2.0, 3.8, -3.2] as [number, number, number], stringIndex: 3 },
    { pos: [-7.5, 3.8, 7.2] as [number, number, number], stringIndex: 4 },
  ];

  const shadedForced = computeShadedPvModuleIndices({
    solar: solarLow,
    placements,
    forceStringLowScenario: true,
  });
  assert.ok(shadedForced.has(1), 'String 4 (stringIndex 3) module should be shaded under STR-LOW');
});
