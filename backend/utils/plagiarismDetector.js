/**
 * Plagiarism Detection Utility
 * 
 * Uses token-based similarity analysis to compare code submissions.
 * Implements a multi-strategy approach:
 *   1. Token normalization (strip comments, whitespace, rename variables)
 *   2. N-gram fingerprinting (Winnowing algorithm style)
 *   3. Longest Common Subsequence ratio
 * 
 * Final similarity = weighted combination of the strategies.
 */

// ─── Language-specific tokenizers ───────────────────────────────────────────

const TOKEN_TYPES = {
    KEYWORD: 'K',
    IDENTIFIER: 'I',
    NUMBER: 'N',
    STRING: 'S',
    OPERATOR: 'O',
    PUNCTUATION: 'P',
    NEWLINE: 'NL',
};

/**
 * Simple tokenizer that works for JavaScript, Python, C, Java, etc.
 * Strips comments, normalises identifiers to generic placeholders,
 * and keeps structural tokens.
 */
function tokenize(code, language = 'javascript') {
    if (!code || typeof code !== 'string') return [];

    // Step 1 – strip comments
    let cleaned = stripComments(code, language);

    // Step 2 – tokenize
    const tokens = [];
    const keywords = getKeywords(language);

    // Regex-based scanner
    const patterns = [
        { type: TOKEN_TYPES.STRING,      re: /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/ },
        { type: TOKEN_TYPES.NUMBER,      re: /^(0[xXbBoO][\da-fA-F_]+|\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?)/ },
        { type: TOKEN_TYPES.IDENTIFIER,  re: /^([a-zA-Z_$][\w$]*)/ },
        { type: TOKEN_TYPES.OPERATOR,    re: /^([+\-*/%=<>!&|^~?:]+|\.{3})/ },
        { type: TOKEN_TYPES.PUNCTUATION, re: /^([{}()\[\];,.])/  },
        { type: TOKEN_TYPES.NEWLINE,     re: /^(\n)/ },
    ];

    let pos = 0;
    while (pos < cleaned.length) {
        // skip whitespace (but not newlines)
        const ws = cleaned.slice(pos).match(/^[ \t\r]+/);
        if (ws) { pos += ws[0].length; continue; }

        let matched = false;
        for (const { type, re } of patterns) {
            const m = cleaned.slice(pos).match(re);
            if (m) {
                let value = m[1];
                let tokenType = type;

                if (type === TOKEN_TYPES.IDENTIFIER) {
                    if (keywords.has(value)) {
                        tokenType = TOKEN_TYPES.KEYWORD;
                    } else {
                        // Normalize identifiers to generic placeholder
                        value = 'VAR';
                    }
                } else if (type === TOKEN_TYPES.STRING) {
                    value = 'STR';
                } else if (type === TOKEN_TYPES.NUMBER) {
                    value = 'NUM';
                }

                tokens.push({ type: tokenType, value });
                pos += m[0].length;
                matched = true;
                break;
            }
        }
        if (!matched) {
            pos++; // skip unrecognized character
        }
    }

    // Remove consecutive newlines (keep structure but not blank lines)
    const filtered = [];
    for (const tok of tokens) {
        if (tok.type === TOKEN_TYPES.NEWLINE) {
            if (filtered.length === 0 || filtered[filtered.length - 1].type === TOKEN_TYPES.NEWLINE) continue;
        }
        filtered.push(tok);
    }

    return filtered;
}

function stripComments(code, language) {
    if (['python'].includes(language)) {
        // Remove # comments and docstrings
        return code
            .replace(/'''[\s\S]*?'''/g, '')
            .replace(/"""[\s\S]*?"""/g, '')
            .replace(/#.*$/gm, '');
    }
    // C-style comments for JS, Java, C, C++
    return code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
}

function getKeywords(language) {
    const sets = {
        javascript: new Set(['var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while', 
            'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'super',
            'import', 'export', 'default', 'try', 'catch', 'finally', 'throw', 'async', 'await',
            'yield', 'typeof', 'instanceof', 'in', 'of', 'delete', 'void', 'null', 'undefined',
            'true', 'false', 'NaN', 'Infinity', 'console', 'log', 'map', 'filter', 'reduce',
            'forEach', 'push', 'pop', 'shift', 'unshift', 'splice', 'slice', 'indexOf', 'includes']),
        python: new Set(['def', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue',
            'class', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'yield',
            'lambda', 'pass', 'global', 'nonlocal', 'assert', 'del', 'in', 'not', 'and', 'or', 'is',
            'True', 'False', 'None', 'print', 'range', 'len', 'list', 'dict', 'set', 'tuple',
            'int', 'float', 'str', 'bool', 'input', 'map', 'filter', 'zip', 'enumerate', 'sorted',
            'append', 'extend', 'remove', 'pop', 'keys', 'values', 'items', 'self']),
        c: new Set(['int', 'float', 'double', 'char', 'void', 'long', 'short', 'unsigned', 'signed',
            'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return',
            'struct', 'typedef', 'enum', 'union', 'const', 'static', 'extern', 'sizeof', 'malloc',
            'free', 'printf', 'scanf', 'NULL', 'include', 'define']),
        java: new Set(['public', 'private', 'protected', 'static', 'final', 'abstract', 'class',
            'interface', 'extends', 'implements', 'new', 'this', 'super', 'return', 'if', 'else',
            'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally',
            'throw', 'throws', 'void', 'int', 'long', 'double', 'float', 'char', 'boolean', 'byte',
            'short', 'String', 'null', 'true', 'false', 'import', 'package', 'System', 'out', 'println']),
    };
    return sets[language] || sets.javascript;
}


// ─── Similarity Algorithms ──────────────────────────────────────────────────

/**
 * Convert token list to a string of type-value pairs for fingerprinting.
 */
function tokensToString(tokens) {
    return tokens.map(t => `${t.type}:${t.value}`).join(' ');
}

/**
 * Generate n-grams from a token array.
 */
function generateNgrams(tokens, n = 4) {
    const grams = [];
    const strTokens = tokens.map(t => `${t.type}:${t.value}`);
    for (let i = 0; i <= strTokens.length - n; i++) {
        grams.push(strTokens.slice(i, i + n).join('|'));
    }
    return grams;
}

/**
 * Jaccard similarity of n-gram sets.
 */
function ngramSimilarity(tokensA, tokensB, n = 4) {
    if (tokensA.length < n || tokensB.length < n) return 0;

    const gramsA = new Set(generateNgrams(tokensA, n));
    const gramsB = new Set(generateNgrams(tokensB, n));

    let intersection = 0;
    for (const g of gramsA) {
        if (gramsB.has(g)) intersection++;
    }

    const union = gramsA.size + gramsB.size - intersection;
    return union === 0 ? 0 : (intersection / union) * 100;
}

/**
 * Longest Common Subsequence length (optimised with rolling two rows).
 */
function lcsLength(seqA, seqB) {
    const m = seqA.length;
    const n = seqB.length;
    if (m === 0 || n === 0) return 0;

    let prev = new Array(n + 1).fill(0);
    let curr = new Array(n + 1).fill(0);

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (seqA[i - 1] === seqB[j - 1]) {
                curr[j] = prev[j - 1] + 1;
            } else {
                curr[j] = Math.max(prev[j], curr[j - 1]);
            }
        }
        [prev, curr] = [curr, prev];
        curr.fill(0);
    }
    return prev[n];
}

/**
 * LCS-based similarity (percentage).
 */
function lcsSimilarity(tokensA, tokensB) {
    const strA = tokensA.map(t => `${t.type}:${t.value}`);
    const strB = tokensB.map(t => `${t.type}:${t.value}`);

    const lcs = lcsLength(strA, strB);
    const maxLen = Math.max(strA.length, strB.length);
    return maxLen === 0 ? 0 : (lcs / maxLen) * 100;
}

/**
 * Find matching fragments (contiguous matching sequences) for display.
 */
function findMatchingFragments(codeA, codeB, tokensA, tokensB, minLength = 5) {
    const strA = tokensA.map(t => `${t.type}:${t.value}`);
    const strB = tokensB.map(t => `${t.type}:${t.value}`);
    const fragments = [];

    // Simple: find all matching substrings of length >= minLength
    for (let i = 0; i < strA.length; i++) {
        for (let j = 0; j < strB.length; j++) {
            let len = 0;
            while (i + len < strA.length && j + len < strB.length && strA[i + len] === strB[j + len]) {
                len++;
            }
            if (len >= minLength) {
                fragments.push({
                    length: len,
                    posA: i,
                    posB: j,
                });
                // Skip ahead to avoid overlapping fragments
                break;
            }
        }
    }

    // Sort by length descending, take top 5
    fragments.sort((a, b) => b.length - a.length);
    return fragments.slice(0, 5).map(f => ({
        tokenLength: f.length,
        positionA: f.posA,
        positionB: f.posB,
    }));
}


// ─── Main comparison function ───────────────────────────────────────────────

/**
 * Compare two code submissions.
 * Returns { similarity, ngramScore, lcsScore, matchingTokens, totalTokensA, totalTokensB, fragments }
 */
function compareSubmissions(codeA, codeB, language = 'javascript') {
    const tokensA = tokenize(codeA, language);
    const tokensB = tokenize(codeB, language);

    if (tokensA.length < 3 || tokensB.length < 3) {
        return {
            similarity: 0,
            ngramScore: 0,
            lcsScore: 0,
            matchingTokens: 0,
            totalTokensA: tokensA.length,
            totalTokensB: tokensB.length,
            fragments: [],
        };
    }

    const nScore = ngramSimilarity(tokensA, tokensB, 4);
    const lScore = lcsSimilarity(tokensA, tokensB);

    // Weighted combination: 40% n-gram, 60% LCS (LCS is stricter)
    const similarity = Math.round((0.4 * nScore + 0.6 * lScore) * 100) / 100;

    const strA = tokensA.map(t => `${t.type}:${t.value}`);
    const strB = tokensB.map(t => `${t.type}:${t.value}`);
    const matchingTokens = lcsLength(strA, strB);

    const fragments = findMatchingFragments(codeA, codeB, tokensA, tokensB);

    return {
        similarity: Math.min(similarity, 100),
        ngramScore: Math.round(nScore * 100) / 100,
        lcsScore: Math.round(lScore * 100) / 100,
        matchingTokens,
        totalTokensA: tokensA.length,
        totalTokensB: tokensB.length,
        fragments,
    };
}


/**
 * Compare all submissions for a given exercise.
 * @param {Array} submissions - Array of { id, user_id, code, language }
 * @param {number} threshold - Minimum similarity % to flag (default 70)
 * @returns {Array} Array of flagged pairs
 */
function compareAllSubmissions(submissions, threshold = 70) {
    const flagged = [];

    // Group by best/latest submission per user
    const bestByUser = new Map();
    for (const sub of submissions) {
        const existing = bestByUser.get(sub.user_id);
        if (!existing || new Date(sub.submitted_at) > new Date(existing.submitted_at)) {
            bestByUser.set(sub.user_id, sub);
        }
    }

    const uniqueSubs = Array.from(bestByUser.values());

    // Pairwise comparison
    for (let i = 0; i < uniqueSubs.length; i++) {
        for (let j = i + 1; j < uniqueSubs.length; j++) {
            const a = uniqueSubs[i];
            const b = uniqueSubs[j];
            const result = compareSubmissions(a.code, b.code, a.language || 'javascript');

            if (result.similarity >= threshold) {
                flagged.push({
                    submissionA: a,
                    submissionB: b,
                    ...result,
                });
            }
        }
    }

    // Sort by similarity descending
    flagged.sort((a, b) => b.similarity - a.similarity);
    return flagged;
}


module.exports = {
    tokenize,
    compareSubmissions,
    compareAllSubmissions,
    ngramSimilarity,
    lcsSimilarity,
};
