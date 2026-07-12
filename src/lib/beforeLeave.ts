type SaveFn = () => void | Promise<void>;

let handlers: SaveFn[] = [];

export function registerBeforeLeaveSave(fn: SaveFn): () => void {
  handlers.push(fn);
  return () => {
    handlers = handlers.filter(h => h !== fn);
  };
}

export async function flushBeforeLeaveSaves(): Promise<void> {
  await Promise.all(handlers.map(fn => fn()));
}
