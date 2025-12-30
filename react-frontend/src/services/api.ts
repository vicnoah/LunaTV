// A placeholder for the actual API base URL, which might be configured differently in production.
const API_BASE_URL = '/api';

/**
 * A simplified fetch wrapper.
 */
const apiFetch = async <T>(endpoint: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  return response.json();
};

// --- API Service Functions ---

export interface Wallpaper {
  url: string;
  title: string;
  copyright: string;
}

/**
 * Fetches a random wallpaper from the backend.
 */
export const getWallpaper = () => {
  return apiFetch<Wallpaper>('/bing-wallpaper');
};
