import { useState, useRef } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

// ── Resizable image node view ─────────────────────────────────────────────────

function ResizableImageView({ node, updateAttributes, selected, editor }) {
    const { src, alt, title, width } = node.attrs;
    const imgRef = useRef(null);

    const startResize = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidth = imgRef.current?.offsetWidth || 400;

        const onMove = (mv) => {
            const newWidth = Math.max(80, Math.round(startWidth + (mv.clientX - startX)));
            updateAttributes({ width: newWidth });
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    const isEditable = editor.isEditable;

    return (
        <NodeViewWrapper>
            <div
                style={{ display: 'inline-block', position: 'relative', maxWidth: '100%' }}
                className={selected && isEditable ? 'outline outline-2 outline-purple-500 outline-offset-2 rounded-lg' : ''}
            >
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt || ''}
                    title={title || ''}
                    draggable={false}
                    style={{
                        width: width ? `${width}px` : undefined,
                        maxWidth: '100%',
                        display: 'block',
                        borderRadius: '0.5rem',
                        margin: '1rem 0',
                    }}
                />
                {selected && isEditable && (
                    <div
                        onMouseDown={startResize}
                        title="Drag to resize"
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '14px',
                            height: '14px',
                            background: '#9333ea',
                            borderRadius: '3px 0 4px 0',
                            cursor: 'se-resize',
                            zIndex: 10,
                        }}
                    />
                )}
                {selected && isEditable && width && (
                    <span
                        style={{
                            position: 'absolute',
                            bottom: '18px',
                            right: '4px',
                            fontSize: '10px',
                            color: '#d1d5db',
                            background: 'rgba(0,0,0,0.55)',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            pointerEvents: 'none',
                        }}
                    >
                        {width}px
                    </span>
                )}
            </div>
        </NodeViewWrapper>
    );
}

const ResizableImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: null,
                parseHTML: (el) => {
                    const w = el.getAttribute('width') || el.style.width;
                    return w ? parseInt(w) : null;
                },
                renderHTML: (attrs) =>
                    attrs.width
                        ? { width: attrs.width, style: `width:${attrs.width}px;max-width:100%` }
                        : {},
            },
        };
    },
    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageView);
    },
});

function ToolbarBtn({ onClick, active, title, children, className = '' }) {
    return (
        <button
            type="button"
            title={title}
            onMouseDown={e => { e.preventDefault(); onClick(); }}
            className={`px-2 py-1 text-sm rounded transition-colors ${
                active
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600 hover:text-white'
            } ${className}`}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <span className="w-px h-5 bg-gray-600 mx-1 flex-shrink-0" />;
}

export default function RichTextEditor({ value, onChange, readOnly = false, placeholder = 'Start writing…' }) {
    const [htmlModalOpen, setHtmlModalOpen] = useState(false);
    const [sourceMode, setSourceMode] = useState(false);
    const [rawHtml, setRawHtml] = useState('');
    const [showImageUrl, setShowImageUrl] = useState(false);
    const [imageUrlVal, setImageUrlVal] = useState('');
    const [copied, setCopied] = useState(false);
    const imageFileRef = useRef(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            ResizableImage.configure({ inline: false }),
            Link.configure({ openOnClick: readOnly }),
            Placeholder.configure({ placeholder }),
        ],
        content: value || '',
        editable: !readOnly,
        editorProps: {
            handlePaste(view, event) {
                const items = event.clipboardData?.items;
                if (!items) return false;
                for (const item of Array.from(items)) {
                    if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        if (file) {
                            event.preventDefault();
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                view.dispatch(
                                    view.state.tr.replaceSelectionWith(
                                        view.state.schema.nodes.image.create({ src: e.target.result })
                                    )
                                );
                            };
                            reader.readAsDataURL(file);
                            return true;
                        }
                    }
                }
                return false;
            },
        },
        onUpdate({ editor }) {
            if (onChange) onChange(editor.getHTML());
        },
    });

    if (!editor) return null;

    if (readOnly) {
        return (
            <div className="prose prose-invert max-w-none">
                <EditorContent editor={editor} />
            </div>
        );
    }

    const handleImageFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            editor.chain().focus().setImage({ src: ev.target.result }).run();
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const insertImageUrl = () => {
        if (imageUrlVal.trim()) {
            editor.chain().focus().setImage({ src: imageUrlVal.trim() }).run();
        }
        setImageUrlVal('');
        setShowImageUrl(false);
    };

    const enterSourceMode = () => {
        setRawHtml(editor.getHTML());
        setSourceMode(true);
    };

    const exitSourceMode = () => {
        editor.commands.setContent(rawHtml, false);
        if (onChange) onChange(rawHtml);
        setSourceMode(false);
    };

    const copyHtml = async () => {
        const html = sourceMode ? rawHtml : editor.getHTML();
        await navigator.clipboard.writeText(html);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const is = (type, attrs) => editor.isActive(type, attrs);

    return (
        <div className="border border-gray-700 rounded-xl overflow-visible">

            {/* ── Toolbar ── */}
            <div className="flex flex-wrap items-center gap-0.5 p-2 bg-gray-800 border-b border-gray-700 rounded-t-xl">

                {/* Text style */}
                <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={is('bold')} title="Bold">
                    <strong>B</strong>
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={is('italic')} title="Italic">
                    <em>I</em>
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={is('strike')} title="Strikethrough">
                    <s>S</s>
                </ToolbarBtn>

                <Divider />

                {/* Headings */}
                <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={is('heading', { level: 1 })} title="Heading 1">H1</ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={is('heading', { level: 2 })} title="Heading 2">H2</ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={is('heading', { level: 3 })} title="Heading 3">H3</ToolbarBtn>

                <Divider />

                {/* Lists */}
                <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={is('bulletList')} title="Bullet list">• List</ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={is('orderedList')} title="Ordered list">1. List</ToolbarBtn>

                <Divider />

                {/* Block elements */}
                <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={is('codeBlock')} title="Code block" className="font-mono text-xs">&lt;/&gt;</ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={is('blockquote')} title="Blockquote">❝</ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Horizontal rule">—</ToolbarBtn>

                <Divider />

                {/* Undo / Redo */}
                <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo">↩</ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo">↪</ToolbarBtn>

                <Divider />

                {/* Image: upload from file */}
                <ToolbarBtn onClick={() => imageFileRef.current?.click()} active={false} title="Upload image from file">
                    📷 Image
                </ToolbarBtn>
                <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />

                {/* Image: from URL */}
                <div className="relative">
                    <ToolbarBtn onClick={() => setShowImageUrl(v => !v)} active={showImageUrl} title="Insert image from URL">
                        🔗 URL
                    </ToolbarBtn>
                    {showImageUrl && (
                        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg p-2 flex gap-2 z-20 shadow-xl"
                             style={{ minWidth: '300px' }}>
                            <input
                                autoFocus
                                value={imageUrlVal}
                                onChange={e => setImageUrlVal(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') insertImageUrl(); if (e.key === 'Escape') setShowImageUrl(false); }}
                                placeholder="https://example.com/image.png"
                                className="flex-1 px-2 py-1 bg-gray-700 border border-gray-500 rounded text-white text-xs focus:outline-none focus:border-purple-500"
                            />
                            <button type="button" onClick={insertImageUrl} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded transition-colors">
                                Insert
                            </button>
                        </div>
                    )}
                </div>

                {/* Push remaining buttons to the right */}
                <div className="flex-1" />

                {/* Source / HTML edit mode */}
                {sourceMode ? (
                    <button
                        type="button"
                        onClick={exitSourceMode}
                        className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors font-medium"
                    >
                        ✓ Apply HTML
                    </button>
                ) : (
                    <ToolbarBtn onClick={enterSourceMode} active={false} title="Edit raw HTML source" className="font-mono text-xs">
                        Source
                    </ToolbarBtn>
                )}

                {/* Export HTML */}
                <button
                    type="button"
                    onClick={() => { if (!sourceMode) setRawHtml(editor.getHTML()); setHtmlModalOpen(true); }}
                    title="View / export HTML"
                    className="px-2 py-1 text-xs text-gray-400 hover:bg-gray-600 hover:text-white rounded transition-colors ml-1"
                >
                    Export HTML
                </button>
            </div>

            {/* ── Editor / Source textarea ── */}
            <div className={sourceMode ? 'hidden' : ''}>
                <div className="
                    bg-gray-950 text-gray-100 min-h-[400px] p-6 rounded-b-xl
                    [&_.ProseMirror]:outline-none
                    [&_.ProseMirror]:min-h-[350px]
                    [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-600
                    [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
                    [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left
                    [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none
                    [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:text-white
                    [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-white
                    [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:text-white
                    [&_.ProseMirror_p]:mb-3 [&_.ProseMirror_p]:leading-7
                    [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:my-4
                    [&_.ProseMirror_code]:bg-gray-800 [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-sm [&_.ProseMirror_code]:font-mono [&_.ProseMirror_code]:text-purple-300
                    [&_.ProseMirror_pre]:bg-gray-800 [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:my-4 [&_.ProseMirror_pre]:overflow-x-auto
                    [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-purple-500 [&_.ProseMirror_blockquote]:pl-5 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-gray-300 [&_.ProseMirror_blockquote]:my-4
                    [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:mb-3
                    [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:mb-3
                    [&_.ProseMirror_li]:mb-1
                    [&_.ProseMirror_a]:text-purple-400 [&_.ProseMirror_a]:underline [&_.ProseMirror_a:hover]:text-purple-300
                    [&_.ProseMirror_hr]:border-gray-700 [&_.ProseMirror_hr]:my-6
                    [&_.ProseMirror_s]:line-through [&_.ProseMirror_s]:text-gray-400
                ">
                    <EditorContent editor={editor} />
                </div>
            </div>

            {sourceMode && (
                <div className="rounded-b-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700">
                        <span className="text-xs text-amber-400 font-medium">HTML Source — editing directly</span>
                        <span className="text-xs text-gray-500">Click "✓ Apply HTML" in the toolbar to render</span>
                    </div>
                    <textarea
                        value={rawHtml}
                        onChange={e => setRawHtml(e.target.value)}
                        className="w-full min-h-[400px] p-4 bg-gray-950 text-green-400 font-mono text-sm resize-y focus:outline-none rounded-b-xl"
                        spellCheck={false}
                    />
                </div>
            )}

            {/* ── HTML Export Modal ── */}
            {htmlModalOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setHtmlModalOpen(false)}
                >
                    <div
                        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl flex flex-col shadow-2xl"
                        style={{ maxHeight: '80vh' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 flex-shrink-0">
                            <div>
                                <h3 className="font-semibold text-white text-sm">HTML Source</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Copy this to use the content elsewhere, or paste HTML below and click Import</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={copyHtml}
                                    className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                                >
                                    {copied ? '✓ Copied!' : 'Copy HTML'}
                                </button>
                                <button onClick={() => setHtmlModalOpen(false)} className="text-gray-400 hover:text-white px-2 py-1 text-sm">✕</button>
                            </div>
                        </div>
                        <pre className="flex-1 overflow-auto p-5 text-xs text-green-400 font-mono whitespace-pre-wrap bg-gray-950 rounded-b-xl">
                            {sourceMode ? rawHtml : editor.getHTML()}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
