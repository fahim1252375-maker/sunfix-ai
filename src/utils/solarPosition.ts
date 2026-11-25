export interface SolarPositionInput {
  latitudeDeg: number;
  longitudeDeg: number;
  hourDecimal: number;
  dayOfYear?: number;
}

export interface SolarPositionResult {
  altitudeDeg: number;
  azimuthDeg: number;
  sunVector: [number, number, number];
  irradianceFactor: number;
  irradianceWm2: number;
  isSimulatedLocation: true;
  locationLabel: string;
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Computes solar altitude, azimuth (degrees clockwise from North), 3D directional
 * vector in SunFix scene coordinates (+X East, +Y Up, +Z South), and clear-sky
 * irradiance estimate. Explicitly tagged simulated site coordinates by default.
 */
export function computeSolarPosition(input: SolarPositionInput): SolarPositionResult {
  const latDeg = Math.max(-89, Math.min(89, Number.isFinite(input.latitudeDeg) ? input.latitudeDeg : 33.4484));
  const lngDeg = Math.max(-180, Math.min(180, Number.isFinite(input.longitudeDeg) ? input.longitudeDeg : -112.074));
  const hour = Math.max(0, Math.min(24, Number.isFinite(input.hourDecimal) ? input.hourDecimal : 12.5));
  const doy = Math.max(1, Math.min(365, Math.round(input.dayOfYear ?? 172))); // Summer/mid-year reference

  // Solar declination (Cooper's equation)
  const declRad = 23.44 * DEG2RAD * Math.sin(((2 * Math.PI) / 365) * (doy - 81));
  const latRad = latDeg * DEG2RAD;

  // Solar hour angle (15 deg per hour from solar noon 12:00)
  const hourAngleDeg = (hour - 12) * 15;
  const haRad = hourAngleDeg * DEG2RAD;

  const sinAlt =
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad);
  const clampedSinAlt = Math.max(-1, Math.min(1, sinAlt));
  const altRad = Math.asin(clampedSinAlt);
  const altitudeDeg = Number((altRad * RAD2DEG).toFixed(1));

  // Azimuth from North clockwise (0 = N, 90 = E, 180 = S, 270 = W)
  const cosAlt = Math.max(0.001, Math.cos(altRad));
  const cosAz = (Math.sin(declRad) - Math.sin(latRad) * clampedSinAlt) / (Math.cos(latRad) * cosAlt);
  const clampedCosAz = Math.max(-1, Math.min(1, cosAz));
  let azDeg = Math.acos(clampedCosAz) * RAD2DEG;
  if (hourAngleDeg > 0) {
    azDeg = 360 - azDeg;
  }
  const azimuthDeg = Number(azDeg.toFixed(1));

  // Convert to Three.js world vector (+X East, +Y Up, +Z South)
  const azRad = azimuthDeg * DEG2RAD;
  const horiz = Math.cos(Math.max(0.08, altRad));
  const radius = 34;
  const x = Number((Math.sin(azRad) * horiz * radius).toFixed(2));
  const y = Number((Math.max(0.1, Math.sin(Math.max(0.08, altRad))) * radius).toFixed(2));
  const z = Number((-Math.cos(azRad) * horiz * radius).toFixed(2));

  // Clear-sky simplified air-mass factor (zero when sun below horizon, subtle twilight floor for 3D legibility)
  const effectiveSin = Math.max(0, Math.sin(altRad));
  const irradianceFactor =
    altitudeDeg <= 0 ? 0.04 : Number(Math.min(1, Math.max(0.08, Math.pow(effectiveSin, 0.78) * 1.02)).toFixed(3));
  const irradianceWm2 = Math.round(irradianceFactor * 1000);

  return {
    altitudeDeg,
    azimuthDeg,
    sunVector: [x, y, z],
    irradianceFactor,
    irradianceWm2,
    isSimulatedLocation: true,
    locationLabel: `Simulated Site (${latDeg.toFixed(2)}°, ${lngDeg.toFixed(2)}°)`,
  };
}

export interface PvPlacementLike {
  pos: [number, number, number];
  stringIndex: number;
}

/**
 * Evaluates shading from the Mesa Ridge 0.65m perimeter parapet walls and
 * the rooftop HVAC/combiner obstructions along the opposite solar ray.
 * Low morning/afternoon sun angles or forced STR-LOW scenario shade String 4 (index 3).
 */
export function computeShadedPvModuleIndices(params: {
  solar: SolarPositionResult;
  placements: PvPlacementLike[];
  roofY?: number;
  forceStringLowScenario?: boolean;
}): Set<number> {
  const shaded = new Set<number>();
  const roofY = params.roofY ?? 3.2;

  // Low sun (< 28 deg) casts measurable shadow from parapet & HVAC housing onto adjacent PV rows
  const [sx, sy, sz] = params.solar.sunVector;
  const invY = Math.max(0.15, sy / 34);
  const rayX = sx / 34;
  const rayZ = sz / 34;

  // Obstruction A: Rooftop HVAC unit at [-7.5, roofY+0.72, 7.2] (3.4x1.25x2.1)
  // Obstruction B: South/West/East parapet walls (height 0.65m above roofY)
  params.placements.forEach((mod, idx) => {
    const [mx, my, mz] = mod.pos;
    const heightAboveParapet = Math.max(0, roofY + 0.68 - my);
    if (params.solar.altitudeDeg > 0 && params.solar.altitudeDeg < 34) {
      // Shadow projection distance along ground plane
      const shadowReach = (0.75 / Math.max(0.18, invY)) * 0.85;
      // West parapet at x = -16.85, East parapet at x = 16.85, South parapet at z = 10.85
      if (rayX < -0.2 && mx + 16.85 < shadowReach * Math.abs(rayX) + 1.2) {
        shaded.add(idx);
      }
      if (rayZ > 0.2 && 10.85 - mz < shadowReach * Math.abs(rayZ) + 1.8 && mod.stringIndex === 4) {
        shaded.add(idx);
      }
      void heightAboveParapet;
    }

    // HVAC shadow onto String 4 / Row 3 south-west when sun is south-west/low
    if (params.solar.altitudeDeg < 42 && rayZ > 0.1) {
      const projX = mx + (rayX / invY) * 0.9;
      const projZ = mz + (rayZ / invY) * 0.9;
      if (projX > -9.4 && projX < -5.6 && projZ > 5.8 && projZ < 8.6) {
        shaded.add(idx);
      }
    }

    // When STR-LOW fault scenario is selected, String 4 (index 3) exhibits localized shading/soiling
    if (params.forceStringLowScenario && mod.stringIndex === 3) {
      shaded.add(idx);
    }
  });

  return shaded;
}
