import api from "./api";
import type { GenreItem } from "../types";

let cachedGenres: GenreItem[] | null = null;
let pendingGenresRequest: Promise<GenreItem[]> | null = null;

export const fetchPublicGenres = async (forceRefresh = false): Promise<GenreItem[]> => {
  if (!forceRefresh && cachedGenres) {
    return cachedGenres;
  }

  if (!forceRefresh && pendingGenresRequest) {
    return pendingGenresRequest;
  }

  pendingGenresRequest = api
    .get<GenreItem[]>("/api/public/genres")
    .then(({ data }) => {
      cachedGenres = Array.isArray(data) ? data : [];
      return cachedGenres;
    })
    .finally(() => {
      pendingGenresRequest = null;
    });

  return pendingGenresRequest;
};
