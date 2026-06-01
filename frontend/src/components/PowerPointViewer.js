const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export default function PowerPointViewer({ src, title, fileUrl }) {
    const downloadUrl = fileUrl || src;

    // Google Docs viewer needs a publicly reachable URL — falls back to download on localhost
    if (isLocalhost) {
        return (
            <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
                <span className="text-4xl">📊</span>
                <div className="flex-1">
                    <p className="text-gray-200 font-medium">{title || 'Presentation'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                        Preview not available on localhost — Google Docs viewer requires a public URL.
                    </p>
                </div>
                <a
                    href={downloadUrl}
                    download
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                >
                    Download
                </a>
            </div>
        );
    }

    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + src)}&embedded=true`;

    return (
        <div className="w-full rounded-lg overflow-hidden border border-gray-600">
            {title && (
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-600">
                    <span className="text-sm text-gray-300 font-medium">📊 {title}</span>
                    <a
                        href={downloadUrl}
                        download
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                        Download
                    </a>
                </div>
            )}
            <iframe
                src={viewerUrl}
                className="w-full"
                style={{ height: '500px' }}
                title={title || 'Presentation'}
                frameBorder="0"
            />
        </div>
    );
}
