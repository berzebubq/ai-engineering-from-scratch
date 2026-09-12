/**
 * Типы схемы Supabase.
 *
 * Пока написаны руками и должны совпадать с supabase-schema.sql. Когда схема
 * начнёт меняться часто, замените этот файл на автогенерацию:
 *
 *     npx supabase gen types typescript --project-id <ref> > types/database.ts
 *
 * До тех пор правило простое: поменяли SQL — поменяйте и здесь.
 */

export type ReelType = "my" | "competitor";
export type TagCategory = "character" | "vibe" | "structure" | "other";
export type TagSource = "manual" | "vision" | "whisper" | "llm";

export interface Database {
  public: {
    Tables: {
      reels: {
        Row: {
          id: string;
          url: string;
          thumbnail_url: string | null;
          caption: string | null;
          reach: number;
          plays: number;
          likes: number;
          saved: number;
          comments: number;
          shares: number;
          type: ReelType;
          /** Generated column — база считает сама, вставлять нельзя. */
          engagement_rate: number | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          /** ID медиа в Graph API. NULL у записей, заведённых вручную. */
          instagram_id: string | null;
          /** Когда метрики обновлялись из Graph API. NULL — не синхронизировалось. */
          synced_at: string | null;
        };
        Insert: {
          id?: string;
          url: string;
          thumbnail_url?: string | null;
          caption?: string | null;
          reach?: number;
          plays?: number;
          likes?: number;
          saved?: number;
          comments?: number;
          shares?: number;
          type?: ReelType;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          instagram_id?: string | null;
          synced_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["reels"]["Insert"]>;
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          category: TagCategory;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: TagCategory;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Insert"]>;
        Relationships: [];
      };
      reel_tags: {
        Row: {
          id: string;
          reel_id: string;
          tag_id: string;
          source: TagSource;
          confidence: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reel_id: string;
          tag_id: string;
          source?: TagSource;
          confidence?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reel_tags"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "reel_tags_reel_id_fkey";
            columns: ["reel_id"];
            referencedRelation: "reels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reel_tags_tag_id_fkey";
            columns: ["tag_id"];
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      reel_type: ReelType;
      tag_category: TagCategory;
      tag_source: TagSource;
    };
    CompositeTypes: Record<never, never>;
  };
}

/** Удобные псевдонимы, чтобы не писать длинный путь по типу Database. */
export type Reel = Database["public"]["Tables"]["reels"]["Row"];
export type ReelInsert = Database["public"]["Tables"]["reels"]["Insert"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type ReelTag = Database["public"]["Tables"]["reel_tags"]["Row"];

/** Видео вместе с присвоенными тегами — то, что рисует страница /reels/[id]. */
export type ReelWithTags = Reel & {
  tags: Array<Tag & { source: TagSource; confidence: number | null }>;
};
