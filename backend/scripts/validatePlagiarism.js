/**
 * Validation benchmark for the plagiarism detector (thesis §4.6).
 *
 * Runs the detector over a labeled dataset and reports precision / recall / F1,
 * a confusion matrix, and a per-pair similarity table. The numbers / table are
 * meant to be copied into the thesis and compared by hand against a MOSS run on
 * the same submissions. No external services are contacted.
 *
 * Usage:  npm run validate:plagiarism  [threshold]   (default threshold 70)
 */
const { compareAllSubmissions, compareSubmissions } = require('../utils/plagiarismDetector');
const { computeMetrics, pairKey, allPairs } = require('../utils/plagiarismMetrics');
const { submissions, groundTruthPairs } = require('../tests/fixtures/plagiarismDataset');

const threshold = Number(process.argv[2]) || 70;

const ids = submissions.map((s) => s.user_id);
const byId = new Map(submissions.map((s) => [s.user_id, s]));
const truth = new Set(groundTruthPairs.map(([a, b]) => pairKey(a, b)));

// Flagged pairs at the given threshold.
const flagged = compareAllSubmissions(submissions, threshold);
const flaggedPairs = flagged.map((p) => [p.submissionA.user_id, p.submissionB.user_id]);
const flaggedScore = new Map(
    flagged.map((p) => [pairKey(p.submissionA.user_id, p.submissionB.user_id), p.similarity])
);

const m = computeMetrics(flaggedPairs, groundTruthPairs, ids);

// ─── Report ──────────────────────────────────────────────────────────────────
const pct = (x) => `${(x * 100).toFixed(1)}%`;

console.log(`\nPlagiarism detector validation  (threshold = ${threshold}%)`);
console.log(`Dataset: ${submissions.length} submissions, ${groundTruthPairs.length} true plagiarism pairs\n`);

console.log('Confusion matrix (over all candidate pairs):');
console.log(`  TP=${m.tp}  FP=${m.fp}  FN=${m.fn}  TN=${m.tn}`);
console.log(`  Precision=${pct(m.precision)}  Recall=${pct(m.recall)}  F1=${pct(m.f1)}\n`);

// Per-pair table (markdown) — similarity for every candidate pair + labels.
console.log('| Pair | Similarity | Flagged | Ground truth | Outcome |');
console.log('|------|-----------:|:-------:|:------------:|---------|');
for (const [a, b] of allPairs(ids)) {
    const key = pairKey(a, b);
    const sim = flaggedScore.has(key)
        ? flaggedScore.get(key)
        : compareSubmissions(byId.get(a).code, byId.get(b).code, byId.get(a).language).similarity;
    const isFlagged = flaggedScore.has(key);
    const isTruth = truth.has(key);
    const outcome = isFlagged && isTruth ? 'TP' : isFlagged && !isTruth ? 'FP' : !isFlagged && isTruth ? 'FN' : 'TN';
    console.log(`| u${a}–u${b} | ${sim.toFixed(1)}% | ${isFlagged ? 'yes' : 'no'} | ${isTruth ? 'yes' : 'no'} | ${outcome} |`);
}
console.log('');
