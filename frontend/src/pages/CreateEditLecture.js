import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lectureService, courseService } from '../services/api';
import RichTextEditor from '../components/RichTextEditor';
import ThemeToggle from '../components/ThemeToggle';

export default function CreateEditLecture() {
    const { courseId, lectureId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(lectureId);
    const saveTimerRef = useRef(null);

    const [chapters, setChapters] = useState([]);
    const [form, setForm] = useState({ title: '', description: '', chapter_id: '', order_index: 0 });
    const [pages, setPages] = useState([]);
    const [media, setMedia] = useState([]);
    const [activePage, setActivePage] = useState(0);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'pending' | 'saving'
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [savedLectureId, setSavedLectureId] = useState(lectureId || null);

    useEffect(() => {
        loadChapters();
        if (isEditing) loadLecture();
    }, [lectureId, courseId]);

    const loadChapters = async () => {
        try {
            const res = await courseService.getCourseById(courseId);
            setChapters(res.data.chapters || []);
        } catch {}
    };

    const loadLecture = async () => {
        try {
            const res = await lectureService.getLecture(lectureId);
            const l = res.data;
            setForm({
                title: l.title,
                description: l.description || '',
                chapter_id: l.chapter_id || '',
                order_index: l.order_index,
            });
            setPages(l.pages || []);
            setMedia(l.media || []);
            setSavedLectureId(lectureId);
        } catch {
            setError('Failed to load lecture.');
        }
    };

    const saveLecture = async () => {
        setSaving(true);
        setError('');
        try {
            if (savedLectureId) {
                await lectureService.updateLecture(savedLectureId, {
                    ...form,
                    chapter_id: form.chapter_id || null,
                });
            } else {
                const res = await lectureService.createLecture(courseId, {
                    ...form,
                    chapter_id: form.chapter_id || null,
                });
                setSavedLectureId(res.data.id);
                navigate(`/professor/course/${courseId}/lecture/${res.data.id}/edit`, { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save lecture.');
        } finally {
            setSaving(false);
        }
    };

    const addPage = async () => {
        if (!savedLectureId) { setError('Save the lecture first.'); return; }
        try {
            const res = await lectureService.addPage(savedLectureId, {
                title: `Page ${pages.length + 1}`,
                content: '',
                page_number: pages.length + 1,
            });
            setPages(prev => [...prev, res.data]);
            setActivePage(pages.length);
        } catch {
            setError('Failed to add page.');
        }
    };

    const savePageContent = useCallback(async (index, content, pagesSnapshot) => {
        const p = pagesSnapshot[index];
        if (!p) return;
        setSaveStatus('saving');
        try {
            await lectureService.updatePage(savedLectureId, p.id, { content });
            setPages(prev => prev.map((pg, i) => i === index ? { ...pg, content } : pg));
            setSaveStatus('saved');
        } catch {
            setError('Failed to save page.');
            setSaveStatus('saved');
        }
    }, [savedLectureId]);

    const debouncedSave = useCallback((index, content) => {
        setSaveStatus('pending');
        setPages(prev => prev.map((pg, i) => i === index ? { ...pg, content } : pg));
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            setPages(prev => {
                savePageContent(index, content, prev);
                return prev;
            });
        }, 800);
    }, [savePageContent]);

    const savePageTitle = async (index, title) => {
        const p = pages[index];
        if (!p) return;
        try {
            await lectureService.updatePage(savedLectureId, p.id, { title });
            setPages(prev => prev.map((pg, i) => i === index ? { ...pg, title } : pg));
        } catch {}
    };

    const deletePage = async (index) => {
        const p = pages[index];
        if (!p || !window.confirm('Delete this page?')) return;
        try {
            await lectureService.deletePage(savedLectureId, p.id);
            const next = pages.filter((_, i) => i !== index);
            setPages(next);
            setActivePage(Math.max(0, Math.min(activePage, next.length - 1)));
        } catch {
            setError('Failed to delete page.');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !savedLectureId) {
            if (!savedLectureId) setError('Save the lecture before uploading media.');
            return;
        }
        const isVideo = file.type.startsWith('video/');
        const isPPT = file.type.includes('presentationml') || file.type.includes('ms-powerpoint');
        const isPDF = file.type === 'application/pdf';
        const mediaType = isVideo ? 'video' : isPPT ? 'powerpoint' : isPDF ? 'pdf' : null;
        if (!mediaType) { setError('Unsupported file type.'); return; }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('media_type', mediaType);
            formData.append('title', file.name.replace(/\.[^.]+$/, ''));
            formData.append('order_index', media.length);
            const res = await lectureService.uploadMedia(savedLectureId, formData);
            setMedia(prev => [...prev, res.data]);
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed.');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const deleteMedia = async (id) => {
        if (!window.confirm('Delete this media file?')) return;
        try {
            await lectureService.deleteMedia(savedLectureId, id);
            setMedia(prev => prev.filter(m => m.id !== id));
        } catch {
            setError('Failed to delete media.');
        }
    };

    const SaveStatusBadge = () => {
        if (saveStatus === 'pending' || saveStatus === 'saving') {
            return <span className="text-xs text-gray-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" /> Saving…</span>;
        }
        return <span className="text-xs text-gray-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Saved</span>;
    };

    return (
        <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">

            {/* ── Top bar ── */}
            <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
                <button
                    onClick={() => navigate(`/professor/course/${courseId}`)}
                    className="text-gray-400 hover:text-white text-sm transition-colors flex-shrink-0"
                >
                    ← Back
                </button>
                <div className="w-px h-5 bg-gray-700 flex-shrink-0" />
                <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="flex-1 bg-transparent text-white font-semibold text-base focus:outline-none placeholder-gray-600 min-w-0"
                    placeholder="Lecture title…"
                />
                {savedLectureId && <SaveStatusBadge />}
                <ThemeToggle />
                <button
                    onClick={saveLecture}
                    disabled={saving || !form.title}
                    className="flex-shrink-0 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    {saving ? 'Saving…' : savedLectureId ? 'Save' : 'Create lecture'}
                </button>
            </header>

            {error && (
                <div className="flex-shrink-0 mx-4 mt-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm flex items-center justify-between">
                    {error}
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-200 ml-4">✕</button>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">

                {/* ── Left sidebar ── */}
                <aside className="w-52 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">

                    {/* Pages */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
                            <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Pages</span>
                            <button
                                onClick={addPage}
                                disabled={!savedLectureId}
                                title={!savedLectureId ? 'Save the lecture first' : 'Add page'}
                                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 rounded transition-colors"
                            >
                                + Add
                            </button>
                        </div>

                        <nav className="py-1">
                            {pages.map((p, i) => (
                                <button
                                    key={p.id}
                                    onClick={() => setActivePage(i)}
                                    className={`w-full text-left px-4 py-2 text-sm transition-colors border-r-2 ${
                                        activePage === i
                                            ? 'bg-purple-600/20 text-white border-purple-500'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-transparent'
                                    }`}
                                >
                                    <span className="block truncate">{p.title || `Page ${i + 1}`}</span>
                                </button>
                            ))}
                            {pages.length === 0 && (
                                <p className="px-4 py-3 text-xs text-gray-600 leading-relaxed">
                                    {savedLectureId ? 'No pages yet. Click + Add to start writing.' : 'Create the lecture first, then add pages.'}
                                </p>
                            )}
                        </nav>
                    </div>

                    {/* Media */}
                    <div className="border-t border-gray-800 px-4 py-3 flex-shrink-0">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Media</span>
                        <label className={`mt-2 flex items-center justify-center w-full py-1.5 text-xs rounded-lg border border-dashed cursor-pointer transition-colors ${
                            savedLectureId && !uploading
                                ? 'border-gray-600 hover:border-purple-500 text-gray-400 hover:text-purple-400'
                                : 'border-gray-700 text-gray-600 cursor-not-allowed'
                        }`}>
                            {uploading ? 'Uploading…' : '+ Video / PPTX / PDF'}
                            <input
                                type="file"
                                accept="video/mp4,video/webm,video/quicktime,.pptx,.ppt,.pdf"
                                className="hidden"
                                disabled={!savedLectureId || uploading}
                                onChange={handleFileUpload}
                            />
                        </label>
                        {media.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {media.map(m => (
                                    <div key={m.id} className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-gray-400 truncate">
                                            {m.media_type === 'video' ? '🎬' : '📊'} {m.title}
                                        </span>
                                        <button onClick={() => deleteMedia(m.id)} className="text-red-400 hover:text-red-300 text-xs flex-shrink-0">✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Settings */}
                    <div className="border-t border-gray-800 px-4 py-3 flex-shrink-0">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Settings</span>
                        <div className="mt-2 space-y-2">
                            <textarea
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                rows={2}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:border-purple-500 resize-none placeholder-gray-600"
                                placeholder="Description (optional)"
                            />
                            <select
                                value={form.chapter_id}
                                onChange={e => setForm(f => ({ ...f, chapter_id: e.target.value }))}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:border-purple-500"
                            >
                                <option value="">No chapter</option>
                                {chapters.map(ch => (
                                    <option key={ch.id} value={ch.id}>{ch.title}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min="0"
                                value={form.order_index}
                                onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) || 0 }))}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:border-purple-500"
                                placeholder="Order index"
                            />
                        </div>
                    </div>
                </aside>

                {/* ── Main editor area ── */}
                <main className="flex-1 overflow-y-auto bg-gray-950">
                    {pages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-600">
                            <p className="text-6xl mb-4">📄</p>
                            <p className="text-sm">
                                {savedLectureId
                                    ? 'Click "+ Add" in the sidebar to create your first page.'
                                    : 'Fill in the lecture title above and click "Create lecture", then add pages.'}
                            </p>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto px-8 py-8">
                            {/* Page title — editable, looks like the real page */}
                            <input
                                value={pages[activePage]?.title || ''}
                                onChange={e => {
                                    const t = e.target.value;
                                    setPages(prev => prev.map((p, i) => i === activePage ? { ...p, title: t } : p));
                                }}
                                onBlur={e => savePageTitle(activePage, e.target.value)}
                                className="w-full bg-transparent text-4xl font-bold text-white focus:outline-none placeholder-gray-700 mb-6 pb-3 border-b border-transparent hover:border-gray-700 focus:border-purple-500/60 transition-colors"
                                placeholder="Page title…"
                            />

                            {/* Rich text editor */}
                            <RichTextEditor
                                key={pages[activePage]?.id}
                                value={pages[activePage]?.content || ''}
                                onChange={content => debouncedSave(activePage, content)}
                            />

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                                <span className="text-xs text-gray-600">
                                    Page {activePage + 1} of {pages.length}
                                </span>
                                <button
                                    onClick={() => deletePage(activePage)}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Delete page
                                </button>
                            </div>

                            <div className="h-12" />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
