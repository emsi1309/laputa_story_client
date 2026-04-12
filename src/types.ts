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
};

export type ComicCard = {
  id: number;
  title: string;
  slug: string;
  author: string | null;
  status: string;
  coverUrl: string | null;
  updatedAt: string;
  followCount: number;
  genres: GenreItem[];
  latestChapter: ChapterBrief | null;
};

export type ComicDetail = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  author: string | null;
  status: string;
  coverUrl: string | null;
  updatedAt: string;
  followCount: number;
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
