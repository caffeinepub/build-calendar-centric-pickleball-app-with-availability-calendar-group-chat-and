import type { Post } from '../backend';

export interface ThreadNode {
  post: Post;
  replies: ThreadNode[];
}

/**
 * Builds a multi-level thread tree from a flat list of posts.
 * Handles missing parents defensively by placing orphaned posts at the root.
 */
export function buildThreadTree(posts: Post[]): ThreadNode[] {
  const postMap = new Map<string, ThreadNode>();
  const rootNodes: ThreadNode[] = [];

  // First pass: create nodes for all posts
  posts.forEach(post => {
    postMap.set(post.id.toString(), {
      post,
      replies: [],
    });
  });

  // Second pass: build parent-child relationships
  posts.forEach(post => {
    const node = postMap.get(post.id.toString());
    if (!node) return;

    if (post.parentId === null || post.parentId === undefined) {
      // Top-level post
      rootNodes.push(node);
    } else {
      // Reply to another post
      const parentNode = postMap.get(post.parentId.toString());
      if (parentNode) {
        parentNode.replies.push(node);
      } else {
        // Parent not found, treat as root (defensive)
        rootNodes.push(node);
      }
    }
  });

  // Sort root nodes by timestamp (newest first)
  rootNodes.sort((a, b) => Number(b.post.timestamp - a.post.timestamp));

  // Sort replies within each node recursively (oldest first for readability)
  const sortReplies = (node: ThreadNode) => {
    node.replies.sort((a, b) => Number(a.post.timestamp - b.post.timestamp));
    node.replies.forEach(sortReplies);
  };
  rootNodes.forEach(sortReplies);

  return rootNodes;
}

/**
 * Flattens a thread tree into a list for rendering with depth information.
 */
export interface FlatThreadItem {
  post: Post;
  depth: number;
}

export function flattenThreadTree(nodes: ThreadNode[], depth: number = 0): FlatThreadItem[] {
  const result: FlatThreadItem[] = [];
  
  nodes.forEach(node => {
    result.push({ post: node.post, depth });
    if (node.replies.length > 0) {
      result.push(...flattenThreadTree(node.replies, depth + 1));
    }
  });
  
  return result;
}
