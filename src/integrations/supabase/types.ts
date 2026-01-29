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
      audit_logs: {
        Row: {
          action: string | null
          actor_id: string | null
          created_at: string | null
          id: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action?: string | null
          actor_id?: string | null
          created_at?: string | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string | null
          actor_id?: string | null
          created_at?: string | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      brand_models: {
        Row: {
          brand_id: string | null
          created_at: string | null
          id: string
          model_id: string | null
          status: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          model_id?: string | null
          status?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          model_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_models_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      captures: {
        Row: {
          asset_url: string
          created_at: string | null
          id: string
          model_id: string | null
          status: string | null
        }
        Insert: {
          asset_url: string
          created_at?: string | null
          id?: string
          model_id?: string | null
          status?: string | null
        }
        Update: {
          asset_url?: string
          created_at?: string | null
          id?: string
          model_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "captures_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          brand_name: string | null
          created_at: string | null
          id: string
          license_id: string | null
          signed: boolean | null
        }
        Insert: {
          brand_name?: string | null
          created_at?: string | null
          id?: string
          license_id?: string | null
          signed?: boolean | null
        }
        Update: {
          brand_name?: string | null
          created_at?: string | null
          id?: string
          license_id?: string | null
          signed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_transacoes: {
        Row: {
          contract_id: string | null
          created_at: string | null
          id: string
          tipo: string | null
          valor: number
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          id?: string
          tipo?: string | null
          valor: number
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          id?: string
          tipo?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_transacoes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          model_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          model_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          model_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          brand_id: string | null
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          title: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          title: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          created_at: string | null
          id: string
          model_id: string | null
          usage_type: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          model_id?: string | null
          usage_type?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          model_id?: string | null
          usage_type?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          city: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      previews: {
        Row: {
          approved: boolean | null
          capture_id: string | null
          created_at: string | null
          id: string
          preview_url: string
        }
        Insert: {
          approved?: boolean | null
          capture_id?: string | null
          created_at?: string | null
          id?: string
          preview_url: string
        }
        Update: {
          approved?: boolean | null
          capture_id?: string | null
          created_at?: string | null
          id?: string
          preview_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "previews_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string | null
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          role: string
        }
        Update: {
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
