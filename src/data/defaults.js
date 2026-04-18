/**
 * Default project assumptions — Burbank CA, prevailing wage.
 *
 * buildingSF / parkingStalls / openSpaceSF are used for $/SF metrics.
 * All percentage fields stored as decimals (0.05 = 5%).
 * regionFactor is a multiplier (1.15 = SoCal).
 */
export const DEFAULT_GLOBALS = {
  escalation: 0.04,        // To midpoint of construction (2028)
  laborBurden: 0.42,       // Prevailing wage benefits
  tax: 0.0975,             // CA + Burbank local
  insurance: 0.012,        // GL, builder's risk
  contingency: 0.05,       // Design + construction reserve
  fee: 0.045,              // GC overhead & profit
  regionFactor: 1.15,      // Southern California multiplier
  bond: 0.008,             // Payment & performance
  generalConditions: 0.08, // Jobsite management, temp facilities
  buildingSF: 97500,       // Building gross area
  parkingStalls: 310,      // Structured parking stalls
  openSpaceSF: 43000,      // Primary open space area
  designPhase: null,       // AACE design phase key (null = not set)
};
