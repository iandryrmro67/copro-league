import {z} from 'zod';
// Backups carry the already-awarded result; restoring must never recalculate it.
const metric=z.number().finite().nullable();
const candidate=z.object({id:z.string(),playerIds:z.array(z.string()).min(1).max(2),name:z.string(),values:z.record(metric)});
const check=z.object({label:z.string(),passed:z.boolean(),actual:metric,target:z.number().finite(),key:z.string(),op:z.enum(['gte','lte','lt']).optional()});
const award=z.object({id:z.string(),name:z.string(),icon:z.string(),description:z.string(),category:z.string(),seasonId:z.string(),winner:candidate.nullable(),score:metric,status:z.literal('final'),checks:z.array(check),reason:z.string(),formula:z.array(z.object({key:z.string(),weight:z.number().finite(),low:z.boolean().optional()}))});
export const recognitionHistorySchema=z.array(z.object({seasonId:z.string(),finalizedAt:z.string(),awards:z.array(award).min(1).max(100)}).refine(s=>s.awards.every(a=>a.seasonId===s.seasonId)&&new Set(s.awards.map(a=>a.id)).size===s.awards.length,'Palmarès incompatible avec sa saison')).max(100);
export type RecognitionHistory=z.infer<typeof recognitionHistorySchema>;
