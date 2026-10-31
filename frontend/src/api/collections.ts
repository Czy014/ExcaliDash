import type { Collection } from "../types";
import { api } from "./client";

export const getCollections = async () => {
  const response = await api.get<Collection[]>("/collections");
  return response.data;
};

export const createCollection = async (name: string) => {
  const response = await api.post<Collection>("/collections", { name });
  return response.data;
};

export const updateCollection = async (id: string, name: string) => {
  const response = await api.put<{ success: true }>(`/collections/${id}`, {
    name,
  });
  return response.data;
};

export const deleteCollection = async (id: string) => {
  const response = await api.delete<{ success: true }>(`/collections/${id}`);
  return response.data;
};

type LibraryItem = Record<string, unknown>;

export const getLibrary = async (): Promise<LibraryItem[]> => {
  const response = await api.get<{ items: LibraryItem[] }>("/library");
  return response.data.items;
};

export const updateLibrary = async (
  items: LibraryItem[],
): Promise<LibraryItem[]> => {
  const response = await api.put<{ items: LibraryItem[] }>("/library", {
    items,
  });
  return response.data.items;
};
