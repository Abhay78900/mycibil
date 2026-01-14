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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bureau_pricing: {
        Row: {
          bureau_code: string
          bureau_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          partner_price: number
          updated_at: string | null
          user_price: number
        }
        Insert: {
          bureau_code: string
          bureau_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          partner_price?: number
          updated_at?: string | null
          user_price?: number
        }
        Update: {
          bureau_code?: string
          bureau_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          partner_price?: number
          updated_at?: string | null
          user_price?: number
        }
        Relationships: []
      }
      credit_reports: {
        Row: {
          active_loans: Json | null
          ai_analysis: string | null
          amount_paid: number | null
          average_score: number | null
          cibil_score: number | null
          created_at: string | null
          credit_cards: Json | null
          crif_score: number | null
          date_of_birth: string | null
          enquiries: Json | null
          equifax_score: number | null
          experian_score: number | null
          full_name: string
          id: string
          improvement_tips: Json | null
          is_high_risk: boolean | null
          pan_number: string
          partner_id: string | null
          raw_cibil_data: Json | null
          raw_crif_data: Json | null
          raw_equifax_data: Json | null
          raw_experian_data: Json | null
          report_status: Database["public"]["Enums"]["report_status"] | null
          risk_flags: Json | null
          selected_bureaus: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_loans?: Json | null
          ai_analysis?: string | null
          amount_paid?: number | null
          average_score?: number | null
          cibil_score?: number | null
          created_at?: string | null
          credit_cards?: Json | null
          crif_score?: number | null
          date_of_birth?: string | null
          enquiries?: Json | null
          equifax_score?: number | null
          experian_score?: number | null
          full_name: string
          id?: string
          improvement_tips?: Json | null
          is_high_risk?: boolean | null
          pan_number: string
          partner_id?: string | null
          raw_cibil_data?: Json | null
          raw_crif_data?: Json | null
          raw_equifax_data?: Json | null
          raw_experian_data?: Json | null
          report_status?: Database["public"]["Enums"]["report_status"] | null
          risk_flags?: Json | null
          selected_bureaus?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_loans?: Json | null
          ai_analysis?: string | null
          amount_paid?: number | null
          average_score?: number | null
          cibil_score?: number | null
          created_at?: string | null
          credit_cards?: Json | null
          crif_score?: number | null
          date_of_birth?: string | null
          enquiries?: Json | null
          equifax_score?: number | null
          experian_score?: number | null
          full_name?: string
          id?: string
          improvement_tips?: Json | null
          is_high_risk?: boolean | null
          pan_number?: string
          partner_id?: string | null
          raw_cibil_data?: Json | null
          raw_crif_data?: Json | null
          raw_equifax_data?: Json | null
          raw_experian_data?: Json | null
          report_status?: Database["public"]["Enums"]["report_status"] | null
          risk_flags?: Json | null
          selected_bureaus?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_reports_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activity_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          lead_id: string
          new_status: Database["public"]["Enums"]["lead_status"] | null
          notes: string | null
          old_status: Database["public"]["Enums"]["lead_status"] | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          new_status?: Database["public"]["Enums"]["lead_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["lead_status"] | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          new_status?: Database["public"]["Enums"]["lead_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["lead_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activity_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "partner_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_leads: {
        Row: {
          admin_notes: string | null
          assigned_admin_id: string | null
          business_name: string | null
          city: string
          consent_given: boolean
          created_at: string
          current_occupation: string
          email: string
          finance_experience: boolean
          follow_up_date: string | null
          full_name: string
          id: string
          interested_services: Database["public"]["Enums"]["interested_services"]
          investment_capacity: Database["public"]["Enums"]["investment_capacity"]
          message: string | null
          mobile: string
          state: string
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_admin_id?: string | null
          business_name?: string | null
          city: string
          consent_given?: boolean
          created_at?: string
          current_occupation: string
          email: string
          finance_experience?: boolean
          follow_up_date?: string | null
          full_name: string
          id?: string
          interested_services: Database["public"]["Enums"]["interested_services"]
          investment_capacity: Database["public"]["Enums"]["investment_capacity"]
          message?: string | null
          mobile: string
          state: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_admin_id?: string | null
          business_name?: string | null
          city?: string
          consent_given?: boolean
          created_at?: string
          current_occupation?: string
          email?: string
          finance_experience?: boolean
          follow_up_date?: string | null
          full_name?: string
          id?: string
          interested_services?: Database["public"]["Enums"]["interested_services"]
          investment_capacity?: Database["public"]["Enums"]["investment_capacity"]
          message?: string | null
          mobile?: string
          state?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          franchise_id: string
          id: string
          name: string
          owner_id: string
          report_count: number | null
          status: string | null
          total_revenue: number | null
          updated_at: string | null
          wallet_balance: number | null
          wallet_mode: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          franchise_id: string
          id?: string
          name: string
          owner_id: string
          report_count?: number | null
          status?: string | null
          total_revenue?: number | null
          updated_at?: string | null
          wallet_balance?: number | null
          wallet_mode?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          franchise_id?: string
          id?: string
          name?: string
          owner_id?: string
          report_count?: number | null
          status?: string | null
          total_revenue?: number | null
          updated_at?: string | null
          wallet_balance?: number | null
          wallet_mode?: string | null
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          bureaus: string[]
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          bureaus: string[]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
        }
        Update: {
          bureaus?: string[]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          pan_number: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          pan_number?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          pan_number?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          partner_id: string | null
          payment_method: string | null
          payment_reference: string | null
          report_id: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          partner_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          report_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          partner_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          report_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "credit_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      app_role: "admin" | "partner" | "user"
      interested_services: "credit_score_check" | "loan" | "both"
      investment_capacity:
        | "below_50k"
        | "50k_to_1lakh"
        | "1lakh_to_5lakh"
        | "above_5lakh"
      lead_status:
        | "new"
        | "contacted"
        | "interested"
        | "follow_up_scheduled"
        | "converted"
        | "not_interested"
        | "rejected"
      report_status: "locked" | "unlocked" | "processing" | "failed"
      transaction_status: "pending" | "success" | "failed" | "refunded"
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
      app_role: ["admin", "partner", "user"],
      interested_services: ["credit_score_check", "loan", "both"],
      investment_capacity: [
        "below_50k",
        "50k_to_1lakh",
        "1lakh_to_5lakh",
        "above_5lakh",
      ],
      lead_status: [
        "new",
        "contacted",
        "interested",
        "follow_up_scheduled",
        "converted",
        "not_interested",
        "rejected",
      ],
      report_status: ["locked", "unlocked", "processing", "failed"],
      transaction_status: ["pending", "success", "failed", "refunded"],
    },
  },
} as const
