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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaign_enrollments: {
        Row: {
          campaign_id: string
          completed_at: string | null
          created_at: string
          current_message_index: number
          id: string
          is_completed: boolean | null
          is_paused: boolean | null
          last_response_at: string | null
          last_sent_at: string | null
          lead_id: string
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          created_at?: string
          current_message_index?: number
          id?: string
          is_completed?: boolean | null
          is_paused?: boolean | null
          last_response_at?: string | null
          last_sent_at?: string | null
          lead_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          current_message_index?: number
          id?: string
          is_completed?: boolean | null
          is_paused?: boolean | null
          last_response_at?: string | null
          last_sent_at?: string | null
          lead_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_enrollments_tag_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "tag_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_message_count: number
          assigned_to: string | null
          channel: string
          created_at: string
          handoff_triggered_at: string | null
          id: string
          last_message_at: string
          lead_id: string
          requires_human_handoff: boolean
          status: string
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_message_count?: number
          assigned_to?: string | null
          channel?: string
          created_at?: string
          handoff_triggered_at?: string | null
          id?: string
          last_message_at?: string
          lead_id: string
          requires_human_handoff?: boolean
          status?: string
          unread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_message_count?: number
          assigned_to?: string | null
          channel?: string
          created_at?: string
          handoff_triggered_at?: string | null
          id?: string
          last_message_at?: string
          lead_id?: string
          requires_human_handoff?: boolean
          status?: string
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversations_assigned_to"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          lead_source: string | null
          notes: string | null
          owner_id: string | null
          phone: string
          pipeline_stage_id: string
          state: string | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          lead_source?: string | null
          notes?: string | null
          owner_id?: string | null
          phone: string
          pipeline_stage_id: string
          state?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          lead_source?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string
          pipeline_stage_id?: string
          state?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          template: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          template: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          template?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          is_ai_generated: boolean | null
          is_read: boolean
          recipient: string
          sender: string
          status: string
          twilio_sid: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          is_ai_generated?: boolean | null
          is_read?: boolean
          recipient?: string
          sender?: string
          status?: string
          twilio_sid?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          is_ai_generated?: boolean | null
          is_read?: boolean
          recipient?: string
          sender?: string
          status?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          order_position: number
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          order_position: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          order_position?: number
        }
        Relationships: []
      }
      tag_campaign_messages: {
        Row: {
          campaign_id: string
          created_at: string
          day_number: number
          id: string
          message_template: string
          sequence_order: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          day_number: number
          id?: string
          message_template: string
          sequence_order: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          day_number?: number
          id?: string
          message_template?: string
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "tag_campaign_messages_tag_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "tag_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_campaigns: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          tag: string
          target_pipeline_stage_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          tag: string
          target_pipeline_stage_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          tag?: string
          target_pipeline_stage_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_target_pipeline_stage_id_fkey"
            columns: ["target_pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone_number: string | null
          receive_sms_notifications: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone_number?: string | null
          receive_sms_notifications?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone_number?: string | null
          receive_sms_notifications?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
