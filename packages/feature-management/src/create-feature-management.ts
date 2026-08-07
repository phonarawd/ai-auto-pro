import {
  createGovernanceAPI,
  type GovernanceAPI,
} from "./api/governance-api.js";
import type { FeatureManagementDeps } from "./persist/ports.js";

/**
 * Factory for Feature→Policy→Runtime governance (S25A §5).
 */
export function createFeatureManagement(
  deps: FeatureManagementDeps,
): GovernanceAPI {
  return createGovernanceAPI(deps);
}
