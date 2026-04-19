import { useState, useCallback, useRef } from 'react';

export function useGenerateEstimate() {
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState({ batch: 0, totalBatches: 5, batchName: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef(null);

  // Returns { items, globals } on success, throws on fatal error.
  // Batch errors are tolerated — generation continues with remaining batches.
  const generate = useCallback(async (description, project) => {
    setIsGenerating(true);
    setItems([]);
    setProgress({ batch: 0, totalBatches: 5, batchName: 'Initializing…' });

    const controller = new AbortController();
    abortRef.current = controller;

    const allItems = [];
    let totalBatches = 5;
    let globals = null;
    let ai_assumptions = [];

    try {
      const res = await fetch('/api/generate-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, project }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
              totalBatches = event.totalBatches;
              setProgress({ batch: 0, totalBatches, batchName: 'Starting…' });
            } else if (event.type === 'batch') {
              allItems.push(...event.items);
              setItems([...allItems]);
              setProgress({ batch: event.batchIndex + 1, totalBatches, batchName: event.batchName });
            } else if (event.type === 'done') {
              globals = event.globals;
              if (Array.isArray(event.ai_assumptions)) ai_assumptions = event.ai_assumptions;
            }
          } catch {
            // skip malformed SSE event
          }
        }
      }

      return { items: allItems, globals, ai_assumptions };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { generate, cancel, items, progress, isGenerating };
}
