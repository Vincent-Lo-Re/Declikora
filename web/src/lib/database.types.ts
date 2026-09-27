export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          section: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position: number
          section: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          section?: string
        }
        Relationships: []
      }
      content_categories: {
        Row: {
          category_id: string
          content_id: string
        }
        Insert: {
          category_id: string
          content_id: string
        }
        Update: {
          category_id?: string
          content_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_categories_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          access_level_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          draft: NonNullable<Json>
          draft_media_ids: string[]
          draft_rev: number
          draft_saved_at: string
          draft_saved_by: string | null
          draft_template_ids: string[]
          first_published_at: string | null
          id: string
          in_app: boolean
          is_free: boolean
          kind: string
          live_version_id: string | null
          parent_id: string | null
          position: number | null
          schedule_error: string | null
          scheduled_at: string | null
          scheduled_by: string | null
          scheduled_rev: number | null
          scheduled_set_at: string | null
          slug: string | null
          template_sort: string | null
          title: string | null
          trash_batch: string | null
        }
        Insert: {
          access_level_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          draft: NonNullable<Json>
          draft_media_ids?: string[]
          draft_rev?: number
          draft_saved_at?: string
          draft_saved_by?: string | null
          draft_template_ids?: string[]
          first_published_at?: string | null
          id?: string
          in_app?: boolean
          is_free?: boolean
          kind: string
          live_version_id?: string | null
          parent_id?: string | null
          position?: number | null
          schedule_error?: string | null
          scheduled_at?: string | null
          scheduled_by?: string | null
          scheduled_rev?: number | null
          scheduled_set_at?: string | null
          slug?: string | null
          template_sort?: string | null
          title?: never
          trash_batch?: string | null
        }
        Update: {
          access_level_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          draft?: NonNullable<Json>
          draft_media_ids?: string[]
          draft_rev?: number
          draft_saved_at?: string
          draft_saved_by?: string | null
          draft_template_ids?: string[]
          first_published_at?: string | null
          id?: string
          in_app?: boolean
          is_free?: boolean
          kind?: string
          live_version_id?: string | null
          parent_id?: string | null
          position?: number | null
          schedule_error?: string | null
          scheduled_at?: string | null
          scheduled_by?: string | null
          scheduled_rev?: number | null
          scheduled_set_at?: string | null
          slug?: string | null
          template_sort?: string | null
          title?: never
          trash_batch?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_draft_saved_by_fkey"
            columns: ["draft_saved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_scheduled_by_fkey"
            columns: ["scheduled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      edit_locks: {
        Row: {
          content_id: string
          draft_rev: number
          heartbeat_at: string
          holder_id: string | null
          holder_session: string | null
          taken_at: string | null
        }
        Insert: {
          content_id: string
          draft_rev?: number
          heartbeat_at?: string
          holder_id?: string | null
          holder_session?: string | null
          taken_at?: string | null
        }
        Update: {
          content_id?: string
          draft_rev?: number
          heartbeat_at?: string
          holder_id?: string | null
          holder_session?: string | null
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edit_locks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_locks_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt: string | null
          check_attempts: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          duration_s: number | null
          height: number | null
          id: string
          is_public: boolean
          kind: string
          mime: string
          name: string
          path: string
          purge_error: string | null
          purge_requested_at: string | null
          reject_reason: string | null
          size_bytes: number
          status: string
          status_changed_at: string
          sync_error: string | null
          sync_failed_at: string | null
          transcript: string | null
          width: number | null
        }
        Insert: {
          alt?: string | null
          check_attempts?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_s?: number | null
          height?: number | null
          id?: string
          is_public?: boolean
          kind: string
          mime: string
          name: string
          path: string
          purge_error?: string | null
          purge_requested_at?: string | null
          reject_reason?: string | null
          size_bytes: number
          status?: string
          status_changed_at?: string
          sync_error?: string | null
          sync_failed_at?: string | null
          transcript?: string | null
          width?: number | null
        }
        Update: {
          alt?: string | null
          check_attempts?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_s?: number | null
          height?: number | null
          id?: string
          is_public?: boolean
          kind?: string
          mime?: string
          name?: string
          path?: string
          purge_error?: string | null
          purge_requested_at?: string | null
          reject_reason?: string | null
          size_bytes?: number
          status?: string
          status_changed_at?: string
          sync_error?: string | null
          sync_failed_at?: string | null
          transcript?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_audit: {
        Row: {
          checked_at: string
          id: number
          orphan_paths: string[]
        }
        Insert: {
          checked_at?: string
          id?: never
          orphan_paths?: string[]
        }
        Update: {
          checked_at?: string
          id?: never
          orphan_paths?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["team_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["team_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      trash_items: {
        Row: {
          deleted_at: string | null
          deleted_by: string | null
          deleted_by_name: string | null
          id: string | null
          item_type: string | null
          kind: string | null
          parent_title: string | null
          purge_at: string | null
          purge_error: string | null
          title: string | null
          trash_batch: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      content_create: {
        Args: {
          from_template_id?: string
          kind: string
          parent_id?: string
          template_sort?: string
          title?: string
        }
        Returns: {
          access_level_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          draft: NonNullable<Json>
          draft_media_ids: string[]
          draft_rev: number
          draft_saved_at: string
          draft_saved_by: string | null
          draft_template_ids: string[]
          first_published_at: string | null
          id: string
          in_app: boolean
          is_free: boolean
          kind: string
          live_version_id: string | null
          parent_id: string | null
          position: number | null
          schedule_error: string | null
          scheduled_at: string | null
          scheduled_by: string | null
          scheduled_rev: number | null
          scheduled_set_at: string | null
          slug: string | null
          template_sort: string | null
          title: string | null
          trash_batch: string | null
        }
        SetofOptions: {
          from: "*"
          to: "contents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      empty_trash: { Args: { items?: Json }; Returns: number }
      end_member_sessions: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      files_audit: { Args: Record<PropertyKey, never>; Returns: number }
      files_claim_run: { Args: { run_mode: string }; Returns: boolean }
      files_mark_check_failed: {
        Args: { error: string; media_id: string }
        Returns: string
      }
      files_mark_checked: {
        Args: { accepted: boolean; media_id: string; reason?: string }
        Returns: string
      }
      files_mark_erased: { Args: { media_id: string }; Returns: boolean }
      files_mark_failed: {
        Args: { error: string; media_id: string }
        Returns: undefined
      }
      files_mark_moved: {
        Args: { is_public: boolean; media_id: string }
        Returns: boolean
      }
      files_orphans: {
        Args: Record<PropertyKey, never>
        Returns: {
          bucket_id: string
          name: string
        }[]
      }
      files_worklist: {
        Args: { max_items?: number }
        Returns: {
          action: string
          is_public: boolean
          kind: string
          media_id: string
          mime: string
          path: string
          size_bytes: number
          to_public: boolean
        }[]
      }
      has_other_active_admin: {
        Args: { excluded_user_id: string }
        Returns: boolean
      }
      initial_role: {
        Args: { app_metadata: Json }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean }
      lock_heartbeat: {
        Args: { content_id: string; editor_session?: string }
        Returns: boolean
      }
      lock_release: {
        Args: { content_id: string; editor_session?: string }
        Returns: boolean
      }
      lock_status: {
        Args: { content_id: string; editor_session?: string }
        Returns: {
          draft_rev: number
          heartbeat_at: string
          holder_id: string
          holder_name: string
          is_active: boolean
          mine: boolean
          taken_at: string
        }[]
      }
      lock_take: {
        Args: { content_id: string; editor_session?: string; force?: boolean }
        Returns: {
          draft_rev: number
          heartbeat_at: string
          holder_id: string
          holder_name: string
          is_active: boolean
          mine: boolean
          taken_at: string
        }[]
      }
      media_confirm: {
        Args: { media_id: string }
        Returns: {
          alt: string | null
          check_attempts: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          duration_s: number | null
          height: number | null
          id: string
          is_public: boolean
          kind: string
          mime: string
          name: string
          path: string
          purge_error: string | null
          purge_requested_at: string | null
          reject_reason: string | null
          size_bytes: number
          status: string
          status_changed_at: string
          sync_error: string | null
          sync_failed_at: string | null
          transcript: string | null
          width: number | null
        }
        SetofOptions: {
          from: "*"
          to: "media"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      media_create: {
        Args: {
          duration_s?: number
          height?: number
          kind: string
          mime: string
          name: string
          size_bytes: number
          width?: number
        }
        Returns: {
          alt: string | null
          check_attempts: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          duration_s: number | null
          height: number | null
          id: string
          is_public: boolean
          kind: string
          mime: string
          name: string
          path: string
          purge_error: string | null
          purge_requested_at: string | null
          reject_reason: string | null
          size_bytes: number
          status: string
          status_changed_at: string
          sync_error: string | null
          sync_failed_at: string | null
          transcript: string | null
          width: number | null
        }
        SetofOptions: {
          from: "*"
          to: "media"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      media_restore: {
        Args: { media_id: string }
        Returns: {
          alt: string | null
          check_attempts: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          duration_s: number | null
          height: number | null
          id: string
          is_public: boolean
          kind: string
          mime: string
          name: string
          path: string
          purge_error: string | null
          purge_requested_at: string | null
          reject_reason: string | null
          size_bytes: number
          status: string
          status_changed_at: string
          sync_error: string | null
          sync_failed_at: string | null
          transcript: string | null
          width: number | null
        }
        SetofOptions: {
          from: "*"
          to: "media"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      media_storage_used: { Args: Record<PropertyKey, never>; Returns: number }
      media_trash: {
        Args: { media_id: string }
        Returns: {
          alt: string | null
          check_attempts: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          duration_s: number | null
          height: number | null
          id: string
          is_public: boolean
          kind: string
          mime: string
          name: string
          path: string
          purge_error: string | null
          purge_requested_at: string | null
          reject_reason: string | null
          size_bytes: number
          status: string
          status_changed_at: string
          sync_error: string | null
          sync_failed_at: string | null
          transcript: string | null
          width: number | null
        }
        SetofOptions: {
          from: "*"
          to: "media"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      media_uses: {
        Args: { media_id: string }
        Returns: {
          content_id: string
          in_app: boolean
          in_draft: boolean
          kind: string
          parent_title: string
          title: string
        }[]
      }
      ping: { Args: Record<PropertyKey, never>; Returns: boolean }
      save_draft: {
        Args: {
          base_rev: number
          content_id: string
          draft: Json
          editor_session?: string
          settings?: Json
        }
        Returns: {
          draft_rev: number
          draft_saved_at: string
        }[]
      }
      session_is_open: { Args: Record<PropertyKey, never>; Returns: boolean }
      team_members: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          full_name: string
          id: string
          invited_at: string
          last_sign_in_at: string
          mfa_enabled_at: string
          role: Database["public"]["Enums"]["team_role"]
        }[]
      }
    }
    Enums: {
      team_role: "admin" | "editor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      team_role: ["admin", "editor"],
    },
  },
} as const
