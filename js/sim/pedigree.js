// The pedigree book: who is related to whom, and how inbred a chick of two birds would be.
// ped is a Map of id → { s: sireId, d: damId, F: its own inbreeding coefficient }. Ids only ever grow, so a parent's id
// is always smaller than its chick's; a bird with unknown parents (0) is treated as unrelated to everyone.
export function kinship(ped, a, b, memo = new Map()) {
  if (!a || !b) return 0;
  if (a === b) { const r = ped.get(a); return 0.5 * (1 + (r ? r.F || 0 : 0)); }
  if (a < b) { const t = a; a = b; b = t; }                       // a is the younger bird
  const key = a * 1048576 + b, hit = memo.get(key); if (hit !== undefined) return hit;
  const r = ped.get(a);
  const v = r ? 0.5 * (kinship(ped, r.s, b, memo) + kinship(ped, r.d, b, memo)) : 0;
  memo.set(key, v); return v;
}
// the inbreeding coefficient a chick of this pair would have (full siblings 0.25, half siblings 0.125)
export const coi = (ped, sire, dam) => kinship(ped, sire, dam);
// ancestors of a bird out to `depth` generations: [[self], [sire, dam], [four grandparents], …] with 0 for unknown
export function tree(ped, id, depth = 3) {
  const rows = [[id]];
  for (let d = 1; d <= depth; d++) rows.push(rows[d - 1].flatMap(x => { const r = x && ped.get(x); return r ? [r.s || 0, r.d || 0] : [0, 0]; }));
  return rows;
}
// keep only the rows still needed: live birds, their ancestors within `depth` generations, and anything in `keep`
export function prune(ped, liveIds, depth = 6, keep = []) {
  const want = new Set(keep);
  const walk = (id, d) => { if (!id || !ped.has(id)) return; want.add(id); if (d <= 0) return; const r = ped.get(id); walk(r.s, d - 1); walk(r.d, d - 1); };
  for (const id of liveIds) walk(id, depth);
  const out = new Map(); for (const [id, r] of ped) if (want.has(id)) out.set(id, r);
  return out;
}
