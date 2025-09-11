"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Loading from "@/components/ui/loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

interface Post {
  id: string;
  created_at: string;
  post_title: string;
  category: string;
}

const LoadingComponent = Loading as any;
const CardComponent = Card as any;
const CardContentComponent = CardContent as any;
const TableComponent = Table as any;
const TableHeaderComponent = TableHeader as any;
const TableRowComponent = TableRow as any;
const TableHeadComponent = TableHead as any;
const TableBodyComponent = TableBody as any;
const TableCellComponent = TableCell as any;
const ButtonComponent = Button as any;
const LinkComponent = Link as any;

export default function MyContentPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { colors } = useTheme();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          setError("Authentication error");
          setIsLoading(false);
          return;
        }
        if (!user) {
          window.location.href = "/auth";
          return;
        }
        // Fetch posts for current user
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select("id, created_at, post_title, category")
          .eq("UID", user.id)
          .order("created_at", { ascending: false });
        if (postsError) {
          setError("Failed to load posts");
        } else {
          setPosts(postsData || []);
        }
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, [supabase]);

  const handleDelete = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId)); // Optimistic UI
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);
    if (error) {
      setError("Failed to delete post");
      // Optionally, refetch posts or revert UI
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold text-center mb-8">My Content</h1>
      <CardComponent>
        <CardContentComponent>
          {isLoading ? (
            <LoadingComponent />
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">You haven't created any posts yet.</div>
          ) : (
            <TableComponent>
              <TableHeaderComponent>
                <TableRowComponent>
                  <TableHeadComponent>Post ID</TableHeadComponent>
                  <TableHeadComponent>Created</TableHeadComponent>
                  <TableHeadComponent>Post Title</TableHeadComponent>
                  <TableHeadComponent>Category</TableHeadComponent>
                  <TableHeadComponent>View Post</TableHeadComponent>
                </TableRowComponent>
              </TableHeaderComponent>
              <TableBodyComponent>
                {posts.map((post) => (
                  <TableRowComponent key={post.id}>
                    <TableCellComponent>{post.id}</TableCellComponent>
                    <TableCellComponent>{new Date(post.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</TableCellComponent>
                    <TableCellComponent>{post.post_title || <span className="italic text-muted-foreground">Untitled</span>}</TableCellComponent>
                    <TableCellComponent>{post.category || <span className="italic text-muted-foreground">Uncategorized</span>}</TableCellComponent>
                    <TableCellComponent>
                      <a
                        href={`/post?pid=${post.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ButtonComponent size="sm" variant="outline">
                          View Post
                        </ButtonComponent>
                      </a>
                      <ButtonComponent
                        size="sm"
                        style={{ backgroundColor: colors.accent2, color: '#fff', marginLeft: 8 }}
                        onClick={() => handleDelete(post.id)}
                      >
                        Delete Post
                      </ButtonComponent>
                    </TableCellComponent>
                  </TableRowComponent>
                ))}
              </TableBodyComponent>
            </TableComponent>
          )}
        </CardContentComponent>
      </CardComponent>
    </div>
  );
} 