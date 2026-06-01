export default function LecturePageNav({ current, total, onPrev, onNext, onSelect }) {
    if (total <= 1) return null;

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={onPrev}
                disabled={current <= 1}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 text-sm rounded-lg transition-colors"
            >
                ← Prev
            </button>

            <div className="flex gap-1">
                {Array.from({ length: total }, (_, i) => i + 1).map((page) => (
                    <button
                        key={page}
                        onClick={() => onSelect(page)}
                        className={`w-8 h-8 text-sm rounded-full transition-colors ${
                            page === current
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                    >
                        {page}
                    </button>
                ))}
            </div>

            <button
                onClick={onNext}
                disabled={current >= total}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 text-sm rounded-lg transition-colors"
            >
                Next →
            </button>

            <span className="text-gray-400 text-sm ml-2">
                Page {current} of {total}
            </span>
        </div>
    );
}
