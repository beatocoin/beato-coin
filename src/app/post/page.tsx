"use client"

import { createClient } from "@/utils/supabase/client"
import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import React from "react"
import { Editor } from '@tinymce/tinymce-react'
import { useRef } from 'react'
import { toast } from "@/utils/toast"

export default function PostPage() {
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null)
  const [pid, setPid] = useState<string | null>(null)
  const [post, setPost] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editorContent, setEditorContent] = useState("")
  const editorRef = useRef<any>(null)
  const supabase = createClient()
  const tinymceApiKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY;
  const [postTitle, setPostTitle] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSearchParams(params)
    const id = params.get('pid')
    setPid(id)
    if (id) {
      (async () => {
        setLoading(true)
        const { data, error } = await supabase
          .from('posts')
          .select('post, post_title, category')
          .eq('id', id)
          .single()
        if (error) {
          setError("Post not found.")
        } else {
          setPost(data?.post || "")
          setEditorContent(data?.post || "")
          setPostTitle(data?.post_title || "")
          setCategory(data?.category || "")
        }
        setLoading(false)
      })()
    } else {
      setLoading(false)
      setError("No post id provided.")
    }
  }, [supabase])

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('posts')
      .update({ post: editorContent, post_title: postTitle })
      .eq('id', pid)
    if (!error) {
      setPost(editorContent)
      setEditing(false)
    }
    setLoading(false)
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>

  return (
    <div className="mx-auto py-12 px-4">
      <div className="flex justify-end max-w-[1000px] mx-auto mb-2">
        {!editing && (
          <>
            <div className="flex-1 flex items-center">
              {category && (
                <span className="text-base font-semibold text-gray-700 mr-4">Category: <span className="font-bold">{category}</span></span>
              )}
            </div>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded shadow"
              onClick={() => setEditing(true)}
            >
              Edit Post
            </button>
            <button
              className="bg-gray-600 text-white px-4 py-2 rounded shadow ml-2"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(post);
                  toast.success("Post Copied to Clipboard");
                } catch (err) {
                  toast.error("Failed to copy post");
                }
              }}
            >
              Copy HTML
            </button>
          </>
        )}
      </div>
      <div className="prose prose-lg bg-white p-6 rounded-xl border border-gray-200 shadow max-w-[1000px] mx-auto">
        {!editing && postTitle && (
          <h1 className="text-3xl font-bold mb-6">{postTitle}</h1>
        )}
        {editing ? (
          <>
            <input
              type="text"
              className="mb-4 w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Post Title"
              value={postTitle}
              onChange={e => setPostTitle(e.target.value)}
            />
            <Editor
              apiKey={tinymceApiKey}
              onInit={(evt: any, editor: import('tinymce').Editor) => (editorRef.current = editor)}
              initialValue={post}
              value={editorContent}
              onEditorChange={setEditorContent}
              init={{
                height: 500,
                menubar: false,
                plugins: [
                  'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'image', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
                  'checklist', 'mediaembed', 'casechange', 'formatpainter', 'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable', 'advcode', 'editimage', 'advtemplate', 'ai', 'mentions', 'tinycomments', 'tableofcontents', 'footnotes', 'mergetags', 'autocorrect', 'typography', 'inlinecss', 'markdown', 'importword', 'exportword', 'exportpdf',
                  'code',
                  'editimage'
                ],
                toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image editimage media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat | code',
                tinycomments_mode: 'embedded',
                tinycomments_author: 'Author name',
                mergetags_list: [
                  { value: 'First.Name', title: 'First Name' },
                  { value: 'Email', title: 'Email' },
                ],
                branding: false,
                ai_request: (request: any, respondWith: any) => {
                  respondWith.string(async () => {
                    const response = await fetch('https://app.geviweb.site/webhook/editor-ai', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ query: request.prompt }),
                    });
                    if (!response.ok) {
                      throw new Error('Failed to get AI response');
                    }
                    const data = await response.json();
                    return (Array.isArray(data) && data[0]?.message) ? data[0].message : '';
                  });
                },
              }}
            />
            <div className="flex gap-2 mt-4">
              <button
                className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={handleSave}
              >
                Save
              </button>
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            components={{
              p: ({node, ...props}) => {
                const newChildren = React.Children.map(
                  props.children,
                  child => {
                    if (typeof child === 'string') {
                      return child.split('\n').map((text, i, array) => (
                      <React.Fragment key={i}>
                        {text}
                        {i < array.length - 1 && <br />}
                      </React.Fragment>
                    ));
                    }
                    return child;
                  }
                );
                return <p {...props}>{newChildren}</p>;
              },
              h1: ({node, ...props}) => (
                <h1 className="text-2xl leading-[2.25rem] font-bold mb-4" {...props} />
              ),
              h2: ({node, ...props}) => (
                <h2 className="text-[1.8rem] leading-[2rem] font-semibold mb-3" {...props} />
              ),
              text: ({node, ...props}) => {
                const value = String(props.children);
                if (value.includes('\n')) {
                  return value.split('\n').map((text, i, array) => (
                    <React.Fragment key={i}>
                      {text}
                      {i < array.length - 1 && <br />}
                    </React.Fragment>
                  ));
                }
                return <>{value}</>;
              },
              strong: ({node, ...props}) => <strong {...props} />,
              table: ({node, ...props}) => (
                <table className="min-w-full border border-gray-300 my-4 text-sm">
                  {props.children}
                </table>
              ),
              thead: ({node, ...props}) => (
                <thead className="bg-gray-100">
                  {props.children}
                </thead>
              ),
              tbody: ({node, ...props}) => (
                <tbody>{props.children}</tbody>
              ),
              tr: ({node, ...props}) => (
                <tr className="border-b border-gray-200 last:border-0">
                  {props.children}
                </tr>
              ),
              th: ({node, ...props}) => (
                <th className="px-4 py-2 font-semibold text-left bg-gray-50 border border-gray-300">
                  {props.children}
                </th>
              ),
              td: ({node, ...props}) => (
                <td className="px-4 py-2 border border-gray-300">
                  {props.children}
                </td>
              ),
            }}
          >
            {post}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
} 