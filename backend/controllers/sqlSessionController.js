const { pool } = require('../config/database');

const SESSION_TTL_MINUTES = 60;

const normalizeRows = (rows) =>
    rows.map((r) => {
        const entries = Object.entries(r)
            .map(([k, v]) => [k, v === null ? null : String(v)]);
        entries.sort(([a], [b]) => a.localeCompare(b));
        return Object.fromEntries(entries);
    });

const rowsMatch = (actual, expected) => {
    if (actual.length !== expected.length) return false;
    const sort = (arr) =>
        [...arr].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return JSON.stringify(sort(actual)) === JSON.stringify(sort(expected));
};

// ── helpers ──────────────────────────────────────────────────────────────────

const schemaName = (exerciseId, userId) =>
    `sql_ex${exerciseId}_u${userId}`;

async function getSchemaInfo(client, name) {
    const tablesResult = await client.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = $1 ORDER BY table_name`,
        [name]
    );
    const columnsResult = await client.query(
        `SELECT table_name, column_name, data_type
         FROM information_schema.columns
         WHERE table_schema = $1
         ORDER BY table_name, ordinal_position`,
        [name]
    );
    const columnsByTable = {};
    for (const row of columnsResult.rows) {
        if (!columnsByTable[row.table_name]) columnsByTable[row.table_name] = [];
        columnsByTable[row.table_name].push({ name: row.column_name, type: row.data_type });
    }
    return {
        tables: tablesResult.rows.map((r) => r.table_name),
        columnsByTable,
    };
}

async function seedSchema(client, name, seedSql) {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${name}"`);
    await client.query(`SET search_path TO "${name}"`);
    await client.query('SAVEPOINT seed_start');
    try {
        await client.query(seedSql);
    } catch (err) {
        await client.query('ROLLBACK TO SAVEPOINT seed_start');
        await client.query(`DROP SCHEMA IF EXISTS "${name}" CASCADE`);
        throw new Error(`Seed SQL failed: ${err.message}`);
    }
    await client.query('RELEASE SAVEPOINT seed_start');
}

async function getOrCreateSession(client, userId, exerciseId, seedSql) {
    const existing = await client.query(
        'SELECT schema_name FROM public.sql_sessions WHERE user_id=$1 AND exercise_id=$2',
        [userId, exerciseId]
    );

    if (existing.rows.length > 0) {
        const name = existing.rows[0].schema_name;

        // Verify the schema is actually seeded — it may have been lost due to cleanup
        // or a previous failed creation. If empty, re-seed transparently.
        const tableCount = await client.query(
            `SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = $1`,
            [name]
        );
        if (parseInt(tableCount.rows[0].n) === 0) {
            await client.query(`DROP SCHEMA IF EXISTS "${name}" CASCADE`);
            await seedSchema(client, name, seedSql);
        }

        await client.query(
            'UPDATE public.sql_sessions SET last_active_at=NOW() WHERE user_id=$1 AND exercise_id=$2',
            [userId, exerciseId]
        );
        return { name, isNew: false };
    }

    const name = schemaName(exerciseId, userId);
    await seedSchema(client, name, seedSql);

    // ON CONFLICT handles concurrent requests (e.g. React StrictMode double-invoke)
    await client.query(
        `INSERT INTO public.sql_sessions (user_id, exercise_id, schema_name)
         VALUES ($1,$2,$3) ON CONFLICT (user_id, exercise_id) DO NOTHING`,
        [userId, exerciseId, name]
    );

    return { name, isNew: true };
}

// ── controllers ───────────────────────────────────────────────────────────────

const startSession = async (req, res) => {
    const userId = req.user.id;
    const exerciseId = parseInt(req.params.exerciseId, 10);

    const exResult = await pool.query(
        "SELECT seed_sql, exercise_type FROM exercises WHERE id=$1",
        [exerciseId]
    );
    if (exResult.rows.length === 0)
        return res.status(404).json({ error: 'Exercise not found' });

    const exercise = exResult.rows[0];
    if (exercise.exercise_type !== 'sql')
        return res.status(400).json({ error: 'Not a SQL exercise' });
    if (!exercise.seed_sql)
        return res.status(400).json({ error: 'Exercise has no seed SQL' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { name, isNew } = await getOrCreateSession(client, userId, exerciseId, exercise.seed_sql);
        await client.query('COMMIT');

        await client.query(`SET search_path TO "${name}"`);
        const { tables, columnsByTable } = await getSchemaInfo(client, name);

        res.json({ schemaReady: true, isNew, tables, columnsByTable });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('startSession error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        await client.query('SET search_path TO DEFAULT').catch(() => {});
        client.release();
    }
};

const runQuery = async (req, res) => {
    const userId = req.user.id;
    const exerciseId = parseInt(req.params.exerciseId, 10);
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0)
        return res.status(400).json({ error: 'Query is required' });

    if (query.length > 4096)
        return res.status(400).json({ error: 'Query too long' });

    const sessionResult = await pool.query(
        'SELECT schema_name FROM public.sql_sessions WHERE user_id=$1 AND exercise_id=$2',
        [userId, exerciseId]
    );
    if (sessionResult.rows.length === 0)
        return res.status(400).json({ error: 'No active session — call /start first' });

    const name = sessionResult.rows[0].schema_name;

    // Strip ALL trailing whitespace then semicolons repeatedly to handle
    // edge cases like "SELECT 1;\n" or "SELECT 1;  ;  " from Monaco editor
    let cleanQuery = query;
    let prev;
    do {
        prev = cleanQuery;
        cleanQuery = cleanQuery.trim().replace(/;+$/, '');
    } while (cleanQuery !== prev);
    const firstWord = cleanQuery.trimStart().split(/\s+/)[0].toUpperCase();
    const isSelect = ['SELECT', 'WITH', 'VALUES', 'TABLE'].includes(firstWord);

    if (!cleanQuery) {
        return res.status(400).json({ error: 'Query is empty after stripping semicolons' });
    }

    console.log(`[runQuery] exercise=${exerciseId} schema=${name} isSelect=${isSelect} query=${JSON.stringify(cleanQuery.slice(0, 120))}`);

    const client = await pool.connect();
    try {
        await client.query(`SET search_path TO "${name}", public`);

        let responseData;
        if (isSelect) {
            // Run the query directly and cap results in JS — avoids any SQL modification issues
            const result = await client.query(cleanQuery);
            const cappedRows = result.rows.slice(0, 500);
            responseData = {
                columns: (result.fields || []).map((f) => f.name),
                rows: cappedRows,
                rowCount: cappedRows.length,
            };
        } else {
            const result = await client.query(cleanQuery);
            responseData = {
                command: result.command,
                rowCount: result.rowCount ?? 0,
                columns: null,
                rows: null,
            };

            // Auto-fetch the affected table's current state so the UI can show it
            const tableMatch = cleanQuery.match(
                /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+"?(\w+)"?/i
            );
            if (tableMatch) {
                try {
                    const stateResult = await client.query(
                        `SELECT * FROM "${tableMatch[1]}" LIMIT 100`
                    );
                    responseData.afterState = {
                        tableName: tableMatch[1],
                        columns: stateResult.fields.map((f) => f.name),
                        rows: stateResult.rows,
                    };
                } catch { /* ignore if table detection fails */ }
            }
        }

        res.json(responseData);

        // Fire-and-forget: audit update must not cause a 422 on a successful query
        pool.query(
            'UPDATE public.sql_sessions SET last_active_at=NOW(), last_query=$3 WHERE user_id=$1 AND exercise_id=$2',
            [userId, exerciseId, cleanQuery]
        ).catch((e) => console.warn('[runQuery] last_query update failed:', e.message));
    } catch (err) {
        console.error('[runQuery] query error:', err.message);
        res.status(422).json({ error: err.message });
    } finally {
        await client.query('SET search_path TO DEFAULT').catch(() => {});
        client.release();
    }
};

const validateAnswer = async (req, res) => {
    const userId = req.user.id;
    const exerciseId = parseInt(req.params.exerciseId, 10);
    const { query: userQuery } = req.body;

    const exResult = await pool.query(
        'SELECT validation_query, expected_result FROM exercises WHERE id=$1',
        [exerciseId]
    );
    if (exResult.rows.length === 0)
        return res.status(404).json({ error: 'Exercise not found' });

    const { validation_query, expected_result } = exResult.rows[0];
    if (!validation_query || !expected_result)
        return res.status(400).json({ error: 'Exercise has no validation configured' });

    const sessionResult = await pool.query(
        'SELECT schema_name FROM public.sql_sessions WHERE user_id=$1 AND exercise_id=$2',
        [userId, exerciseId]
    );
    if (sessionResult.rows.length === 0)
        return res.status(400).json({ error: 'No active session' });

    const { schema_name: name } = sessionResult.rows[0];

    // For SELECT exercises: run the user's current query and compare its output.
    // For DML exercises (or when no SELECT query is provided): run validation_query
    // to inspect the resulting table state.
    let cleanUserQuery = userQuery || '';
    let _prev;
    do { _prev = cleanUserQuery; cleanUserQuery = cleanUserQuery.trim().replace(/;+$/, ''); } while (cleanUserQuery !== _prev);
    cleanUserQuery = cleanUserQuery || null;
    const isUserSelect = cleanUserQuery && /^(SELECT|WITH|VALUES|TABLE)\b/i.test(cleanUserQuery);

    // For SELECT exercises the user must write their own SELECT query.
    // Without this guard, an empty editor falls back to validation_query which
    // always returns the expected result, making every exercise auto-pass.
    const isSelectExercise = /^(SELECT|WITH|VALUES|TABLE)\b/i.test(validation_query.trim());
    if (isSelectExercise && !isUserSelect) {
        return res.json({ passed: false, actual: [], expected: normalizeRows(expected_result) });
    }

    const queryToRun = isUserSelect ? cleanUserQuery : validation_query;

    const client = await pool.connect();
    try {
        await client.query(`SET search_path TO "${name}"`);
        const result = await client.query(queryToRun);
        const actual = normalizeRows(result.rows);
        const expected = normalizeRows(expected_result);
        const passed = rowsMatch(actual, expected);

        console.log(`[validate] exercise=${exerciseId} user=${userId} queryRan=${JSON.stringify(queryToRun.slice(0,80))} actualRows=${actual.length} expectedRows=${expected.length} passed=${passed}`);

        // Update user_progress so the hint system can track failed attempts
        const score = passed ? 100 : 0;
        const progressCheck = await pool.query(
            'SELECT * FROM user_progress WHERE user_id=$1 AND exercise_id=$2',
            [userId, exerciseId]
        );
        if (progressCheck.rows.length === 0) {
            const completionStatus = passed ? 'completed' : 'in_progress';
            await pool.query(
                `INSERT INTO user_progress (user_id, exercise_id, completed, best_score, attempts, last_attempt_at, completion_status)
                 VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP, $5)`,
                [userId, exerciseId, passed, score, completionStatus]
            );
        } else {
            const prev = progressCheck.rows[0];
            const newBestScore = Math.max(prev.best_score, score);
            const newStatus = passed && prev.completion_status === 'in_progress'
                ? 'completed'
                : prev.completion_status;
            await pool.query(
                `UPDATE user_progress
                 SET completed=$3, best_score=$4, attempts=attempts+1, last_attempt_at=CURRENT_TIMESTAMP, completion_status=$5
                 WHERE user_id=$1 AND exercise_id=$2`,
                [userId, exerciseId, passed || prev.completed, newBestScore, newStatus]
            );
        }

        res.json({ passed, actual, expected });
    } catch (err) {
        res.status(422).json({ error: err.message });
    } finally {
        await client.query('SET search_path TO DEFAULT').catch(() => {});
        client.release();
    }
};

const resetSession = async (req, res) => {
    const userId = req.user.id;
    const exerciseId = parseInt(req.params.exerciseId, 10);

    const exResult = await pool.query(
        "SELECT seed_sql FROM exercises WHERE id=$1 AND exercise_type='sql'",
        [exerciseId]
    );
    if (exResult.rows.length === 0)
        return res.status(404).json({ error: 'SQL exercise not found' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const sessionResult = await client.query(
            'SELECT schema_name FROM public.sql_sessions WHERE user_id=$1 AND exercise_id=$2',
            [userId, exerciseId]
        );
        if (sessionResult.rows.length > 0) {
            const name = sessionResult.rows[0].schema_name;
            await client.query(`DROP SCHEMA IF EXISTS "${name}" CASCADE`);
            await client.query(
                'DELETE FROM public.sql_sessions WHERE user_id=$1 AND exercise_id=$2',
                [userId, exerciseId]
            );
        }

        const { name } = await getOrCreateSession(client, userId, exerciseId, exResult.rows[0].seed_sql);
        await client.query('COMMIT');

        await client.query(`SET search_path TO "${name}"`);
        const { tables, columnsByTable } = await getSchemaInfo(client, name);

        res.json({ reset: true, tables, columnsByTable });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('resetSession error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        await client.query('SET search_path TO DEFAULT').catch(() => {});
        client.release();
    }
};

const cleanupStaleSessions = async () => {
    const client = await pool.connect();
    try {
        const stale = await client.query(
            `SELECT schema_name FROM public.sql_sessions
             WHERE last_active_at < NOW() - INTERVAL '${SESSION_TTL_MINUTES} minutes'`
        );
        for (const row of stale.rows) {
            await client.query(`DROP SCHEMA IF EXISTS "${row.schema_name}" CASCADE`);
            console.log(`[sql-cleanup] dropped schema ${row.schema_name}`);
        }
        if (stale.rows.length > 0) {
            await client.query(
                `DELETE FROM public.sql_sessions
                 WHERE last_active_at < NOW() - INTERVAL '${SESSION_TTL_MINUTES} minutes'`
            );
        }
    } catch (err) {
        console.error('[sql-cleanup] error:', err);
    } finally {
        client.release();
    }
};

module.exports = { startSession, runQuery, validateAnswer, resetSession, cleanupStaleSessions };
