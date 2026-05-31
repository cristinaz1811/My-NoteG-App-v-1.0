import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lectureService, courseService } from '../services/api';
import RichTextEditor from '../components/RichTextEditor';
import VideoPlayer from '../components/VideoPlayer';
import PowerPointViewer from '../components/PowerPointViewer';
import ThemeToggle from '../components/ThemeToggle';

export default function LectureViewer() {
    const { lectureId } = useParams();
    const navigate = useNavigate();
    const mainRef = useRef(null);

    const [lecture, setLecture] = useState(null);
    const [siblings, setSiblings] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [completedIds, setCompletedIds] = useState(new Set());

    useEffect(() => {
        fetchLecture();
    }, [lectureId]);

    const goBack = () => {
        if (lecture?.course_id) {
            navigate(`/my-courses/${lecture.course_id}`);
        } else {
            navigate(-1);
        }
    };

    const fetchLecture = async () => {
        try {
            setLoading(true);
            const res = await lectureService.getLecture(lectureId);
            const data = res.data;
            setLecture(data);
            setCurrentPage(data.progress?.last_page_seen || 1);

            // Populate sidebar with all course lectures + completion status
            if (data.course_id) {
                try {
                    const courseRes = await courseService.getEnrolledCourseDetails(data.course_id);
                    const lectureList = courseRes.data.lectures || [];
                    setSiblings(lectureList);
                    const doneIds = new Set(
                        lectureList.filter(l => l.lecture_completed).map(l => String(l.id))
                    );
                    if (data.progress?.completed) doneIds.add(String(lectureId));
                    setCompletedIds(doneIds);
                } catch {
                    // Fallback for professors or unenrolled users
                    const sibRes = await lectureService.getLecturesByCourse(data.course_id);
                    setSiblings(sibRes.data);
                    if (data.progress?.completed) {
                        setCompletedIds(new Set([String(lectureId)]));
                    }
                }
            }

            // Auto-complete single-page lectures the moment they are opened
            const totalPages = data.pages?.length || 0;
            if (totalPages <= 1 && !data.progress?.completed) {
                try {
                    await lectureService.updateProgress(lectureId, {
                        last_page_seen: Math.max(totalPages, 1),
                        completed: true,
                    });
                    setLecture(prev => ({
                        ...prev,
                        progress: { ...(prev.progress || {}), completed: true, last_page_seen: Math.max(totalPages, 1) },
                    }));
                    setCompletedIds(prev => new Set([...prev, String(lectureId)]));
                } catch {
                    // non-critical
                }
            }
        } catch {
            setError('Lecture not found.');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = async (page) => {
        setCurrentPage(page);
        if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        try {
            const total = lecture.pages?.length || 0;
            const completed = page >= total;
            await lectureService.updateProgress(lectureId, {
                last_page_seen: page,
                completed,
            });
            if (completed) {
                setLecture(prev => ({
                    ...prev,
                    progress: { ...(prev.progress || {}), completed: true, last_page_seen: page },
                }));
                setCompletedIds(prev => new Set([...prev, String(lectureId)]));
            }
        } catch {
            // non-critical
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !lecture) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-400 bg-gray-950">
                <p>{error || 'Lecture not found.'}</p>
                <button onClick={goBack} className="px-4 py-2 bg-gray-700 rounded-lg text-sm">Go back</button>
            </div>
        );
    }

    const pages = lecture.pages || [];
    const media = lecture.media || [];
    const page = pages.find(p => p.page_number === currentPage) || pages[currentPage - 1];
    const total = pages.length;
    const isCompleted = completedIds.has(String(lectureId)) || !!lecture.progress?.completed;

    const currentIdx = siblings.findIndex(s => String(s.id) === String(lectureId));
    const prevLecture = currentIdx > 0 ? siblings[currentIdx - 1] : null;
    const nextLecture = currentIdx >= 0 && currentIdx < siblings.length - 1 ? siblings[currentIdx + 1] : null;

    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

            {/* ── Left sidebar ── */}
            <aside
                className="flex-shrink-0 border-r border-gray-800 transition-all duration-300 overflow-hidden"
                style={{ width: sidebarOpen ? '272px' : '0px' }}
            >
                <div className="w-[272px] h-full flex flex-col bg-gray-900">
                    <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                        <button
                            onClick={goBack}
                            className="text-gray-400 hover:text-white text-sm transition-colors"
                        >
                            ← Back
                        </button>
                        <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Contents</span>
                    </div>

                    <nav className="flex-1 overflow-y-auto py-2">
                        {siblings.map((sib) => {
                            const isCurrent = String(sib.id) === String(lectureId);
                            const isDone = completedIds.has(String(sib.id)) || !!sib.lecture_completed;
                            return (
                                <button
                                    key={sib.id}
                                    onClick={() => navigate(`/lectures/${sib.id}`)}
                                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-r-2 ${
                                        isCurrent
                                            ? 'bg-purple-600/15 border-purple-500'
                                            : 'border-transparent hover:bg-gray-800'
                                    }`}
                                >
                                    <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                                        isDone
                                            ? 'border-green-500 bg-green-500/20 text-green-400'
                                            : isCurrent
                                            ? 'border-purple-400 bg-purple-500/20 text-purple-300'
                                            : 'border-gray-600 bg-transparent text-transparent'
                                    }`}>
                                        {isDone ? '✓' : ''}
                                    </span>
                                    <div className="min-w-0">
                                        <p className={`text-sm leading-snug ${isCurrent ? 'text-white font-medium' : 'text-gray-300'}`}>
                                            {sib.title}
                                        </p>
                                        {sib.chapter_title && (
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{sib.chapter_title}</p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* ── Main area ── */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                {/* Top bar */}
                <header className="flex-shrink-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(o => !o)}
                        className="text-gray-400 hover:text-white transition-colors p-1.5 rounded hover:bg-gray-700"
                        title="Toggle sidebar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-semibold text-white truncate">{lecture.title}</h1>
                        {lecture.chapter_title && (
                            <p className="text-xs text-gray-400 truncate">{lecture.chapter_title}</p>
                        )}
                    </div>
                    {total > 1 && (
                        <span className="text-xs text-gray-500 flex-shrink-0">
                            Page {currentPage} / {total}
                        </span>
                    )}
                    {isCompleted && (
                        <span className="flex-shrink-0 text-xs text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full border border-green-500/30">
                            ✓ Completed
                        </span>
                    )}
                    <ThemeToggle />
                </header>

                {/* Scrollable content */}
                <main ref={mainRef} className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-8 py-10">

                        {pages.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
                                <p className="text-5xl mb-4">📄</p>
                                <p>No pages yet.</p>
                            </div>
                        ) : (
                            <>
                                {page?.title && (
                                    <h2 className="text-3xl font-bold text-white mb-8 leading-tight">
                                        {page.title}
                                    </h2>
                                )}

                                {/* Content — key forces full remount on page change so Tiptap re-initialises */}
                                <div className="
                                    text-gray-200 leading-7
                                    [&_.ProseMirror]:outline-none
                                    [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-8 [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:text-white
                                    [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-6 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:text-white
                                    [&_.ProseMirror_p]:mb-4 [&_.ProseMirror_p]:leading-7
                                    [&_.ProseMirror_pre]:bg-gray-800 [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:my-4 [&_.ProseMirror_pre]:overflow-x-auto
                                    [&_.ProseMirror_code]:bg-gray-800 [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-sm [&_.ProseMirror_code]:font-mono
                                    [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-purple-500 [&_.ProseMirror_blockquote]:pl-5 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-gray-300 [&_.ProseMirror_blockquote]:my-4
                                    [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:mb-4
                                    [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:mb-4
                                    [&_.ProseMirror_li]:mb-1
                                    [&_.ProseMirror_a]:text-purple-400 [&_.ProseMirror_a]:underline [&_.ProseMirror_a:hover]:text-purple-300
                                ">
                                    <RichTextEditor
                                        key={currentPage}
                                        value={page?.content || ''}
                                        readOnly
                                    />
                                </div>

                                {/* Page navigation (only for multi-page lectures) */}
                                {total > 1 && (
                                    <div className="flex items-center justify-between mt-14 pt-8 border-t border-gray-800">
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage <= 1}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-200 text-sm rounded-lg transition-colors"
                                        >
                                            ← Previous
                                        </button>

                                        <div className="flex gap-1.5">
                                            {Array.from({ length: total }, (_, i) => i + 1).map(p => (
                                                <button
                                                    key={p}
                                                    onClick={() => handlePageChange(p)}
                                                    className={`w-8 h-8 text-sm rounded-full transition-colors ${
                                                        p === currentPage
                                                            ? 'bg-purple-600 text-white'
                                                            : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage >= total}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-200 text-sm rounded-lg transition-colors"
                                        >
                                            Next →
                                        </button>
                                    </div>
                                )}

                                {/* Cross-lecture navigation — show when on last page */}
                                {currentPage === total && (prevLecture || nextLecture) && (
                                    <div className="flex items-center justify-between mt-6">
                                        {prevLecture ? (
                                            <button
                                                onClick={() => navigate(`/lectures/${prevLecture.id}`)}
                                                className="text-sm text-gray-400 hover:text-white transition-colors max-w-[45%] text-left truncate"
                                            >
                                                ← {prevLecture.title}
                                            </button>
                                        ) : <div />}
                                        {nextLecture && (
                                            <button
                                                onClick={() => navigate(`/lectures/${nextLecture.id}`)}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors ml-auto flex-shrink-0"
                                            >
                                                Next: {nextLecture.title} →
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Media section */}
                        {media.length > 0 && (
                            <div className="mt-12 pt-8 border-t border-gray-800">
                                <h3 className="text-lg font-semibold mb-6 text-gray-200">Media</h3>
                                <div className="space-y-6">
                                    {media.map(item => (
                                        <div key={item.id}>
                                            {item.media_type === 'video' ? (
                                                <VideoPlayer src={item.file_url} title={item.title} />
                                            ) : (
                                                <PowerPointViewer
                                                    src={item.file_url}
                                                    fileUrl={item.file_url}
                                                    title={item.title}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bottom padding */}
                        <div className="h-16" />
                    </div>
                </main>
            </div>
        </div>
    );
}
