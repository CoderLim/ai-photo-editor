export type MediaType = 'image' | 'video';
export type InputMode = 'text-to-image' | 'reference-to-image' | 'image-editing' | 'text-to-video' | 'image-to-video' | 'video-to-video' | 'reference-to-video' | 'unknown';

export interface PromptMedia {
  type: MediaType;
  role: 'input' | 'output' | 'source-media';
  originalUrl: string;
  key?: string;
  thumbnailKey?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface PromptAuthor {
  name: string | null;
  sourceUrl?: string;
  rights?: { prompt: string; media: string; evidence?: unknown };
  publicationStatus?: 'cleared' | 'pending-review';
  modifications?: string;
}

export interface GalleryPrompt {
  id: string;
  mediaType: MediaType;
  slug: string;
  title: string;
  description: string | null;
  prompt: string;
  category: string;
  tags: string[];
  inputMode: InputMode;
  model: string | null;
  media: PromptMedia[];
  author: PromptAuthor | null;
  sourceUrl: string;
  featured: boolean;
  featuredRank: number | null;
  updatedAt: number;
}

export interface RawPrompt {
  id: string;
  media_type: MediaType;
  slug: string;
  title: string;
  description: string | null;
  prompt: string;
  category: string;
  tags: string;
  input_mode: InputMode;
  model: string | null;
  media: string;
  author: string | null;
  source_url: string;
  featured: number;
  featured_rank: number | null;
  updated_at: number;
}

export interface GalleryCard {
  id: string;
  title: string;
  imageUrl: string;
  width?: number;
  height?: number;
  author: string | null;
  sourceUrl: string | null;
  license: string | null;
  modifications: string | null;
}

export interface GalleryPage {
  items: GalleryCard[];
  nextOffset: number | null;
}
