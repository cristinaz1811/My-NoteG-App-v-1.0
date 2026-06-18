/**
 * Labeled plagiarism dataset for validating the detector (thesis §4.6).
 *
 * Submissions are one-per-user (the detector keeps the latest per user).
 * `groundTruthPairs` lists the user-id pairs that are genuinely plagiarism:
 *   - u1, u2, u7 are the same origin (rename / comments / whitespace) → all 3 pairs.
 *   - u3, u5 are the same origin → 1 pair.
 *   - u4 (recursion) and u6 (string reverse) are independent controls.
 */

const A_ORIGINAL = `function sumArray(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i];
  }
  return total;
}`;

const A_RENAMED = `function sumArray(values) {
  let acc = 0;
  for (let idx = 0; idx < values.length; idx++) {
    acc += values[idx];
  }
  return acc;
}`;

const A_COMMENTED_WS = `function sumArray(arr) {

  let total = 0; // accumulator

  for (let i = 0; i < arr.length; i++) {
    // add current element
    total += arr[i];
  }

  return total; // done
}`;

const B_REDUCE = `function sumArray(arr) {
  return arr.reduce(function (a, b) { return a + b; }, 0);
}`;

const B_RENAMED = `function sumArray(list) {
  return list.reduce(function (x, y) { return x + y; }, 0);
}`;

const C_RECURSION = `function sumArray(arr) {
  if (arr.length === 0) return 0;
  return arr[0] + sumArray(arr.slice(1));
}`;

const D_REVERSE = `function reverseString(s) {
  let out = '';
  for (let i = s.length - 1; i >= 0; i--) out += s[i];
  return out;
}`;

const submissions = [
    { id: 1, user_id: 1, language: 'javascript', code: A_ORIGINAL, submitted_at: '2024-01-01' },
    { id: 2, user_id: 2, language: 'javascript', code: A_RENAMED, submitted_at: '2024-01-01' },
    { id: 3, user_id: 3, language: 'javascript', code: B_REDUCE, submitted_at: '2024-01-01' },
    { id: 4, user_id: 4, language: 'javascript', code: C_RECURSION, submitted_at: '2024-01-01' },
    { id: 5, user_id: 5, language: 'javascript', code: B_RENAMED, submitted_at: '2024-01-01' },
    { id: 6, user_id: 6, language: 'javascript', code: D_REVERSE, submitted_at: '2024-01-01' },
    { id: 7, user_id: 7, language: 'javascript', code: A_COMMENTED_WS, submitted_at: '2024-01-01' },
];

const groundTruthPairs = [
    [1, 2],
    [1, 7],
    [2, 7],
    [3, 5],
];

module.exports = { submissions, groundTruthPairs };
