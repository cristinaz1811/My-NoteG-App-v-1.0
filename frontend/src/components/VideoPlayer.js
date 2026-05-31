export default function VideoPlayer({ src, title }) {
    if (!src) return null;

    return (
        <div className="w-full rounded-lg overflow-hidden bg-black">
            {title && (
                <div className="px-4 py-2 bg-gray-800 text-sm text-gray-300 font-medium">
                    {title}
                </div>
            )}
            <video
                controls
                className="w-full max-h-[500px]"
                preload="metadata"
            >
                <source src={src} />
                Your browser does not support the video tag.
            </video>
        </div>
    );
}
