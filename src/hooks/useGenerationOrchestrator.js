import { useState, useEffect, useRef, useCallback } from 'react';
import { useGenerateEstimate } from '../../lib/useGenerateEstimate';
import { createLineItems, updateScenario } from '../supabase/db';

// Orchestrates streaming generation: starts the SSE stream, saves each chunk to
// Supabase as it arrives, injects saved rows into useProjectData, and tracks
// progress for the GenerationBanner.
export function useGenerationOrchestrator({
  genParams,          // { description, projectCtx } from App.jsx, or null
  activeScenarioId,   // current baseline scenario ID from useProjectData
  scenarioGlobals,    // current scenario globals (for merging)
  injectItems,        // from useProjectData — merges saved rows into state
  onNewIds,           // callback(Set<id>) — for fade-in animation tracking
  onClear,            // called after auto-dismiss so App.jsx can clear genParams
}) {
  const { generate, retryChunk, progress, isGenerating } = useGenerateEstimate();

  const [status, setStatus]       = useState('idle'); // 'idle'|'generating'|'partial'|'complete'|'error'
  const [itemCount, setItemCount] = useState(0);
  const [failedChunks, setFailedChunks] = useState([]);
  const [errorMsg, setErrorMsg]   = useState(null);

  const startedRef       = useRef(false);
  const descriptionRef   = useRef(null);
  const projectCtxRef    = useRef(null);
  const scenarioIdRef    = useRef(null);
  const globalsRef       = useRef(null);

  // Keep refs current for use inside async callbacks
  useEffect(() => { scenarioIdRef.current = activeScenarioId; }, [activeScenarioId]);
  useEffect(() => { globalsRef.current   = scenarioGlobals;  }, [scenarioGlobals]);

  // Save a chunk's raw items (snake_case from SSE) to Supabase and inject into state
  const saveChunk = useCallback(async (chunkItems) => {
    const sid = scenarioIdRef.current;
    if (!sid || !chunkItems?.length) return;
    const stamped = chunkItems.map(it => ({
      ...it,
      in_summary:  it.in_summary  ?? true,
      is_archived: it.is_archived ?? false,
    }));
    const { data: savedRows, error } = await createLineItems(sid, stamped);
    if (error) {
      console.error('[orchestrator] createLineItems error:', error.message);
      return;
    }
    if (savedRows?.length) {
      injectItems(savedRows);
      onNewIds?.(new Set(savedRows.map(r => r.id)));
      setItemCount(prev => prev + savedRows.length);
    }
  }, [injectItems, onNewIds]);

  // Start generation when genParams + activeScenarioId are both available
  useEffect(() => {
    if (!genParams || !activeScenarioId || startedRef.current) return;
    startedRef.current = true;
    descriptionRef.current = genParams.description;
    projectCtxRef.current  = genParams.projectCtx;

    setStatus('generating');
    setItemCount(0);
    setFailedChunks([]);
    setErrorMsg(null);

    (async () => {
      try {
        const { globals, ai_assumptions, failedChunks: fc } = await generate(
          genParams.description,
          genParams.projectCtx,
          {
            onChunkReady: (chunkItems) => {
              // Fire-and-forget save — doesn't block SSE reading
              saveChunk(chunkItems).catch(err =>
                console.error('[orchestrator] saveChunk error:', err.message)
              );
            },
          },
        );

        // Save globals + assumptions once all chunks complete
        const sid = scenarioIdRef.current;
        if (sid) {
          const updates = {};
          if (globals && typeof globals === 'object') {
            updates.globals = { ...(globalsRef.current || {}), ...globals };
          }
          if (ai_assumptions?.length) updates.ai_assumptions = ai_assumptions;
          if (Object.keys(updates).length) {
            await updateScenario(sid, updates).catch(err =>
              console.error('[orchestrator] updateScenario error:', err.message)
            );
          }
        }

        setFailedChunks(fc || []);
        const nextStatus = (fc?.length) ? 'partial' : 'complete';
        setStatus(nextStatus);

        if (!fc?.length) {
          setTimeout(() => { setStatus('idle'); onClear?.(); }, 3000);
        }
      } catch (err) {
        if (err.name === 'AbortError') { setStatus('idle'); return; }
        console.error('[orchestrator] generation error:', err.message);
        setErrorMsg(err.message || 'Generation failed');
        setStatus('error');
      }
    })();
  }, [genParams, activeScenarioId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = useCallback(async (chunkIndex) => {
    const desc = descriptionRef.current;
    const ctx  = projectCtxRef.current;
    const sid  = scenarioIdRef.current;
    if (!desc || !sid) return;

    setStatus('generating');
    try {
      await retryChunk(chunkIndex, desc, ctx, {
        onChunkReady: (chunkItems) => {
          saveChunk(chunkItems).catch(err =>
            console.error('[orchestrator] retry saveChunk error:', err.message)
          );
        },
      });
      const remaining = failedChunks.filter(i => i !== chunkIndex);
      setFailedChunks(remaining);
      const nextStatus = remaining.length ? 'partial' : 'complete';
      setStatus(nextStatus);
      if (!remaining.length) setTimeout(() => { setStatus('idle'); onClear?.(); }, 3000);
    } catch (err) {
      console.error('[orchestrator] retry error:', err.message);
      setStatus('partial');
    }
  }, [failedChunks, retryChunk, saveChunk, onClear]);

  return {
    status,           // 'idle'|'generating'|'partial'|'complete'|'error'
    progress,         // { batch, totalBatches, batchName } from useGenerateEstimate
    itemCount,
    failedChunks,
    errorMsg,
    isGenerating,
    handleRetry,
  };
}
