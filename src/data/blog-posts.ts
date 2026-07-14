// 博客文章数据 —— 在这里增删改文章
// 后续写新文章只需在这个数组里加新条目即可

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  readTime: string;
  category: "life" | "travel" | "photography" | "tech" | "reflection";
  tags: string[];
  summary: string;
  content: string;
  coverImage?: string; // base64 封面图
  coverPosition?: number; // 0-100, 封面垂直位置
  commentsEnabled?: boolean; // 管理员可关闭评论区
}

export const blogPosts: BlogPost[] = [];
