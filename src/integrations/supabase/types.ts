export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          accent: string
          active: boolean
          category: Database["public"]["Enums"]["app_category"]
          created_at: string
          description: string
          featured: boolean
          icon: string
          id: string
          name: string
          new_tab: boolean
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          accent?: string
          active?: boolean
          category?: Database["public"]["Enums"]["app_category"]
          created_at?: string
          description?: string
          featured?: boolean
          icon?: string
          id?: string
          name: string
          new_tab?: boolean
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Update: {
          accent?: string
          active?: boolean
          category?: Database["public"]["Enums"]["app_category"]
          created_at?: string
          description?: string
          featured?: boolean
          icon?: string
          id?: string
          name?: string
          new_tab?: boolean
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      kb_articles: {
        Row: {
          attachments: Json
          author: string
          category_id: string | null
          client: string
          content: string
          created_at: string
          document_date: string | null
          document_type: string
          external_url: string
          file_name: string
          file_size: number
          file_url: string
          id: string
          important_notes: string
          owner: string
          related_ids: string[]
          section_id: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["kb_status"]
          summary: string
          tags: string[]
          title: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          version: string
        }
        Insert: {
          attachments?: Json
          author?: string
          category_id?: string | null
          client?: string
          content?: string
          created_at?: string
          document_date?: string | null
          document_type?: string
          external_url?: string
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          important_notes?: string
          owner?: string
          related_ids?: string[]
          section_id?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["kb_status"]
          summary?: string
          tags?: string[]
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          version?: string
        }
        Update: {
          attachments?: Json
          author?: string
          category_id?: string | null
          client?: string
          content?: string
          created_at?: string
          document_date?: string | null
          document_type?: string
          external_url?: string
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          important_notes?: string
          owner?: string
          related_ids?: string[]
          section_id?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["kb_status"]
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "kb_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      kb_sections: {
        Row: {
          accent: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          accent?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accent?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      kb_versions: {
        Row: {
          article_id: string
          author: string
          content: string
          created_at: string
          document_date: string | null
          external_url: string
          file_name: string
          file_url: string
          id: string
          note: string
          summary: string
          title: string
          version: string
        }
        Insert: {
          article_id: string
          author?: string
          content?: string
          created_at?: string
          document_date?: string | null
          external_url?: string
          file_name?: string
          file_url?: string
          id?: string
          note?: string
          summary?: string
          title: string
          version: string
        }
        Update: {
          article_id?: string
          author?: string
          content?: string
          created_at?: string
          document_date?: string | null
          external_url?: string
          file_name?: string
          file_url?: string
          id?: string
          note?: string
          summary?: string
          title?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          archived: boolean
          author: string
          category: string
          content: string
          cover_image: string
          created_at: string
          id: string
          important: boolean
          publish_date: string
          sort_order: number
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          author?: string
          category?: string
          content?: string
          cover_image?: string
          created_at?: string
          id?: string
          important?: boolean
          publish_date?: string
          sort_order?: number
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          author?: string
          category?: string
          content?: string
          cover_image?: string
          created_at?: string
          id?: string
          important?: boolean
          publish_date?: string
          sort_order?: number
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sharepoint_config: {
        Row: {
          base_url: string
          id: boolean
          updated_at: string
        }
        Insert: {
          base_url?: string
          id?: boolean
          updated_at?: string
        }
        Update: {
          base_url?: string
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      sharepoint_items: {
        Row: {
          created_at: string
          description: string
          favorite: boolean
          icon: string
          id: string
          kind: Database["public"]["Enums"]["sharepoint_kind"]
          last_opened_at: string | null
          name: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string
          favorite?: boolean
          icon?: string
          id?: string
          kind: Database["public"]["Enums"]["sharepoint_kind"]
          last_opened_at?: string | null
          name: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string
          favorite?: boolean
          icon?: string
          id?: string
          kind?: Database["public"]["Enums"]["sharepoint_kind"]
          last_opened_at?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_category:
        | "Operationeel"
        | "Administratie"
        | "Rapportage"
        | "Externe systemen"
        | "Overig"
      kb_status: "active" | "draft" | "expired" | "archived"
      sharepoint_kind: "link" | "folder"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_category: [
        "Operationeel",
        "Administratie",
        "Rapportage",
        "Externe systemen",
        "Overig",
      ],
      kb_status: ["active", "draft", "expired", "archived"],
      sharepoint_kind: ["link", "folder"],
    },
  },
} as const
