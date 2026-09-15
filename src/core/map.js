import { Random } from './random.js';
import { mapConfig } from '../data/map-config.js';
export function generateMap(seed, config = mapConfig) {
  const c = { ...mapConfig, ...config, weights: { ...mapConfig.weights, ...config.weights }, densities: { ...mapConfig.densities, ...config.densities } };
  if (c.floors < 4 || c.minNodes < 2 || c.maxNodes < c.minNodes) throw new Error('Map needs ≥4 floors and 2≤minNodes≤maxNodes');
  const rng = new Random(seed); const layers = []; const nodes = [];
  const weights = { ...c.weights }; for (const [key, density] of Object.entries(c.densities)) weights[key] = (weights[key] || 0) * density;
  for (let row = 0; row < c.floors; row++) {
    const count = row === c.floors - 1 ? 1 : rng.int(c.minNodes, c.maxNodes);
    const layer = Array.from({ length: count }, (_, col) => {
      const type = row === c.floors - 1 ? 'Boss' : row === c.floors - 2 && c.bossBefore ? c.bossBefore : row === 0 ? 'Combat' : rng.weighted(weights);
      return { id: `${row}-${col}`, row, col, x: (col + .5) / count + (rng.next() - .5) * .12, type, next: [] };
    }); layers.push(layer); nodes.push(...layer);
  }
  for (let row = 0; row < layers.length - 1; row++) {
    const a = layers[row], b = layers[row + 1];
    const link = (from, to) => { if (!from.next.includes(to.id)) from.next.push(to.id); };
    // Every source has an exit and every destination has an entrance.
    for (let i = 0; i < a.length; i++) link(a[i], b[Math.min(b.length - 1, Math.floor((i + .5) * b.length / a.length))]);
    for (let j = 0; j < b.length; j++) link(a[Math.min(a.length - 1, Math.floor((j + .5) * a.length / b.length))], b[j]);
    for (let i = 0; i < a.length; i++) if (rng.next() < c.branching) { const base = Math.floor((i + .5) * b.length / a.length); const other = Math.max(0, Math.min(b.length - 1, base + (rng.next() < .5 ? -1 : 1))); link(a[i], b[other]); }
    // Guarantee an early branch and reconvergence, even at branching=0.
    if (row === 0) { link(a[0], b[0]); link(a[0], b[1]); if (a[1]) link(a[1], b[1]); }
  }
  return { seed: String(seed), floors: c.floors, nodes };
}
export function availableNodes(map, currentId, visited = []) {
  if (!currentId) return map.nodes.filter(n => n.row === 0);
  const current = map.nodes.find(n => n.id === currentId);
  return map.nodes.filter(n => current?.next.includes(n.id) && !visited.includes(n.id));
}
