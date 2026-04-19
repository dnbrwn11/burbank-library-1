import { useState, useCallback, useRef } from 'react';

export function useGenerateEstimate() {
  const [items, setItems]               = useState([]);
  const [progress, setProgress]         = useState({ batch: 0, totalBatches: 3, batchName: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [failedChunks, setFailedChunks] = useState([]); // chunk indices that failed
  const abortRef = useRef(null);

  // Core SSE reader — shared by generate() and retryChunk()
  const readStream = useCallback(async (res, onBatch, onBatchError) => {
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = '';
    let globals        = null;
    let ai_assumptions = [];
    let sanityCheck    = null;
    let failed         = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';

      for (const chunk of chunks) {
        if (!chunk.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(chunk.slice(6));

          if (event.type === 'start') {
            setProgress({ batch: 0, totalBatches: event.totalBatches ?? 3, batchName: 'Generating…' });

          } else if (event.type === 'batch') {
            onBatch(event.items || [], event.batchIndex, event.batchName);
            setProgress(prev => ({
              batch:       prev.batch + 1,
              totalBatches: prev.totalBatches,
              batchName:   `${event.batchName} complete (${event.itemCount} items)`,
            }));

          } else if (event.type === 'batch_error') {
            onBatchError?.(event.batchIndex, event.batchName, event.error);

          } else if (event.type === 'done') {
            globals        = event.globals;
            ai_assumptions = event.ai_assumptions ?? [];
            failed         = event.failedChunks    ?? [];
            sanityCheck    = event.sanityCheck     ?? null;
          }
        } catch {
          // skip malformed SSE event
        }
      }
    }

    return { globals, ai_assumptions, failed, sanityCheck };
  }, []);

  // Full generation
  // options.onChunkReady(items, batchIdx, batchName) — called as each chunk arrives
  const generate = useCallback(async (description, project, { onChunkReady } = {}) => {
    setIsGenerating(true);
    setItems([]);
    setFailedChunks([]);
    setProgress({ batch: 0, totalBatches: 3, batchName: 'Planning…' });

    const controller = new AbortController();
    abortRef.current = controller;

    const allItems = [];

    try {
      const res = await fetch('/api/generate-estimate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ description, project }),
        signal:  controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }

      const { globals, ai_assumptions, failed } = await readStream(
        res,
        (newItems, batchIdx, batchName) => {
          allItems.push(...newItems);
          allItems.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          setItems([...allItems]);
          // Notify orchestrator — fire async save without blocking SSE reading
          onChunkReady?.(newItems, batchIdx, batchName);
        },
        (chunkIdx, chunkName, error) => {
          console.warn(`[useGenerateEstimate] Chunk "${chunkName}" failed:`, error);
        },
      );

      setFailedChunks(failed);
      return { items: allItems, globals, ai_assumptions, sanityCheck };

    } finally {
      setIsGenerating(false);
    }
  }, [readStream]);

  // Retry a single failed chunk
  const retryChunk = useCallback(async (chunkIndex, description, project, { onChunkReady } = {}) => {
    setIsGenerating(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/generate-estimate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ description, project, retry_chunk: chunkIndex }),
        signal:  controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }

      const retryItems = [];
      const { failed } = await readStream(
        res,
        (newItems, batchIdx, batchName) => {
          retryItems.push(...newItems);
          setItems(prev => {
            const merged = [...prev.filter(i => !newItems.some(n => n.sort_order === i.sort_order)), ...newItems];
            merged.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
            return merged;
          });
          onChunkReady?.(newItems, batchIdx, batchName);
        },
      );

      // Remove from failed list if retry succeeded
      setFailedChunks(prev =>
        failed.includes(chunkIndex)
          ? prev // still failed
          : prev.filter(i => i !== chunkIndex)
      );

      return retryItems;
    } finally {
      setIsGenerating(false);
    }
  }, [readStream]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { generate, retryChunk, cancel, items, progress, isGenerating, failedChunks };
}
