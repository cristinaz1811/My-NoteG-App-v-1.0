/**
 * Pure metrics helpers for validating the plagiarism detector against a labeled
 * dataset. Operates on unordered user-id pairs.
 */

// Canonical key for an unordered pair, e.g. (10, 3) -> "3-10".
function pairKey(a, b) {
    return [a, b].map(String).sort().join('-');
}

// All unordered pairs from a list of ids.
function allPairs(ids) {
    const out = [];
    for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) out.push([ids[i], ids[j]]);
    }
    return out;
}

/**
 * Confusion matrix + precision/recall/F1.
 * @param {Array<[any,any]>} predictedPairs - pairs flagged as plagiarism
 * @param {Array<[any,any]>} truthPairs     - ground-truth plagiarism pairs
 * @param {Array<any>} ids                  - all user ids in the dataset
 */
function computeMetrics(predictedPairs, truthPairs, ids) {
    const pred = new Set(predictedPairs.map(([a, b]) => pairKey(a, b)));
    const truth = new Set(truthPairs.map(([a, b]) => pairKey(a, b)));

    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const [a, b] of allPairs(ids)) {
        const k = pairKey(a, b);
        const p = pred.has(k);
        const t = truth.has(k);
        if (p && t) tp++;
        else if (p && !t) fp++;
        else if (!p && t) fn++;
        else tn++;
    }

    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

    return { tp, fp, fn, tn, precision, recall, f1 };
}

module.exports = { pairKey, allPairs, computeMetrics };
