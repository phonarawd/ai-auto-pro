/**
 * @clime/growth-knowledge — Growth-facing Knowledge Store access façade.
 * One store + namespaces; no parallel god tables.
 */

export {
  KNOWLEDGE_NAMESPACES,
  knowledgeNamespaceSchema,
  knowledgeItemViewSchema,
  type KnowledgeNamespace,
  type KnowledgeItemView,
} from "./schemas.js";

export {
  createKnowledgeStore,
  isKnownNamespace,
  type KnowledgeStore,
  type KnowledgeStorage,
  type KnowledgeListFilter,
} from "./store.js";

export { createKnowledgeDomainHandlers } from "./api.js";
