export interface Project {
    id: number;
    title: string;
    description: string;
    category_id?: number;
    category?: string;
    image_url?: string;
    status: string;
    created_at: string;
  }