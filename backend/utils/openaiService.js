const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const BASE_HINTS_SYSTEM = 'You write short progressive hints that guide thinking without revealing the answer. Style: like LeetCode hints. Hint 1 mentions brute force, hint 2 pinpoints the bottleneck, hint 3 nudges toward the technique. Never name the optimal solution in hints 1 or 2.';
const BASE_OPTIMIZATION_SYSTEM = 'You write short progressive optimization hints that guide thinking without revealing the answer. Style: like LeetCode hints. Hint 1 spots the bottleneck, hint 2 identifies the redundancy, hint 3 nudges toward the fix. Never name the optimal solution in hints 1 or 2.';
const BASE_SQL_SYSTEM = "You write short progressive SQL hints that guide the student's thinking without writing any SQL. Hint 1 points to relevant tables, hint 2 identifies the missing or incorrect clause/operation, hint 3 describes the query structure needed. Never write actual SQL.";

// Default hint levels for different exercise types
const DEFAULT_HINT_LEVELS = {
    1: 'Describe the brute-force / naive way to solve this problem and acknowledge it works but is slow. Do NOT name the optimal technique. 1-2 sentences max.',
    2: 'Identify the specific bottleneck in the brute-force approach — what operation is being repeated unnecessarily? Ask a leading question about how to speed that up. Do NOT name the optimal data structure or technique. 1-2 sentences max.',
    3: 'Nudge toward the right data structure or technique with a leading question (e.g. "what if you could look up values in constant time?"). Still do NOT give the full algorithm. 1-2 sentences max.',
};

const DEFAULT_OPTIMIZATION_LEVELS = {
    1: 'Identify what makes the current solution slow — which part of the code is doing redundant work? Ask a leading question. Do NOT name the optimal technique. 1-2 sentences max.',
    2: 'Point out the specific repeated operation and ask whether there is a way to avoid re-computing it. Do NOT name the data structure. 1-2 sentences max.',
    3: 'Nudge toward the right data structure or technique with a leading question (e.g. "what if you could remember previously seen values?"). 1-2 sentences max.',
};

const DEFAULT_SQL_LEVELS = {
    1: 'Identify which tables and relationships the student needs to work with. Mention the relevant columns by name if helpful. Do NOT suggest any clause or operation yet. 1-2 sentences max.',
    2: 'Identify the SQL clause or operation (JOIN, GROUP BY, subquery, aggregate, etc.) that is needed but missing or wrong in the student\'s query. Ask a leading question. Do NOT write any SQL. 1-2 sentences max.',
    3: 'Describe the overall shape of the correct query (e.g. "you need a subquery in the WHERE clause that filters by…"). Still do NOT write actual SQL. 1-2 sentences max.',
};

const buildSystemPrompt = (basePrompt, systemPromptOverride, systemPromptAppend) => {
    if (systemPromptOverride) return systemPromptOverride;
    if (systemPromptAppend) return `${basePrompt}\n\nCourse context:\n${systemPromptAppend}`;
    return basePrompt;
};

/**
 * Generate progressive hints for an exercise based on the user's failing code.
 * Returns up to 3 hints, from vague to more specific.
 * @param {Object} params
 * @param {string} params.exerciseTitle
 * @param {string} params.exerciseDescription
 * @param {string} params.language
 * @param {string} params.code
 * @param {Array} params.failedTests
 * @param {number} params.hintNumber
 * @param {string} [params.systemPromptOverride]
 * @param {string} [params.systemPromptAppend]
 * @param {Object} [params.customHintLevels] - Custom hint levels (1, 2, 3 keys). If not provided, uses DEFAULT_HINT_LEVELS.
 */
const generateHints = async ({ exerciseTitle, exerciseDescription, language, code, _testCases, failedTests, hintNumber, systemPromptOverride, systemPromptAppend, customHintLevels }) => {
    const hintLevels = customHintLevels || DEFAULT_HINT_LEVELS;

    const prompt = `Exercise: "${exerciseTitle}"
Description: ${exerciseDescription}
Language: ${language}

Student code:
\`\`\`${language}
${code}
\`\`\`

Failing tests:
${failedTests.map(t => `${t.input} → expected: ${t.expected}, got: ${t.actual || 'error'}`).join('\n')}

Generate hint #${hintNumber}/3.
${hintLevels[hintNumber]}

CRITICAL RULES:
- NEVER name the solution technique/data structure in hints 1-2.
- Guide the student's THINKING PROCESS, don't give the answer.
- Hint 1 = acknowledge brute force. Hint 2 = identify bottleneck. Hint 3 = nudge toward technique.
- Keep each hint to 1-2 short sentences. No code. No greetings. No filler.`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: buildSystemPrompt(BASE_HINTS_SYSTEM, systemPromptOverride, systemPromptAppend) },
            { role: 'user', content: prompt },
        ],
        max_tokens: 80,
        temperature: 0.5,
    });

    return response.choices[0].message.content.trim();
};

/**
 * Analyze the time and space complexity of user code and suggest improvements.
 */
const analyzeComplexity = async ({ exerciseTitle, exerciseDescription, language, code }) => {
    const prompt = `Exercise: "${exerciseTitle}"
Description: ${exerciseDescription}
Language: ${language}

Code:
\`\`\`${language}
${code}
\`\`\`

Analyze the runtime complexity of this working solution. Also determine the best possible complexity for this problem and whether this solution achieves it.

Respond in EXACTLY this JSON format (raw JSON only, no markdown):
{
    "timeComplexity": "O(...)",
    "spaceComplexity": "O(...)",
    "optimalTimeComplexity": "O(...)",
    "optimalSpaceComplexity": "O(...)",
    "isOptimal": true or false,
    "explanation": "One-sentence technical explanation of the dominant operations."
}`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are an algorithms professor. Analyze code complexity precisely. Determine if the solution achieves the best known complexity for the problem. Respond with valid JSON only. Be terse. Do NOT suggest how to optimize.' },
            { role: 'user', content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.2,
    });

    try {
        const content = response.choices[0].message.content.trim();
        // Remove potential markdown code fences
        const cleaned = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(cleaned);
    } catch (e) {
        console.error('Failed to parse complexity analysis:', e);
        return {
            timeComplexity: 'Unknown',
            spaceComplexity: 'Unknown',
            explanation: 'Could not analyze the code complexity at this time.',
        };
    }
};

/**
 * Generate optimization hints for a working but suboptimal solution.
 * @param {Object} params
 * @param {string} params.exerciseTitle
 * @param {string} params.exerciseDescription
 * @param {string} params.language
 * @param {string} params.code
 * @param {string} params.currentComplexity
 * @param {string} params.optimalComplexity
 * @param {number} params.hintNumber
 * @param {string} [params.systemPromptOverride]
 * @param {string} [params.systemPromptAppend]
 * @param {Object} [params.customHintLevels] - Custom hint levels (1, 2, 3 keys). If not provided, uses DEFAULT_OPTIMIZATION_LEVELS.
 */
const generateOptimizationHints = async ({ exerciseTitle, exerciseDescription, language, code, currentComplexity, optimalComplexity, hintNumber, systemPromptOverride, systemPromptAppend, customHintLevels }) => {
    const hintLevels = customHintLevels || DEFAULT_OPTIMIZATION_LEVELS;

    const prompt = `Exercise: "${exerciseTitle}"
Description: ${exerciseDescription}
Language: ${language}

Working solution (${currentComplexity}):
\`\`\`${language}
${code}
\`\`\`

Optimal complexity: ${optimalComplexity}

Generate optimization hint #${hintNumber}/3.
${hintLevels[hintNumber]}

CRITICAL RULES:
- NEVER name the optimal data structure/technique in hints 1-2.
- Guide the student's THINKING, don't give the answer.
- Hint 1 = identify slow part. Hint 2 = pinpoint redundant operation. Hint 3 = nudge toward technique.
- Keep each hint to 1-2 short sentences. No code. No greetings. No filler.`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: buildSystemPrompt(BASE_OPTIMIZATION_SYSTEM, systemPromptOverride, systemPromptAppend) },
            { role: 'user', content: prompt },
        ],
        max_tokens: 80,
        temperature: 0.5,
    });

    return response.choices[0].message.content.trim();
};

/**
 * Generate progressive hints for a SQL exercise.
 * Hint 1 → which tables/relationships to consider.
 * Hint 2 → which SQL clause or operation is needed.
 * Hint 3 → structural nudge toward the correct query shape.
 * @param {Object} params
 * @param {string} params.exerciseTitle
 * @param {string} params.exerciseDescription
 * @param {string} params.seedSQL
 * @param {string} params.code
 * @param {Array} params.failedTests
 * @param {number} params.hintNumber
 * @param {string} [params.systemPromptOverride]
 * @param {string} [params.systemPromptAppend]
 * @param {Object} [params.customHintLevels] - Custom hint levels (1, 2, 3 keys). If not provided, uses DEFAULT_SQL_LEVELS.
 */
const generateSQLHints = async ({ exerciseTitle, exerciseDescription, seedSQL, code, failedTests, hintNumber, systemPromptOverride, systemPromptAppend, customHintLevels }) => {
    const hintLevels = customHintLevels || DEFAULT_SQL_LEVELS;

    const schemaBlock = seedSQL
        ? `Database schema (seed SQL):\n\`\`\`sql\n${seedSQL}\n\`\`\``
        : '';

    const prompt = `SQL Exercise: "${exerciseTitle}"
Description: ${exerciseDescription}
${schemaBlock}

Student query:
\`\`\`sql
${code || '-- (empty)'}
\`\`\`

Failing tests:
${(failedTests || []).map(t => `Input: ${t.input || 'n/a'} → expected: ${t.expected}, got: ${t.actual || 'error'}`).join('\n') || 'No output produced.'}

Generate hint #${hintNumber}/3.
${hintLevels[hintNumber]}

CRITICAL RULES:
- NEVER write SQL code. Guide the student's thinking only.
- Hint 1 = tables/relationships. Hint 2 = missing clause/operation. Hint 3 = query structure.
- 1-2 short sentences. No greetings. No filler.`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: buildSystemPrompt(BASE_SQL_SYSTEM, systemPromptOverride, systemPromptAppend) },
            { role: 'user', content: prompt },
        ],
        max_tokens: 100,
        temperature: 0.5,
    });

    return response.choices[0].message.content.trim();
};

/**
 * Generate personalised growth feedback for a student based on their analytics data.
 */
const generateStudentFeedback = async (studentData) => {
    const { overview, courses, difficultyBreakdown, languages, recentActivity } = studentData;

    const prompt = `You are an encouraging but honest programming tutor. Analyse the following student analytics and give concise, actionable feedback.

OVERVIEW:
- Enrolled courses: ${overview.enrolled_courses}
- Exercises completed: ${overview.exercises_completed}
- Total submissions: ${overview.total_submissions}
- Average score: ${Number(overview.average_score).toFixed(1)}%
- Total study time: ${Math.round(Number(overview.total_time_spent) / 60)} minutes

COURSE PERFORMANCE:
${courses.map(c => `  • ${c.title} (${c.difficulty}): ${c.exercises_completed}/${c.exercises_total} exercises, avg ${Number(c.avg_score).toFixed(1)}%`).join('\n')}

DIFFICULTY BREAKDOWN:
${difficultyBreakdown.map(d => `  • ${d.difficulty}: ${d.completed}/${d.total} completed, avg score ${Number(d.avg_score).toFixed(1)}%, avg ${Number(d.avg_attempts).toFixed(1)} attempts`).join('\n')}

LANGUAGES USED:
${languages.map(l => `  • ${l.language}: ${l.submissions} submissions, ${l.passed} passed, avg ${Number(l.avg_score).toFixed(1)}%`).join('\n')}

RECENT ACTIVITY (last 10 submissions):
${recentActivity.map(r => `  • ${r.title} (${r.difficulty}) — ${r.status}, score ${r.score}%`).join('\n')}

Provide your response in EXACTLY this JSON format (raw JSON, no markdown):
{
    "summary": "2-3 sentence overall assessment",
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "weaknesses": ["area to improve 1", "area to improve 2"],
    "recommendations": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
    "nextSteps": "1-2 sentence suggestion on what to tackle next"
}`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a supportive programming tutor who gives data-driven, personalised feedback. Be encouraging but honest. Respond with valid JSON only.' },
            { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.6,
    });

    try {
        const content = response.choices[0].message.content.trim();
        const cleaned = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(cleaned);
    } catch (e) {
        console.error('Failed to parse AI feedback:', e);
        return {
            summary: 'Keep up the good work! Continue practising regularly to improve.',
            strengths: ['Consistent effort'],
            weaknesses: ['Could not generate detailed analysis at this time'],
            recommendations: ['Keep practising daily', 'Try harder exercises gradually'],
            nextSteps: 'Review your recent mistakes and retry those exercises.',
        };
    }
};

module.exports = {
    generateHints,
    generateSQLHints,
    generateOptimizationHints,
    analyzeComplexity,
    generateStudentFeedback,
};
