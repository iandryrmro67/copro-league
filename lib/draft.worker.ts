import { computeDraft, type DraftRequest } from './draft.ts';
self.onmessage = async (event: MessageEvent<DraftRequest>) => {
  try { self.postMessage({ result: await computeDraft(event.data) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Le tirage a échoué. Réessaie.' }); }
};
