import React, { useEffect, useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { sqlSessionService } from '../services/api';

const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING',
    'INSERT INTO', 'UPDATE', 'SET', 'DELETE FROM', 'VALUES',
    'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL OUTER JOIN', 'ON',
    'AS', 'DISTINCT', 'LIMIT', 'OFFSET', 'RETURNING',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'COALESCE',
    'AND', 'OR', 'NOT', 'IN', 'NOT IN', 'BETWEEN', 'LIKE', 'ILIKE',
    'IS NULL', 'IS NOT NULL', 'EXISTS',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST',
    'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE', 'ADD COLUMN',
    'INTEGER', 'TEXT', 'NUMERIC', 'BOOLEAN', 'TIMESTAMP', 'SERIAL',
];

function ResultTable({ columns, rows, rowCount, cap }) {
    if (rows.length === 0) {
        return <div className="p-4 text-sm text-gray-500 italic">Query returned 0 rows.</div>;
    }
    return (
        <>
            <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-[#0d0d14]">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col}
                                className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-white/5 whitespace-nowrap"
                            >
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                            {columns.map((col) => (
                                <td
                                    key={col}
                                    className="px-4 py-2 font-mono text-gray-300 whitespace-nowrap max-w-[300px] overflow-hidden text-ellipsis"
                                >
                                    {row[col] === null ? (
                                        <span className="text-gray-600 italic">NULL</span>
                                    ) : (
                                        String(row[col])
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="px-4 py-1.5 text-xs text-gray-600 border-t border-white/5">
                {rowCount} row{rowCount !== 1 ? 's' : ''}
                {cap ? ' (capped at 500)' : ''}
            </div>
        </>
    );
}

const SqlExercise = ({ exercise, validateRef, onValidationResult }) => {
    const [sessionReady, setSessionReady] = useState(false);
    const [tables, setTables] = useState([]);
    const [columnsByTable, setColumnsByTable] = useState({});
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [running, setRunning] = useState(false);
    const [validating, setValidating] = useState(false);
    const [validation, setValidation] = useState(null);
    const [resetting, setResetting] = useState(false);
    const [sessionError, setSessionError] = useState(null);

    const editorRef = useRef(null);
    const handleRunRef = useRef(null);
    const schemaInfoRef = useRef({ tables: [], columnsByTable: {} });
    const completionDisposableRef = useRef(null);
    // Prevent React StrictMode double-invocation from creating two concurrent sessions
    const sessionStartedRef = useRef(false);

    // Keep schema info ref in sync for the completion provider
    useEffect(() => {
        schemaInfoRef.current = { tables, columnsByTable };
    }, [tables, columnsByTable]);

    const startSession = useCallback(async () => {
        if (sessionStartedRef.current) return;
        sessionStartedRef.current = true;
        setSessionError(null);
        try {
            const data = await sqlSessionService.startSession(exercise.id);
            setTables(data.tables || []);
            setColumnsByTable(data.columnsByTable || {});
            setSessionReady(true);
        } catch (err) {
            sessionStartedRef.current = false; // allow retry
            setSessionError(err.response?.data?.error || 'Failed to start session');
        }
    }, [exercise.id]);

    useEffect(() => {
        startSession();
    }, [startSession]);

    const handleRun = useCallback(async () => {
        if (!query.trim() || running) return;
        setRunning(true);
        setValidation(null);
        try {
            const data = await sqlSessionService.runQuery(exercise.id, query);
            setResult(data);
        } catch (err) {
            setResult({ error: err.response?.data?.error || 'Query failed' });
        } finally {
            setRunning(false);
        }
    }, [exercise.id, query, running]);

    // Keep ref current so the Ctrl+Enter command always sees the latest handleRun
    useEffect(() => {
        handleRunRef.current = handleRun;
    });

    const handleValidate = useCallback(async () => {
        if (validating) return;
        setValidating(true);
        try {
            const data = await sqlSessionService.validateAnswer(exercise.id, query);
            setValidation(data);
            onValidationResult?.(data);
        } catch (err) {
            const errData = { error: err.response?.data?.error || 'Validation failed' };
            setValidation(errData);
            onValidationResult?.(errData);
        } finally {
            setValidating(false);
        }
    }, [exercise.id, query, validating, onValidationResult]);

    // Expose validate to parent (used by "Run Code" button in Exercise.js)
    useEffect(() => {
        if (validateRef) validateRef.current = handleValidate;
    });

    const handleReset = async () => {
        if (resetting) return;
        setResetting(true);
        setResult(null);
        setValidation(null);
        try {
            const data = await sqlSessionService.resetSession(exercise.id);
            setTables(data.tables || []);
            setColumnsByTable(data.columnsByTable || {});
        } catch (err) {
            setSessionError(err.response?.data?.error || 'Reset failed');
        } finally {
            setResetting(false);
        }
    };

    const handleEditorMount = (editor, monaco) => {
        editorRef.current = editor;

        // Use ref so Ctrl+Enter always dispatches to the latest handleRun (no stale closure)
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
            () => handleRunRef.current?.()
        );

        // Dispose any previous provider (e.g. on exercise change)
        if (completionDisposableRef.current) {
            completionDisposableRef.current.dispose();
        }

        completionDisposableRef.current = monaco.languages.registerCompletionItemProvider('sql', {
            triggerCharacters: [' ', '.', '\t'],
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };

                const { tables: tbs, columnsByTable: cols } = schemaInfoRef.current;
                const suggestions = [];

                // Table names
                for (const table of tbs) {
                    const tableCols = cols[table] || [];
                    suggestions.push({
                        label: table,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: table,
                        range,
                        detail: 'table',
                        documentation: {
                            value: `**${table}**\n\n${tableCols.map((c) => `• \`${c.name}\` — ${c.type}`).join('\n')}`,
                        },
                        sortText: '0' + table, // tables first
                    });
                }

                // Column names
                for (const [table, tableCols] of Object.entries(cols)) {
                    for (const col of tableCols) {
                        suggestions.push({
                            label: col.name,
                            kind: monaco.languages.CompletionItemKind.Field,
                            insertText: col.name,
                            range,
                            detail: `${col.type} · ${table}`,
                            sortText: '1' + col.name, // columns second
                        });
                    }
                }

                // SQL keywords
                for (const kw of SQL_KEYWORDS) {
                    suggestions.push({
                        label: kw,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: kw,
                        range,
                        sortText: '2' + kw, // keywords last
                    });
                }

                return { suggestions };
            },
        });
    };

    // Cleanup completion provider on unmount
    useEffect(() => {
        return () => {
            if (completionDisposableRef.current) {
                completionDisposableRef.current.dispose();
            }
        };
    }, []);

    if (sessionError) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{sessionError}</p>
                    <button
                        onClick={() => { sessionStartedRef.current = false; startSession(); }}
                        className="px-4 py-2 bg-[#a1609d]/20 hover:bg-[#a1609d]/30 text-[#a1609d] rounded-lg text-sm transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!sessionReady) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-[#a1609d]/30 border-t-[#a1609d] rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Setting up your sandbox…</p>
                </div>
            </div>
        );
    }

    const isDml = result && !result.error && result.columns === null;

    return (
        <div className="flex flex-col h-full gap-0">
            {/* Schema browser */}
            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Tables:</span>
                {tables.length === 0 ? (
                    <span className="text-xs text-gray-600 italic">none</span>
                ) : (
                    tables.map((t) => (
                        <span
                            key={t}
                            className="text-xs font-mono bg-white/5 text-blue-300 px-2 py-0.5 rounded cursor-pointer hover:bg-white/10 transition-colors"
                            onClick={() => setQuery((q) => q ? `${q}\nSELECT * FROM ${t} LIMIT 10;` : `SELECT * FROM ${t} LIMIT 10;`)}
                            title={
                                columnsByTable[t]
                                    ? `Columns: ${columnsByTable[t].map((c) => c.name).join(', ')}\n\nClick to insert SELECT`
                                    : 'Click to insert SELECT'
                            }
                        >
                            {t}
                        </span>
                    ))
                )}
                <button
                    onClick={handleReset}
                    disabled={resetting}
                    className="ml-auto text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
                    title="Reset sandbox to original data"
                >
                    {resetting ? 'Resetting…' : 'Reset data'}
                </button>
            </div>

            {/* SQL Monaco Editor */}
            <div className="flex-shrink-0" style={{ height: '176px' }}>
                <Editor
                    height="176px"
                    language="sql"
                    value={query}
                    onChange={(value) => setQuery(value || '')}
                    onMount={handleEditorMount}
                    theme="vs-dark"
                    options={{
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        padding: { top: 10, bottom: 10 },
                        lineNumbers: 'on',
                        renderLineHighlight: 'line',
                        cursorBlinking: 'smooth',
                        smoothScrolling: true,
                        tabSize: 2,
                        wordWrap: 'on',
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: { other: true, comments: false, strings: false },
                        automaticLayout: true,
                        suggest: { snippetsPreventQuickSuggestions: false },
                    }}
                />
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-[#0a0a0f]">
                <button
                    onClick={handleRun}
                    disabled={running || !query.trim()}
                    className="flex items-center gap-2 px-4 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                >
                    {running ? (
                        <>
                            <span className="w-3 h-3 border border-blue-300/40 border-t-blue-300 rounded-full animate-spin" />
                            Running…
                        </>
                    ) : (
                        <>▶ Run</>
                    )}
                </button>
                <span className="text-xs text-gray-600">Ctrl+Enter</span>
                <button
                    onClick={handleValidate}
                    disabled={validating}
                    className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-[#a1609d]/20 hover:bg-[#a1609d]/30 text-[#a1609d] rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                >
                    {validating ? 'Checking…' : 'Check Answer'}
                </button>
            </div>

            {/* Validation banner */}
            {validation && (
                <div className={`px-4 py-2 text-sm font-medium border-b border-white/5 ${
                    validation.error
                        ? 'bg-red-500/10 text-red-400'
                        : validation.passed
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                }`}>
                    {validation.error
                        ? `Error: ${validation.error}`
                        : validation.passed
                        ? '✓ Correct! Your query produces the expected result.'
                        : `✗ Not quite. Got ${validation.actual?.length ?? 0} row(s), expected ${validation.expected?.length ?? 0}.`}
                </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-auto">
                {!result ? (
                    <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                        Run a query to see results
                    </div>
                ) : result.error ? (
                    <div className="p-4 font-mono text-sm text-red-400 whitespace-pre-wrap">
                        {result.error}
                    </div>
                ) : isDml ? (
                    <div className="flex flex-col gap-0">
                        {/* DML summary */}
                        <div className="p-4 flex items-center gap-3 text-sm border-b border-white/5">
                            <span className="px-2 py-0.5 rounded bg-green-500/15 text-green-400 font-mono text-xs font-semibold">
                                {result.command}
                            </span>
                            <span className="text-gray-400">
                                {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} affected
                            </span>
                        </div>
                        {/* Affected table state */}
                        {result.afterState && (
                            <div className="flex flex-col">
                                <div className="px-4 py-1.5 text-xs text-gray-500 border-b border-white/5 bg-white/[0.02]">
                                    Current state of <span className="font-mono text-blue-300">{result.afterState.tableName}</span>
                                </div>
                                <ResultTable
                                    columns={result.afterState.columns}
                                    rows={result.afterState.rows}
                                    rowCount={result.afterState.rows.length}
                                    cap={false}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <ResultTable
                        columns={result.columns}
                        rows={result.rows}
                        rowCount={result.rowCount}
                        cap={result.rowCount === 500}
                    />
                )}
            </div>
        </div>
    );
};

export default SqlExercise;
