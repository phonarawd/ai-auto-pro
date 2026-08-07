import { createHash } from "node:crypto";
import type { KeywordGraph, KeywordType, NormalizedTrend } from "./schemas.js";

function nodeId(label: string): string {
  return `kw_${createHash("sha256").update(label.toLowerCase()).digest("hex").slice(0, 10)}`;
}

function classifyKeyword(label: string, isPrimary: boolean): KeywordType {
  const l = label.toLowerCase();
  if (l.includes("?") || l.startsWith("how") || l.startsWith("what") || l.includes("방법")) {
    return "Question";
  }
  if (l.includes("buy") || l.includes("가격") || l.includes("roi") || l.includes("투자")) {
    return "Commercial";
  }
  if (l.includes("2026") || l.includes("trend") || l.includes("rising")) {
    return "Trending";
  }
  if (l.length > 18 || l.split(/\s+/).length >= 3) return "Long-tail";
  if (isPrimary) return "Primary";
  return "Secondary";
}

/** Build / merge Keyword Graph from normalized trends (DA §4). */
export function buildKeywordGraphFromTrends(
  projectId: string,
  trends: NormalizedTrend[],
  previous?: KeywordGraph | null,
): KeywordGraph {
  const nodes = new Map<string, KeywordGraph["nodes"][number]>();
  const edges = new Map<string, KeywordGraph["edges"][number]>();

  const absorb = (graph: KeywordGraph | null | undefined) => {
    if (!graph) return;
    for (const n of graph.nodes) nodes.set(n.id, n);
    for (const e of graph.edges) edges.set(`${e.from}->${e.to}:${e.relation}`, e);
  };
  absorb(previous);

  for (const trend of trends) {
    const primaryLabel = trend.query;
    const primaryId = nodeId(primaryLabel);
    nodes.set(primaryId, {
      id: primaryId,
      label: primaryLabel,
      type: "Trending",
      score: trend.unifiedScore,
    });

    const supporting = trend.keywords.filter((k) => k.toLowerCase() !== primaryLabel.toLowerCase());
    for (const kw of supporting.slice(0, 8)) {
      const id = nodeId(kw);
      if (!nodes.has(id)) {
        nodes.set(id, {
          id,
          label: kw,
          type: classifyKeyword(kw, false),
          score: trend.climeFit,
        });
      }
      const key = `${primaryId}->${id}:related`;
      edges.set(key, { from: primaryId, to: id, relation: "related" });
      edges.set(`${id}->${primaryId}:expands`, {
        from: id,
        to: primaryId,
        relation: "expands",
      });
    }
  }

  return {
    schema_version: 1,
    kind: "growth.keyword_graph",
    projectId,
    updatedAt: new Date().toISOString(),
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  };
}

export function emptyKeywordGraph(projectId: string): KeywordGraph {
  return {
    schema_version: 1,
    kind: "growth.keyword_graph",
    projectId,
    updatedAt: new Date().toISOString(),
    nodes: [],
    edges: [],
  };
}
