// The five weapons. Each is a different *feel*, expressed as pure data:
//   speedScale   multiplies the launch speed range, so a bolt leaves faster
//                than a lobbed rock (faster + same aim = flatter, less drop).
//   gravityScale multiplies the gravity the shot feels in flight; low gravity
//                is the flat, barely-dropping bolt, full gravity is the floaty
//                catapult lob.
//   pierce       the shot passes THROUGH every creature on its path instead of
//                stopping at the first — line them up and skewer several.
//   blastRadius  on impact, kill every creature within this radius of the point
//                the shot terminated (0 = no splash). The endgame equalizer:
//                you aim at a cluster instead of needing a pixel-perfect hit.
//   ammoModifier nudges the level's rock count (pierce/splash kill more per
//                shot, so they hand out a little less). levels.js keeps a floor
//                so a level always has comfortably more shots than creatures.
//
// Horizontal reach (the aim wedge, xLimitAt) is identical for every weapon: a
// shot's x at depth z is tan(heading) * z regardless of speed or gravity, so
// creature placement never has to change per weapon. Only the vertical arc
// differs, and the per-level reachability test re-proves each weapon anyway.
export const WEAPON = {
  catapult:      { name: 'Catapult',       speedScale: 1.0,  gravityScale: 1.0,  pierce: false, blastRadius: 0,   ammoModifier: 0 },
  crossbow:      { name: 'Crossbow',       speedScale: 1.7,  gravityScale: 0.30, pierce: false, blastRadius: 0,   ammoModifier: 0 },
  spearcrossbow: { name: 'Spear-crossbow', speedScale: 1.7,  gravityScale: 0.30, pierce: true,  blastRadius: 0,   ammoModifier: -1 },
  spear:         { name: 'Spear',          speedScale: 1.35, gravityScale: 0.60, pierce: true,  blastRadius: 0,   ammoModifier: -1 },
  bazooka:       { name: 'Bazooka',        speedScale: 0.95, gravityScale: 0.90, pierce: false, blastRadius: 150, ammoModifier: -2 },
};

// The order weapons unlock in — also the sampler's one-weapon-per-level map.
export const WEAPON_ORDER = ['catapult', 'crossbow', 'spearcrossbow', 'spear', 'bazooka'];

// Look a weapon up by name, defaulting to the catapult so a bad name can never
// crash the flight loop (it just plays like the starting weapon).
export function weaponOf(name) {
  return WEAPON[name] ?? WEAPON.catapult;
}

// Campaign: five bands of ten-ish levels, in unlock order.
export function weaponForCampaign(n) {
  if (n <= 15) return 'catapult';
  if (n <= 25) return 'crossbow';
  if (n <= 35) return 'spearcrossbow';
  if (n <= 45) return 'spear';
  return 'bazooka';
}

// Sampler: one weapon per level so all five are played across the five levels.
export function weaponForSampler(n) {
  return WEAPON_ORDER[n - 1] ?? WEAPON_ORDER[WEAPON_ORDER.length - 1];
}
