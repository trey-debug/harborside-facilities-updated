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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      personal_tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          id: string
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_requests: {
        Row: {
          actual_hours: number | null
          approval_checklist: Json | null
          approved_at: string | null
          approved_by: string | null
          category: string
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string | null
          date_changed_reason: string | null
          department: string
          description: string
          estimated_hours: number | null
          id: string
          is_timer_active: boolean | null
          location: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_reason: string | null
          requested_date: string
          requestor_email: string
          requestor_name: string
          requestor_phone: string | null
          started_at: string | null
          started_by: string | null
          status: Database["public"]["Enums"]["work_status"] | null
          timer_paused_at: string | null
          timer_started_at: string | null
          title: string
          total_elapsed_seconds: number | null
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          actual_hours?: number | null
          approval_checklist?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          category: string
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          date_changed_reason?: string | null
          department: string
          description: string
          estimated_hours?: number | null
          id?: string
          is_timer_active?: boolean | null
          location: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          requested_date: string
          requestor_email: string
          requestor_name: string
          requestor_phone?: string | null
          started_at?: string | null
          started_by?: string | null
          status?: Database["public"]["Enums"]["work_status"] | null
          timer_paused_at?: string | null
          timer_started_at?: string | null
          title: string
          total_elapsed_seconds?: number | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          actual_hours?: number | null
          approval_checklist?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          date_changed_reason?: string | null
          department?: string
          description?: string
          estimated_hours?: number | null
          id?: string
          is_timer_active?: boolean | null
          location?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          requested_date?: string
          requestor_email?: string
          requestor_name?: string
          requestor_phone?: string | null
          started_at?: string | null
          started_by?: string | null
          status?: Database["public"]["Enums"]["work_status"] | null
          timer_paused_at?: string | null
          timer_started_at?: string | null
          title?: string
          total_elapsed_seconds?: number | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_work_requests_by_email: {
        Args: { _email: string }
        Returns: Database["public"]["Tables"]["work_requests"]["Row"][]
      }
      approve_work_request: {
        Args: { _approved_by_user: string; _request_id: string }
        Returns: string
      }
      complete_work: {
        Args: {
          actual_hours_worked?: number
          completed_by_user: string
          notes?: string
          started_id: string
        }
        Returns: string
      }
      generate_work_order_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      start_work: {
        Args: { approved_id: string; started_by_user: string }
        Returns: string
      }
      update_work_request_status:
        | {
            Args: {
              _hours?: number
              _new_requested_date?: string
              _notes?: string
              _reason?: string
              _request_id: string
              _status: Database["public"]["Enums"]["work_status"]
              _user_name?: string
            }
            Returns: string
          }
        | {
            Args: {
              _hours?: number
              _notes?: string
              _reason?: string
              _request_id: string
              _status: Database["public"]["Enums"]["work_status"]
              _user_name?: string
            }
            Returns: string
          }
    }
    Enums: {
      app_role: "admin" | "employee"
      priority_level: "low" | "medium" | "high" | "urgent"
      request_status:
        | "pending"
        | "approved"
        | "in_progress"
        | "completed"
        | "rejected"
      work_status:
        | "pending"
        | "approved"
        | "rejected"
        | "in_progress"
        | "completed"
        | "paused"
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
      app_role: ["admin", "employee"],
      priority_level: ["low", "medium", "high", "urgent"],
      request_status: [
        "pending",
        "approved",
        "in_progress",
        "completed",
        "rejected",
      ],
      work_status: [
        "pending",
        "approved",
        "rejected",
        "in_progress",
        "completed",
        "paused",
      ],
    },
  },
} as const
