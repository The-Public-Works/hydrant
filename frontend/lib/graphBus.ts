// Tiny event bus the chat panel uses to push "nodes_visited" highlight events
// to the graph panel without prop-drilling through a parent.

type Listener = (ids: number[]) => void;

const listeners = new Set<Listener>();

export function subscribeNodesVisited(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitNodesVisited(ids: number[]): void {
  for (const fn of listeners) fn(ids);
}
