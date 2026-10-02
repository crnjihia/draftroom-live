import { useEffect, useMemo } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

/**
 * Hook that creates a Yjs document and a WebSocket provider.
 * TODO: Connect to the collab‑server endpoint and handle awareness.
 */
export function useYjs() {
  const ydoc = useMemo(() => new Y.Doc(), []);
  const provider = useMemo(
    () =>
      new WebsocketProvider('ws://localhost:1234', 'andika-demo', ydoc, {
        // TODO: set connection options, authentication, etc.
      }),
    [ydoc],
  );

  useEffect(() => {
    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  return { ydoc, provider };
}
