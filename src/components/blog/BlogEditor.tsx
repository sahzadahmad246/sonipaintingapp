"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { useCallback } from "react";
import {
    Bold,
    Italic,
    Strikethrough,
    Heading1,
    Heading2,
    List,
    ListOrdered,
    Quote,
    Image as ImageIcon,
    Undo,
    Redo
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import { toast } from "sonner";

interface BlogEditorProps {
    content: string;
    onChange: (html: string) => void;
    editable?: boolean;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {




    // Handle local image upload
    const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editor) return;
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "sonipainting";
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

        console.log("DEBUG: Uploading with preset:", preset);
        console.log("DEBUG: Cloud Name:", cloudName);

        formData.append("file", file);
        formData.append("upload_preset", preset);

        try {
            const promise = axios.post(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
                formData
            );

            toast.promise(promise, {
                loading: 'Uploading image...',
                success: (res) => {
                    editor.chain().focus().setImage({ src: res.data.secure_url }).run();
                    return 'Image uploaded successfully';
                },
                error: 'Failed to upload image',
            });
        } catch (error) {
            console.error("Error uploading image:", error);
        }
    }, [editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg sticky top-0 z-10 w-full">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={cn("p-1.5 rounded hover:bg-gray-200 transition-colors", editor.isActive("bold") ? "bg-gray-200 text-black" : "text-gray-600")}
                title="Bold"
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={cn("p-1.5 rounded hover:bg-gray-200 transition-colors", editor.isActive("italic") ? "bg-gray-200 text-black" : "text-gray-600")}
                title="Italic"
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={!editor.can().chain().focus().toggleStrike().run()}
                className={cn("p-1.5 rounded hover:bg-gray-200 transition-colors", editor.isActive("strike") ? "bg-gray-200 text-black" : "text-gray-600")}
                title="Strike"
            >
                <Strikethrough className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={cn("p-1.5 rounded hover:bg-gray-200 transition-colors", editor.isActive("heading", { level: 1 }) ? "bg-gray-200 text-black" : "text-gray-600")}
                title="Heading 1"
            >
                <Heading1 className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn("p-1.5 rounded hover:bg-gray-200 transition-colors", editor.isActive("heading", { level: 2 }) ? "bg-gray-200 text-black" : "text-gray-600")}
                title="Heading 2"
            >
                <Heading2 className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn("p-1.5 rounded hover:bg-gray-200 transition-colors", editor.isActive("bulletList") ? "bg-gray-200 text-black" : "text-gray-600")}
                title="Bullet List"
            >
                <List className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn("p-1.5 rounded hover:bg-gray-200 transition-colors", editor.isActive("orderedList") ? "bg-gray-200 text-black" : "text-gray-600")}
                title="Ordered List"
            >
                <ListOrdered className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={cn("p-1.5 rounded hover:bg-gray-200 transition-colors", editor.isActive("blockquote") ? "bg-gray-200 text-black" : "text-gray-600")}
                title="Quote"
            >
                <Quote className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <label className="p-1.5 rounded hover:bg-gray-200 transition-colors cursor-pointer text-gray-600" title="Image">
                <ImageIcon className="w-4 h-4" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                className="p-1.5 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 text-gray-600"
                title="Undo"
            >
                <Undo className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                className="p-1.5 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 text-gray-600"
                title="Redo"
            >
                <Redo className="w-4 h-4" />
            </button>
        </div>
    );
};

const BlogEditor = ({ content, onChange, editable = true }: BlogEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // We configure the heading to include specific classes for styling
                heading: {
                    HTMLAttributes: {
                        class: "text-2xl font-bold mt-4 mb-2 text-gray-800",
                    },
                    levels: [1, 2, 3],
                }
            }),
            Image.configure({
                HTMLAttributes: {
                    class: "rounded-lg max-w-full h-auto mx-auto my-6 border border-gray-200 shadow-sm",
                },
            }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                defaultProtocol: 'https',
                HTMLAttributes: {
                    class: "text-blue-600 underline hover:text-blue-800",
                },
            }),
            Placeholder.configure({
                placeholder: 'Write your story...',
            }),
            Underline,
        ],
        content,
        editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: "prose prose-lg focus:outline-none max-w-none min-h-[300px] px-4 py-2",
            }
        },
        immediatelyRender: false,
    });

    return (
        <div className="w-full border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden flex flex-col">
            {editable && <MenuBar editor={editor} />}
            <EditorContent editor={editor} className="flex-1 w-full" />
        </div>
    );
};

export default BlogEditor;
