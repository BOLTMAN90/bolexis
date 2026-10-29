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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          actor_id: string | null
          after_value: Json | null
          before_value: Json | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          record_id: string
          record_type: string
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          record_id: string
          record_type: string
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          record_id?: string
          record_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_jobs: {
        Row: {
          attempts: number
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          payload: Json
          run_after: string
          run_id: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
          workflow_id: string | null
          workspace_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          run_after?: string
          run_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          workflow_id?: string | null
          workspace_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          run_after?: string
          run_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          workflow_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_jobs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_jobs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          correlation_id: string
          created_at: string
          error_detail: string | null
          finished_at: string | null
          id: string
          idempotency_key: string
          metadata: Json
          retry_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["automation_run_status"]
          workflow_id: string
          workspace_id: string
        }
        Insert: {
          correlation_id?: string
          created_at?: string
          error_detail?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key: string
          metadata?: Json
          retry_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["automation_run_status"]
          workflow_id: string
          workspace_id: string
        }
        Update: {
          correlation_id?: string
          created_at?: string
          error_detail?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string
          metadata?: Json
          retry_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["automation_run_status"]
          workflow_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflows: {
        Row: {
          config: Json
          created_at: string
          description: string
          enabled: boolean
          id: string
          key: string
          name: string
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          key: string
          name: string
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          key?: string
          name?: string
          trigger_type?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_workflows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          archived_at: string | null
          consent_email: boolean
          consent_recorded_at: string | null
          consent_sms: boolean
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          notes: string
          phone: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          consent_email?: boolean
          consent_recorded_at?: string | null
          consent_sms?: boolean
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string
          phone?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          consent_email?: boolean
          consent_recorded_at?: string | null
          consent_sms?: boolean
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string
          phone?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          archived_at: string | null
          assigned_user_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          expected_close_date: string | null
          expected_value: number
          id: string
          lead_id: string
          lost_reason: string | null
          outcome: Database["public"]["Enums"]["deal_outcome"]
          probability: number
          property_id: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          assigned_user_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_close_date?: string | null
          expected_value?: number
          id?: string
          lead_id: string
          lost_reason?: string | null
          outcome?: Database["public"]["Enums"]["deal_outcome"]
          probability?: number
          property_id?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          assigned_user_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_close_date?: string | null
          expected_value?: number
          id?: string
          lead_id?: string
          lost_reason?: string | null
          outcome?: Database["public"]["Enums"]["deal_outcome"]
          probability?: number
          property_id?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          account_reference: string | null
          created_at: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          metadata: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_reference?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_reference?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          provider?: Database["public"]["Enums"]["integration_provider"]
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_secrets: {
        Row: {
          created_at: string
          id: string
          provider: Database["public"]["Enums"]["integration_provider"]
          secret_ciphertext: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider: Database["public"]["Enums"]["integration_provider"]
          secret_ciphertext: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
          secret_ciphertext?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_secrets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          archived_at: string | null
          assigned_user_id: string | null
          budget_amount: number | null
          budget_currency: string
          buying_timeline_days: number | null
          consent_recorded_at: string | null
          consent_to_contact: boolean
          contact_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          idempotency_key: string | null
          notes: string
          phone: string | null
          prefer_email: boolean
          prefer_phone: boolean
          prefer_sms: boolean
          preferred_location: string | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          qualification_score: number
          score_explanation: Json
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["pipeline_stage"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          assigned_user_id?: string | null
          budget_amount?: number | null
          budget_currency?: string
          buying_timeline_days?: number | null
          consent_recorded_at?: string | null
          consent_to_contact?: boolean
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          idempotency_key?: string | null
          notes?: string
          phone?: string | null
          prefer_email?: boolean
          prefer_phone?: boolean
          prefer_sms?: boolean
          preferred_location?: string | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          qualification_score?: number
          score_explanation?: Json
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["pipeline_stage"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          assigned_user_id?: string | null
          budget_amount?: number | null
          budget_currency?: string
          buying_timeline_days?: number | null
          consent_recorded_at?: string | null
          consent_to_contact?: boolean
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          idempotency_key?: string | null
          notes?: string
          phone?: string | null
          prefer_email?: boolean
          prefer_phone?: boolean
          prefer_sms?: boolean
          preferred_location?: string | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          qualification_score?: number
          score_explanation?: Json
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["pipeline_stage"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_drafts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          channel: string
          created_at: string
          created_by: string | null
          error_detail: string | null
          id: string
          lead_id: string | null
          provider_message_id: string | null
          source: string
          status: Database["public"]["Enums"]["message_status"]
          subject: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body: string
          channel?: string
          created_at?: string
          created_by?: string | null
          error_detail?: string | null
          id?: string
          lead_id?: string | null
          provider_message_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          error_detail?: string | null
          id?: string
          lead_id?: string | null
          provider_message_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_drafts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_drafts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_drafts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          dedupe_key: string | null
          delivery_status: string
          error_detail: string | null
          id: string
          provider_message_id: string | null
          read_at: string | null
          recipient_id: string
          title: string
          workspace_id: string
        }
        Insert: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          dedupe_key?: string | null
          delivery_status?: string
          error_detail?: string | null
          id?: string
          provider_message_id?: string | null
          read_at?: string | null
          recipient_id: string
          title: string
          workspace_id: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          dedupe_key?: string | null
          delivery_status?: string
          error_detail?: string | null
          id?: string
          provider_message_id?: string | null
          read_at?: string | null
          recipient_id?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          locale: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          locale?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          locale?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address_line: string
          archived_at: string | null
          area_unit: string
          area_value: number | null
          assigned_user_id: string | null
          availability: Database["public"]["Enums"]["availability_status"]
          bathrooms: number | null
          bedrooms: number | null
          category: Database["public"]["Enums"]["property_category"]
          city: string
          country: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          postal_code: string
          price_amount: number
          price_currency: string
          property_type: Database["public"]["Enums"]["property_type"]
          region: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          address_line?: string
          archived_at?: string | null
          area_unit?: string
          area_value?: number | null
          assigned_user_id?: string | null
          availability?: Database["public"]["Enums"]["availability_status"]
          bathrooms?: number | null
          bedrooms?: number | null
          category: Database["public"]["Enums"]["property_category"]
          city?: string
          country?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          postal_code?: string
          price_amount: number
          price_currency?: string
          property_type: Database["public"]["Enums"]["property_type"]
          region?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          address_line?: string
          archived_at?: string | null
          area_unit?: string
          area_value?: number | null
          assigned_user_id?: string | null
          availability?: Database["public"]["Enums"]["availability_status"]
          bathrooms?: number | null
          bedrooms?: number | null
          category?: Database["public"]["Enums"]["property_category"]
          city?: string
          country?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          listing_type?: Database["public"]["Enums"]["listing_type"]
          postal_code?: string
          price_amount?: number
          price_currency?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          region?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          property_id: string
          sort_order: number
          storage_path: string
          workspace_id: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          id?: string
          property_id: string
          sort_order?: number
          storage_path: string
          workspace_id: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          property_id?: string
          sort_order?: number
          storage_path?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_images_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_user_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string
          due_at: string | null
          id: string
          idempotency_key: string | null
          lead_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          property_id: string | null
          reminder_sent_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string
          due_at?: string | null
          id?: string
          idempotency_key?: string | null
          lead_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          property_id?: string | null
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string
          due_at?: string | null
          id?: string
          idempotency_key?: string | null
          lead_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          property_id?: string | null
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      viewings: {
        Row: {
          assigned_user_id: string | null
          created_at: string
          created_by: string | null
          ends_at: string
          google_event_id: string | null
          google_sync_status: string
          id: string
          lead_id: string
          notes: string
          property_id: string
          reminder_sent_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["viewing_status"]
          timezone: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at: string
          google_event_id?: string | null
          google_sync_status?: string
          id?: string
          lead_id: string
          notes?: string
          property_id: string
          reminder_sent_at?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["viewing_status"]
          timezone: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          google_event_id?: string | null
          google_sync_status?: string
          id?: string
          lead_id?: string
          notes?: string
          property_id?: string
          reminder_sent_at?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["viewing_status"]
          timezone?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewings_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          token_hash: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          token_hash: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          token_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          active: boolean
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          round_robin_order: number
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["workspace_role"]
          round_robin_order?: number
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          round_robin_order?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          assignment_member_id: string | null
          assignment_strategy: Database["public"]["Enums"]["assignment_strategy"]
          created_at: string
          created_by: string | null
          currency: string
          follow_up_due_hours: number
          id: string
          intake_key_hash: string | null
          last_round_robin_user_id: string | null
          name: string
          slug: string
          task_reminder_hours: number
          timezone: string
          updated_at: string
          viewing_reminder_hours: number
        }
        Insert: {
          assignment_member_id?: string | null
          assignment_strategy?: Database["public"]["Enums"]["assignment_strategy"]
          created_at?: string
          created_by?: string | null
          currency?: string
          follow_up_due_hours?: number
          id?: string
          intake_key_hash?: string | null
          last_round_robin_user_id?: string | null
          name: string
          slug: string
          task_reminder_hours?: number
          timezone?: string
          updated_at?: string
          viewing_reminder_hours?: number
        }
        Update: {
          assignment_member_id?: string | null
          assignment_strategy?: Database["public"]["Enums"]["assignment_strategy"]
          created_at?: string
          created_by?: string | null
          currency?: string
          follow_up_due_hours?: number
          id?: string
          intake_key_hash?: string | null
          last_round_robin_user_id?: string | null
          name?: string
          slug?: string
          task_reminder_hours?: number
          timezone?: string
          updated_at?: string
          viewing_reminder_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_assignment_member_fk"
            columns: ["assignment_member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_last_round_robin_user_id_fkey"
            columns: ["last_round_robin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_workspace: {
        Args: { workspace_name: string; workspace_slug: string }
        Returns: {
          assignment_member_id: string | null
          assignment_strategy: Database["public"]["Enums"]["assignment_strategy"]
          created_at: string
          created_by: string | null
          currency: string
          follow_up_due_hours: number
          id: string
          intake_key_hash: string | null
          last_round_robin_user_id: string | null
          name: string
          slug: string
          task_reminder_hours: number
          timezone: string
          updated_at: string
          viewing_reminder_hours: number
        }
        SetofOptions: {
          from: "*"
          to: "workspaces"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_workspace_role: {
        Args: {
          allowed: Database["public"]["Enums"]["workspace_role"][]
          target_workspace: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { target_workspace: string }
        Returns: boolean
      }
      shares_workspace: { Args: { other_user: string }; Returns: boolean }
    }
    Enums: {
      assignment_strategy: "manual" | "round_robin" | "specific_agent"
      automation_run_status:
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "skipped"
      automation_trigger:
        | "lead_created"
        | "task_due"
        | "viewing_upcoming"
        | "lead_unassigned"
        | "sequence_step"
      availability_status:
        | "available"
        | "under_offer"
        | "pending"
        | "leased"
        | "sold"
        | "off_market"
      contact_type:
        | "buyer"
        | "seller"
        | "tenant"
        | "landlord"
        | "investor"
        | "other"
      deal_outcome: "open" | "won" | "lost"
      integration_provider: "resend" | "n8n" | "openai" | "google_calendar"
      integration_status: "disconnected" | "connected" | "error"
      job_status: "pending" | "running" | "succeeded" | "failed" | "cancelled"
      lead_source:
        | "website"
        | "referral"
        | "portal"
        | "walk_in"
        | "phone"
        | "social"
        | "other"
      listing_type: "sale" | "rental"
      message_status: "draft" | "approved" | "sent" | "failed" | "not_sent"
      notification_channel: "in_app" | "email"
      pipeline_stage:
        | "new"
        | "contacted"
        | "qualified"
        | "viewing_scheduled"
        | "offer_submitted"
        | "won"
        | "lost"
      property_category: "residential" | "commercial"
      property_type:
        | "house"
        | "apartment"
        | "condo"
        | "townhouse"
        | "land"
        | "office"
        | "retail"
        | "industrial"
        | "mixed_use"
        | "other"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
      viewing_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      workspace_role: "owner" | "admin" | "agent" | "viewer"
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
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
  public: {
    Enums: {
      assignment_strategy: ["manual", "round_robin", "specific_agent"],
      automation_run_status: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "skipped",
      ],
      automation_trigger: [
        "lead_created",
        "task_due",
        "viewing_upcoming",
        "lead_unassigned",
        "sequence_step",
      ],
      availability_status: [
        "available",
        "under_offer",
        "pending",
        "leased",
        "sold",
        "off_market",
      ],
      contact_type: [
        "buyer",
        "seller",
        "tenant",
        "landlord",
        "investor",
        "other",
      ],
      deal_outcome: ["open", "won", "lost"],
      integration_provider: ["resend", "n8n", "openai", "google_calendar"],
      integration_status: ["disconnected", "connected", "error"],
      job_status: ["pending", "running", "succeeded", "failed", "cancelled"],
      lead_source: [
        "website",
        "referral",
        "portal",
        "walk_in",
        "phone",
        "social",
        "other",
      ],
      listing_type: ["sale", "rental"],
      message_status: ["draft", "approved", "sent", "failed", "not_sent"],
      notification_channel: ["in_app", "email"],
      pipeline_stage: [
        "new",
        "contacted",
        "qualified",
        "viewing_scheduled",
        "offer_submitted",
        "won",
        "lost",
      ],
      property_category: ["residential", "commercial"],
      property_type: [
        "house",
        "apartment",
        "condo",
        "townhouse",
        "land",
        "office",
        "retail",
        "industrial",
        "mixed_use",
        "other",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
      viewing_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      workspace_role: ["owner", "admin", "agent", "viewer"],
    },
  },
} as const
