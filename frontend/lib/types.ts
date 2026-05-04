export type GraphNode = {
  id: number;
  type: string;
  source_key: string;
  props: Record<string, unknown>;
  degree: number;
};

export type GraphEdge = {
  src: number;
  dst: number;
  type: string;
  props: Record<string, unknown>;
};

export type GraphPayload = {
  repo: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type RepoSummary = {
  owner: string;
  name: string;
  slug: string;
  default_branch: string | null;
  last_indexed_at: string | null;
  head_sha: string | null;
  node_counts: Record<string, number>;
};

export type ChatRole = "user" | "assistant";

export type ToolCallChip = {
  id: string;
  name: string;
  args: Record<string, unknown>;
  summary?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  toolCalls: ToolCallChip[];
  done: boolean;
};
