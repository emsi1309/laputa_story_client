export type GenreItem = {
  id: number;
  name: string;
  slug: string;
};

export type ChapterBrief = {
  id: number;
  title: string;
  slug: string;
  number: number | null;
  sortIndex: number;
  publishedAt: string | null;
  viewCount: number;
};

export type ComicCard = {
  id: number;
  title: string;
  slug: string;
  author: string | null;
  releaseYear: number | null;
  status: string;
  coverUrl: string | null;
  updatedAt: string;
  viewCount: number;
  followCount: number;
  favoriteCount: number;
  ratingAverage: number;
  ratingCount: number;
  genres: GenreItem[];
  latestChapter: ChapterBrief | null;
};

export type ComicDetail = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  author: string | null;
  releaseYear: number | null;
  status: string;
  coverUrl: string | null;
  updatedAt: string;
  viewCount: number;
  followCount: number;
  favoriteCount: number;
  ratingAverage: number;
  ratingCount: number;
  genres: GenreItem[];
  chapters: ChapterBrief[];
};

export type ReaderData = {
  comic: {
    id: number;
    title: string;
    slug: string;
  };
  chapter: {
    id: number;
    title: string;
    slug: string;
    number: number | null;
    sortIndex: number;
    publishedAt: string | null;
    viewCount: number;
  };
  pages: {
    id: number;
    pageIndex: number;
    imageUrl: string;
  }[];
  prevChapter: {
    id: number;
    title: string;
    slug: string;
    number: number | null;
  } | null;
  nextChapter: {
    id: number;
    title: string;
    slug: string;
    number: number | null;
  } | null;
};

export type CommentItem = {
  id: number;
  comicId: number;
  chapterId: number | null;
  userId: number;
  userDisplayName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
};

export type CommentPage = {
  content: CommentItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

export type RatingSummary = {
  comicId: number;
  averageScore: number;
  ratingCount: number;
};

export type UserRating = {
  comicId: number;
  score: number | null;
};

export type FavoriteState = {
  favorite: boolean;
  favoriteCount: number;
};

export type FavoriteComic = {
  comicId: number;
  title: string;
  slug: string;
  coverUrl: string | null;
  author: string | null;
  status: string;
  favoritedAt: string;
};

export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
  readAt: string | null;
};

export type NotificationPage = {
  content: NotificationItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type RecommendationItem = {
  comicId: number;
  title: string;
  slug: string;
  coverUrl: string | null;
  author: string | null;
  status: string;
  matchedGenres: number;
  reason: string;
};
