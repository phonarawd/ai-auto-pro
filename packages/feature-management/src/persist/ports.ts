import type { ClimeStorage } from "@clime/storage";
import type {
  CapabilityPort,
  GovernorMetricsPort,
  SystemEventSink,
} from "../types.js";

export type FeatureManagementStorage = Pick<
  ClimeStorage,
  | "features"
  | "policies"
  | "audit"
  | "workflowRuns"
  | "plannerQueue"
  | "projects"
>;

export type FeatureManagementDeps = {
  storage: FeatureManagementStorage;
  capability?: CapabilityPort;
  governorMetrics?: GovernorMetricsPort;
  events?: SystemEventSink;
};

export const noopEventSink: SystemEventSink = {
  emit() {
    /* slice 3 buses wire later */
  },
};
