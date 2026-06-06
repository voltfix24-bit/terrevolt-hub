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
      departments: {
        Row: {
          accent: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
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
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      finance_clients: {
        Row: {
          accent: string
          archived: boolean
          betaaltermijn: string
          btw_verlegd: string
          created_at: string
          factuur_email: string
          factuur_referenties: string
          factuuradres: string
          g_rekening: string
          id: string
          inkooporder_info: string
          interne_opmerkingen: string
          name: string
          related_ids: string[]
          short_description: string
          slug: string
          sort_order: number
          updated_at: string
          veelgemaakte_fouten: string
          verplichte_bijlagen: string
          voorbeeld_factuurtekst: string
        }
        Insert: {
          accent?: string
          archived?: boolean
          betaaltermijn?: string
          btw_verlegd?: string
          created_at?: string
          factuur_email?: string
          factuur_referenties?: string
          factuuradres?: string
          g_rekening?: string
          id?: string
          inkooporder_info?: string
          interne_opmerkingen?: string
          name: string
          related_ids?: string[]
          short_description?: string
          slug: string
          sort_order?: number
          updated_at?: string
          veelgemaakte_fouten?: string
          verplichte_bijlagen?: string
          voorbeeld_factuurtekst?: string
        }
        Update: {
          accent?: string
          archived?: boolean
          betaaltermijn?: string
          btw_verlegd?: string
          created_at?: string
          factuur_email?: string
          factuur_referenties?: string
          factuuradres?: string
          g_rekening?: string
          id?: string
          inkooporder_info?: string
          interne_opmerkingen?: string
          name?: string
          related_ids?: string[]
          short_description?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          veelgemaakte_fouten?: string
          verplichte_bijlagen?: string
          voorbeeld_factuurtekst?: string
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
          extracted_at: string | null
          extracted_file_size: number
          extracted_page_count: number
          extracted_text: string
          extraction_error: string
          extraction_status: string
          file_name: string
          file_path: string
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
          extracted_at?: string | null
          extracted_file_size?: number
          extracted_page_count?: number
          extracted_text?: string
          extraction_error?: string
          extraction_status?: string
          file_name?: string
          file_path?: string
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
          extracted_at?: string | null
          extracted_file_size?: number
          extracted_page_count?: number
          extracted_text?: string
          extraction_error?: string
          extraction_status?: string
          file_name?: string
          file_path?: string
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
      kb_chunks: {
        Row: {
          chunk_index: number
          content: string
          embedding: string | null
          id: string
          indexed_at: string
          metadata: Json
          source_id: string
          source_type: Database["public"]["Enums"]["kb_chunk_source"]
          source_updated_at: string | null
          title: string
          visibility: Database["public"]["Enums"]["kb_chunk_visibility"]
        }
        Insert: {
          chunk_index?: number
          content: string
          embedding?: string | null
          id?: string
          indexed_at?: string
          metadata?: Json
          source_id: string
          source_type: Database["public"]["Enums"]["kb_chunk_source"]
          source_updated_at?: string | null
          title: string
          visibility?: Database["public"]["Enums"]["kb_chunk_visibility"]
        }
        Update: {
          chunk_index?: number
          content?: string
          embedding?: string | null
          id?: string
          indexed_at?: string
          metadata?: Json
          source_id?: string
          source_type?: Database["public"]["Enums"]["kb_chunk_source"]
          source_updated_at?: string | null
          title?: string
          visibility?: Database["public"]["Enums"]["kb_chunk_visibility"]
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
      partner_links: {
        Row: {
          accent: string
          active: boolean
          category: string
          created_at: string
          description: string
          href: string
          icon: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          accent?: string
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          href?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accent?: string
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          href?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          archived: boolean
          bei_authorization: string
          certifications: string[]
          created_at: string
          department: string
          email: string
          employment_type: string
          equipment: string
          full_name: string
          hidden_fields: string[]
          id: string
          job_title: string
          location: string
          notes: string
          person_type: Database["public"]["Enums"]["person_type"]
          phone: string
          photo_url: string
          projects: string[]
          sort_order: number
          status: Database["public"]["Enums"]["person_status"]
          updated_at: string
          vehicle: string
        }
        Insert: {
          archived?: boolean
          bei_authorization?: string
          certifications?: string[]
          created_at?: string
          department?: string
          email?: string
          employment_type?: string
          equipment?: string
          full_name: string
          hidden_fields?: string[]
          id?: string
          job_title?: string
          location?: string
          notes?: string
          person_type?: Database["public"]["Enums"]["person_type"]
          phone?: string
          photo_url?: string
          projects?: string[]
          sort_order?: number
          status?: Database["public"]["Enums"]["person_status"]
          updated_at?: string
          vehicle?: string
        }
        Update: {
          archived?: boolean
          bei_authorization?: string
          certifications?: string[]
          created_at?: string
          department?: string
          email?: string
          employment_type?: string
          equipment?: string
          full_name?: string
          hidden_fields?: string[]
          id?: string
          job_title?: string
          location?: string
          notes?: string
          person_type?: Database["public"]["Enums"]["person_type"]
          phone?: string
          photo_url?: string
          projects?: string[]
          sort_order?: number
          status?: Database["public"]["Enums"]["person_status"]
          updated_at?: string
          vehicle?: string
        }
        Relationships: []
      }
      people_sensitive: {
        Row: {
          created_at: string
          emergency_contact: string
          notes_admin: string
          person_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          emergency_contact?: string
          notes_admin?: string
          person_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          emergency_contact?: string
          notes_admin?: string
          person_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_sensitive_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_links: {
        Row: {
          active: boolean
          created_at: string
          href: string
          icon: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          href?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          href?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      reindex_queue: {
        Row: {
          attempts: number
          enqueued_at: string
          id: string
          last_attempt_at: string | null
          last_error: string
          operation: string
          source_id: string
          source_type: Database["public"]["Enums"]["kb_chunk_source"]
        }
        Insert: {
          attempts?: number
          enqueued_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string
          operation: string
          source_id: string
          source_type: Database["public"]["Enums"]["kb_chunk_source"]
        }
        Update: {
          attempts?: number
          enqueued_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string
          operation?: string
          source_id?: string
          source_type?: Database["public"]["Enums"]["kb_chunk_source"]
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
      user_roles: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vraagbaak_feedback: {
        Row: {
          created_at: string
          feedback_type: Database["public"]["Enums"]["vraagbaak_feedback_type"]
          given_by: string
          id: string
          note: string
          question_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feedback_type: Database["public"]["Enums"]["vraagbaak_feedback_type"]
          given_by?: string
          id?: string
          note?: string
          question_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feedback_type?: Database["public"]["Enums"]["vraagbaak_feedback_type"]
          given_by?: string
          id?: string
          note?: string
          question_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vraagbaak_feedback_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "vraagbaak_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      vraagbaak_questions: {
        Row: {
          asked_by: string
          created_at: string
          expires_at: string
          follow_ups: Json
          has_sources: boolean
          hit_count: number
          id: string
          invalidated_at: string | null
          last_hit_at: string | null
          min_visibility: Database["public"]["Enums"]["kb_chunk_visibility"]
          question: string
          question_embedding: string | null
          related_ids: string[]
          short_answer: string
          source_chunk_ids: string[]
          steps: Json
          summary: string
          updated_at: string
        }
        Insert: {
          asked_by?: string
          created_at?: string
          expires_at?: string
          follow_ups?: Json
          has_sources?: boolean
          hit_count?: number
          id?: string
          invalidated_at?: string | null
          last_hit_at?: string | null
          min_visibility?: Database["public"]["Enums"]["kb_chunk_visibility"]
          question: string
          question_embedding?: string | null
          related_ids?: string[]
          short_answer?: string
          source_chunk_ids?: string[]
          steps?: Json
          summary?: string
          updated_at?: string
        }
        Update: {
          asked_by?: string
          created_at?: string
          expires_at?: string
          follow_ups?: Json
          has_sources?: boolean
          hit_count?: number
          id?: string
          invalidated_at?: string | null
          last_hit_at?: string | null
          min_visibility?: Database["public"]["Enums"]["kb_chunk_visibility"]
          question?: string
          question_embedding?: string | null
          related_ids?: string[]
          short_answer?: string
          source_chunk_ids?: string[]
          steps?: Json
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      vraagbaak_saved: {
        Row: {
          created_at: string
          id: string
          label: string
          question_id: string
          saved_by: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          question_id: string
          saved_by?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          question_id?: string
          saved_by?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vraagbaak_saved_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "vraagbaak_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      vraagbaak_sources: {
        Row: {
          article_id: string | null
          created_at: string
          external_url: string
          file_url: string
          id: string
          last_updated: string | null
          page_number: number | null
          question_id: string
          section_heading: string
          sort_order: number
          source_type: Database["public"]["Enums"]["kb_chunk_source"]
          title: string
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          external_url?: string
          file_url?: string
          id?: string
          last_updated?: string | null
          page_number?: number | null
          question_id: string
          section_heading?: string
          sort_order?: number
          source_type?: Database["public"]["Enums"]["kb_chunk_source"]
          title?: string
        }
        Update: {
          article_id?: string | null
          created_at?: string
          external_url?: string
          file_url?: string
          id?: string
          last_updated?: string | null
          page_number?: number | null
          question_id?: string
          section_heading?: string
          sort_order?: number
          source_type?: Database["public"]["Enums"]["kb_chunk_source"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "vraagbaak_sources_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "vraagbaak_questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_kb_chunks: {
        Args: never
        Returns: {
          last_indexed: string
          total: number
        }[]
      }
      find_cached_answer: {
        Args: { query_embedding: string; threshold?: number }
        Returns: {
          age_days: number
          follow_ups: Json
          has_sources: boolean
          id: string
          question: string
          short_answer: string
          similarity: number
          source_chunk_ids: string[]
          steps: Json
          summary: string
        }[]
      }
      get_kb_chunks_by_ids: {
        Args: { chunk_ids: string[] }
        Returns: {
          id: string
          metadata: Json
          source_id: string
          source_type: Database["public"]["Enums"]["kb_chunk_source"]
          title: string
          visibility: Database["public"]["Enums"]["kb_chunk_visibility"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      match_kb_chunks: {
        Args: {
          match_count?: number
          query_embedding: string
          source_filter?: Database["public"]["Enums"]["kb_chunk_source"][]
        }
        Returns: {
          chunk_index: number
          content: string
          id: string
          metadata: Json
          similarity: number
          source_id: string
          source_type: Database["public"]["Enums"]["kb_chunk_source"]
          title: string
          visibility: Database["public"]["Enums"]["kb_chunk_visibility"]
        }[]
      }
      pdf_extraction_stats: {
        Args: never
        Returns: {
          avg_chars: number
          extracted_ok: number
          failed: number
          pending: number
          scanned: number
          too_large: number
          total_pages: number
          total_with_pdf: number
        }[]
      }
      register_cache_hit: { Args: { question_id: string }; Returns: undefined }
      reindex_queue_failed_items: {
        Args: never
        Returns: {
          attempts: number
          enqueued_at: string
          id: string
          last_attempt_at: string
          last_error: string
          operation: string
          source_id: string
          source_type: Database["public"]["Enums"]["kb_chunk_source"]
        }[]
      }
      reindex_queue_retry: { Args: { item_id: string }; Returns: undefined }
      reindex_queue_retry_all: { Args: never; Returns: number }
      reindex_queue_stats: {
        Args: never
        Returns: {
          failed: number
          oldest_age_seconds: number
          pending: number
        }[]
      }
      reindex_sweep: {
        Args: never
        Returns: {
          enqueued_deletes: number
          enqueued_upserts: number
          retried: number
        }[]
      }
      search_kb_chunks: {
        Args: { match_count?: number; query_text: string }
        Returns: {
          chunk_index: number
          content: string
          id: string
          metadata: Json
          rank: number
          source_id: string
          source_type: Database["public"]["Enums"]["kb_chunk_source"]
          title: string
          visibility: Database["public"]["Enums"]["kb_chunk_visibility"]
        }[]
      }
      vraagbaak_cache_stats: {
        Args: never
        Returns: {
          active_cached: number
          expired: number
          invalidated: number
          most_asked: string
          most_asked_hits: number
          total_cached: number
          total_hits: number
        }[]
      }
      vraagbaak_clear_cache: { Args: never; Returns: number }
    }
    Enums: {
      app_category:
        | "Operationeel"
        | "Administratie"
        | "Rapportage"
        | "Externe systemen"
        | "Overig"
      app_role: "admin" | "management" | "kantoor" | "monteur" | "zzper"
      kb_chunk_source:
        | "kb_article"
        | "news"
        | "finance_client"
        | "person"
        | "application"
        | "sharepoint_item"
        | "partner_link"
        | "quick_link"
        | "department"
      kb_chunk_visibility: "all" | "staff" | "admin"
      kb_status: "active" | "draft" | "expired" | "archived"
      person_status:
        | "Beschikbaar"
        | "Bezet"
        | "Op project"
        | "Afwezig"
        | "Verlof"
        | "Niet actief"
      person_type:
        | "Medewerker"
        | "ZZP'er"
        | "Monteur"
        | "Werkvoorbereider"
        | "Projectleider"
        | "Administratie"
        | "Directie"
        | "Magazijn"
        | "Externe partner"
      sharepoint_kind: "link" | "folder"
      vraagbaak_feedback_type:
        | "correct"
        | "unclear"
        | "missing_source"
        | "outdated"
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
      app_role: ["admin", "management", "kantoor", "monteur", "zzper"],
      kb_chunk_source: [
        "kb_article",
        "news",
        "finance_client",
        "person",
        "application",
        "sharepoint_item",
        "partner_link",
        "quick_link",
        "department",
      ],
      kb_chunk_visibility: ["all", "staff", "admin"],
      kb_status: ["active", "draft", "expired", "archived"],
      person_status: [
        "Beschikbaar",
        "Bezet",
        "Op project",
        "Afwezig",
        "Verlof",
        "Niet actief",
      ],
      person_type: [
        "Medewerker",
        "ZZP'er",
        "Monteur",
        "Werkvoorbereider",
        "Projectleider",
        "Administratie",
        "Directie",
        "Magazijn",
        "Externe partner",
      ],
      sharepoint_kind: ["link", "folder"],
      vraagbaak_feedback_type: [
        "correct",
        "unclear",
        "missing_source",
        "outdated",
      ],
    },
  },
} as const
