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
      admin_management: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          performed_by: string | null
          reason: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          performed_by?: string | null
          reason?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          performed_by?: string | null
          reason?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown | null
          request_count: number | null
          updated_at: string | null
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address?: unknown | null
          request_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown | null
          request_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      business_relationship_verifications: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          relationship_type: string
          requester_profile_id: string
          target_profile_id: string
          updated_at: string | null
          verification_evidence: Json | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          relationship_type: string
          requester_profile_id: string
          target_profile_id: string
          updated_at?: string | null
          verification_evidence?: Json | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          relationship_type?: string
          requester_profile_id?: string
          target_profile_id?: string
          updated_at?: string | null
          verification_evidence?: Json | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_relationship_verifications_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_relationship_verifications_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          authorized: boolean
          camera_id: string | null
          id: string
          ip_address: unknown | null
          project_id: string | null
          session_duration: unknown | null
          stream_url_accessed: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          authorized?: boolean
          camera_id?: string | null
          id?: string
          ip_address?: unknown | null
          project_id?: string | null
          session_duration?: unknown | null
          stream_url_accessed?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          authorized?: boolean
          camera_id?: string | null
          id?: string
          ip_address?: unknown | null
          project_id?: string | null
          session_duration?: unknown | null
          stream_url_accessed?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camera_access_log_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      cameras: {
        Row: {
          created_at: string
          id: string
          ingest_rtmp_url: string | null
          ingest_srt_url: string | null
          is_active: boolean | null
          location: string | null
          name: string
          project_id: string | null
          stream_url: string | null
          supports_ptz: boolean
          supports_two_way_audio: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingest_rtmp_url?: string | null
          ingest_srt_url?: string | null
          is_active?: boolean | null
          location?: string | null
          name: string
          project_id?: string | null
          stream_url?: string | null
          supports_ptz?: boolean
          supports_two_way_audio?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ingest_rtmp_url?: string | null
          ingest_srt_url?: string | null
          is_active?: boolean | null
          location?: string | null
          name?: string
          project_id?: string | null
          stream_url?: string | null
          supports_ptz?: boolean
          supports_two_way_audio?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cameras_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_vision_events: {
        Row: {
          id: string
          camera_id: string
          project_id: string | null
          occurred_at: string
          event_type: string
          label: string | null
          payload: Json
          confidence: number | null
          image_ref: string | null
          source_worker: string | null
          created_at: string
        }
        Insert: {
          id?: string
          camera_id: string
          project_id?: string | null
          occurred_at?: string
          event_type: string
          label?: string | null
          payload?: Json
          confidence?: number | null
          image_ref?: string | null
          source_worker?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          camera_id?: string
          project_id?: string | null
          occurred_at?: string
          event_type?: string
          label?: string | null
          payload?: Json
          confidence?: number | null
          image_ref?: string | null
          source_worker?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_vision_events_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_vision_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_access_audit: {
        Row: {
          access_granted: boolean | null
          access_reason: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          target_record_id: string | null
          target_table: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_reason?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          target_record_id?: string | null
          target_table: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_reason?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          target_record_id?: string | null
          target_table?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contact_security_audit: {
        Row: {
          action_attempted: string | null
          client_info: Json | null
          created_at: string | null
          id: string
          target_table: string
          target_user_id: string | null
          user_id: string | null
          was_authorized: boolean | null
        }
        Insert: {
          action_attempted?: string | null
          client_info?: Json | null
          created_at?: string | null
          id?: string
          target_table: string
          target_user_id?: string | null
          user_id?: string | null
          was_authorized?: boolean | null
        }
        Update: {
          action_attempted?: string | null
          client_info?: Json | null
          created_at?: string | null
          id?: string
          target_table?: string
          target_user_id?: string | null
          user_id?: string | null
          was_authorized?: boolean | null
        }
        Relationships: []
      }
      cross_role_access_audit: {
        Row: {
          access_granted: boolean | null
          access_justification: string | null
          access_type: string | null
          accessing_user_id: string | null
          accessing_user_role: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          risk_level: string | null
          security_violation: boolean | null
          table_accessed: string | null
          target_user_id: string | null
          target_user_role: string | null
          user_agent: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_justification?: string | null
          access_type?: string | null
          accessing_user_id?: string | null
          accessing_user_role?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          risk_level?: string | null
          security_violation?: boolean | null
          table_accessed?: string | null
          target_user_id?: string | null
          target_user_role?: string | null
          user_agent?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_justification?: string | null
          access_type?: string | null
          accessing_user_id?: string | null
          accessing_user_role?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          risk_level?: string | null
          security_violation?: boolean | null
          table_accessed?: string | null
          target_user_id?: string | null
          target_user_role?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          actual_delivery_time: string | null
          builder_id: string | null
          created_at: string
          delivery_address: string
          delivery_date: string | null
          estimated_delivery_time: string | null
          id: string
          material_type: string
          notes: string | null
          pickup_address: string
          pickup_date: string | null
          project_id: string | null
          quantity: number
          status: string | null
          supplier_id: string | null
          tracking_number: string | null
          updated_at: string
          vehicle_details: string | null
          weight_kg: number | null
        }
        Insert: {
          actual_delivery_time?: string | null
          builder_id?: string | null
          created_at?: string
          delivery_address: string
          delivery_date?: string | null
          estimated_delivery_time?: string | null
          id?: string
          material_type: string
          notes?: string | null
          pickup_address: string
          pickup_date?: string | null
          project_id?: string | null
          quantity: number
          status?: string | null
          supplier_id?: string | null
          tracking_number?: string | null
          updated_at?: string
          vehicle_details?: string | null
          weight_kg?: number | null
        }
        Update: {
          actual_delivery_time?: string | null
          builder_id?: string | null
          created_at?: string
          delivery_address?: string
          delivery_date?: string | null
          estimated_delivery_time?: string | null
          id?: string
          material_type?: string
          notes?: string | null
          pickup_address?: string
          pickup_date?: string | null
          project_id?: string | null
          quantity?: number
          status?: string | null
          supplier_id?: string | null
          tracking_number?: string | null
          updated_at?: string
          vehicle_details?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_access_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string
          sensitive_fields_accessed: string[] | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type: string
          sensitive_fields_accessed?: string[] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string
          sensitive_fields_accessed?: string[] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      delivery_acknowledgements: {
        Row: {
          acknowledged_by: string
          acknowledgement_date: string
          acknowledger_id: string
          comments: string | null
          created_at: string
          delivery_note_id: string
          digital_signature: string
          id: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          signed_document_path: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_by: string
          acknowledgement_date?: string
          acknowledger_id: string
          comments?: string | null
          created_at?: string
          delivery_note_id: string
          digital_signature: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          signed_document_path?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_by?: string
          acknowledgement_date?: string
          acknowledger_id?: string
          comments?: string | null
          created_at?: string
          delivery_note_id?: string
          digital_signature?: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          signed_document_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_acknowledgements_acknowledger_id_fkey"
            columns: ["acknowledger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_acknowledgements_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_communications: {
        Row: {
          content: string | null
          created_at: string
          delivery_request_id: string | null
          id: string
          message_type: string
          metadata: Json | null
          read_by: Json | null
          sender_id: string
          sender_name: string
          sender_type: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          delivery_request_id?: string | null
          id?: string
          message_type: string
          metadata?: Json | null
          read_by?: Json | null
          sender_id: string
          sender_name: string
          sender_type: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          delivery_request_id?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          read_by?: Json | null
          sender_id?: string
          sender_name?: string
          sender_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_communications_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_note_signatures: {
        Row: {
          created_at: string
          delivery_note_id: string
          id: string
          signature_data: string
          signed_at: string
          signer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_note_id: string
          id?: string
          signature_data: string
          signed_at?: string
          signer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_note_id?: string
          id?: string
          signature_data?: string
          signed_at?: string
          signer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_note_signatures_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_notes: {
        Row: {
          content_type: string | null
          created_at: string
          delivery_note_number: string
          dispatch_date: string
          expected_delivery_date: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          notes: string | null
          purchase_order_id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          delivery_note_number: string
          dispatch_date: string
          expected_delivery_date?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          notes?: string | null
          purchase_order_id: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          delivery_note_number?: string
          dispatch_date?: string
          expected_delivery_date?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          notes?: string | null
          purchase_order_id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_notifications: {
        Row: {
          builder_id: string
          created_at: string
          delivery_address: string
          delivery_latitude: number | null
          delivery_longitude: number | null
          id: string
          material_details: Json
          notification_radius_km: number | null
          pickup_address: string
          pickup_latitude: number | null
          pickup_longitude: number | null
          priority_level: string | null
          request_id: string
          request_type: string
          special_instructions: string | null
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          builder_id: string
          created_at?: string
          delivery_address: string
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          id?: string
          material_details?: Json
          notification_radius_km?: number | null
          pickup_address: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          priority_level?: string | null
          request_id: string
          request_type: string
          special_instructions?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          builder_id?: string
          created_at?: string
          delivery_address?: string
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          id?: string
          material_details?: Json
          notification_radius_km?: number | null
          pickup_address?: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          priority_level?: string | null
          request_id?: string
          request_type?: string
          special_instructions?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notifications_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_orders: {
        Row: {
          builder_id: string
          created_at: string
          delivery_address: string
          id: string
          materials: Json
          notes: string | null
          order_number: string
          pickup_address: string
          project_id: string | null
          qr_code_generated: boolean | null
          qr_code_url: string | null
          qr_coded_items: number
          status: string
          supplier_id: string
          total_items: number
          updated_at: string
        }
        Insert: {
          builder_id: string
          created_at?: string
          delivery_address: string
          id?: string
          materials?: Json
          notes?: string | null
          order_number: string
          pickup_address: string
          project_id?: string | null
          qr_code_generated?: boolean | null
          qr_code_url?: string | null
          qr_coded_items?: number
          status?: string
          supplier_id: string
          total_items?: number
          updated_at?: string
        }
        Update: {
          builder_id?: string
          created_at?: string
          delivery_address?: string
          id?: string
          materials?: Json
          notes?: string | null
          order_number?: string
          pickup_address?: string
          project_id?: string | null
          qr_code_generated?: boolean | null
          qr_code_url?: string | null
          qr_coded_items?: number
          status?: string
          supplier_id?: string
          total_items?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_provider_access_audit: {
        Row: {
          access_granted: boolean | null
          access_type: string
          created_at: string | null
          id: string
          provider_id: string | null
          security_risk_level: string | null
          sensitive_fields_accessed: string[] | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_type: string
          created_at?: string | null
          id?: string
          provider_id?: string | null
          security_risk_level?: string | null
          sensitive_fields_accessed?: string[] | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_type?: string
          created_at?: string | null
          id?: string
          provider_id?: string | null
          security_risk_level?: string | null
          sensitive_fields_accessed?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      delivery_provider_listings: {
        Row: {
          capacity_kg: number | null
          created_at: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          per_km_rate: number | null
          provider_id: string
          provider_name: string
          provider_type: string
          rating: number | null
          service_areas: string[] | null
          total_deliveries: number | null
          updated_at: string | null
          vehicle_types: string[] | null
        }
        Insert: {
          capacity_kg?: number | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          per_km_rate?: number | null
          provider_id: string
          provider_name: string
          provider_type?: string
          rating?: number | null
          service_areas?: string[] | null
          total_deliveries?: number | null
          updated_at?: string | null
          vehicle_types?: string[] | null
        }
        Update: {
          capacity_kg?: number | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          per_km_rate?: number | null
          provider_id?: string
          provider_name?: string
          provider_type?: string
          rating?: number | null
          service_areas?: string[] | null
          total_deliveries?: number | null
          updated_at?: string | null
          vehicle_types?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_provider_listings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "delivery_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_provider_personal_data_vault: {
        Row: {
          access_log_required: boolean | null
          created_at: string | null
          data_classification: string
          encrypted_email: string | null
          encrypted_license_number: string | null
          encrypted_national_id: string | null
          encrypted_phone: string | null
          encryption_version: string
          id: string
          provider_id: string
          updated_at: string | null
        }
        Insert: {
          access_log_required?: boolean | null
          created_at?: string | null
          data_classification?: string
          encrypted_email?: string | null
          encrypted_license_number?: string | null
          encrypted_national_id?: string | null
          encrypted_phone?: string | null
          encryption_version?: string
          id?: string
          provider_id: string
          updated_at?: string | null
        }
        Update: {
          access_log_required?: boolean | null
          created_at?: string | null
          data_classification?: string
          encrypted_email?: string | null
          encrypted_license_number?: string | null
          encrypted_national_id?: string | null
          encrypted_phone?: string | null
          encryption_version?: string
          id?: string
          provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_provider_personal_data_vault_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "delivery_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_provider_queue: {
        Row: {
          contacted_at: string | null
          created_at: string | null
          id: string
          provider_id: string
          queue_position: number
          request_id: string
          responded_at: string | null
          status: string
          timeout_at: string | null
          updated_at: string | null
        }
        Insert: {
          contacted_at?: string | null
          created_at?: string | null
          id?: string
          provider_id: string
          queue_position: number
          request_id: string
          responded_at?: string | null
          status?: string
          timeout_at?: string | null
          updated_at?: string | null
        }
        Update: {
          contacted_at?: string | null
          created_at?: string | null
          id?: string
          provider_id?: string
          queue_position?: number
          request_id?: string
          responded_at?: string | null
          status?: string
          timeout_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_provider_queue_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "delivery_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_provider_queue_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_provider_responses: {
        Row: {
          created_at: string
          distance_km: number | null
          estimated_cost: number | null
          estimated_duration_hours: number | null
          id: string
          notification_id: string
          provider_id: string
          responded_at: string
          response: string
          response_message: string | null
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          estimated_cost?: number | null
          estimated_duration_hours?: number | null
          id?: string
          notification_id: string
          provider_id: string
          responded_at?: string
          response: string
          response_message?: string | null
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          estimated_cost?: number | null
          estimated_duration_hours?: number | null
          id?: string
          notification_id?: string
          provider_id?: string
          responded_at?: string
          response?: string
          response_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_provider_responses_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "delivery_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_provider_responses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "delivery_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_providers: {
        Row: {
          address: string | null
          availability_schedule: Json | null
          capacity_kg: number | null
          contact_person: string | null
          created_at: string
          current_latitude: number | null
          current_longitude: number | null
          cv_document_path: string | null
          cv_verified: boolean | null
          documents_complete: boolean | null
          driving_license_class: string | null
          driving_license_document_path: string | null
          driving_license_expiry: string | null
          driving_license_number: string | null
          driving_license_verified: boolean | null
          email: string | null
          good_conduct_document_path: string | null
          good_conduct_verified: boolean | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_location_update: string | null
          national_id_document_path: string | null
          national_id_verified: boolean | null
          per_km_rate: number | null
          phone: string
          provider_name: string
          provider_type: string
          rating: number | null
          service_areas: string[] | null
          total_deliveries: number | null
          updated_at: string
          user_id: string
          vehicle_types: string[] | null
        }
        Insert: {
          address?: string | null
          availability_schedule?: Json | null
          capacity_kg?: number | null
          contact_person?: string | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          cv_document_path?: string | null
          cv_verified?: boolean | null
          documents_complete?: boolean | null
          driving_license_class?: string | null
          driving_license_document_path?: string | null
          driving_license_expiry?: string | null
          driving_license_number?: string | null
          driving_license_verified?: boolean | null
          email?: string | null
          good_conduct_document_path?: string | null
          good_conduct_verified?: boolean | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_location_update?: string | null
          national_id_document_path?: string | null
          national_id_verified?: boolean | null
          per_km_rate?: number | null
          phone: string
          provider_name: string
          provider_type?: string
          rating?: number | null
          service_areas?: string[] | null
          total_deliveries?: number | null
          updated_at?: string
          user_id: string
          vehicle_types?: string[] | null
        }
        Update: {
          address?: string | null
          availability_schedule?: Json | null
          capacity_kg?: number | null
          contact_person?: string | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          cv_document_path?: string | null
          cv_verified?: boolean | null
          documents_complete?: boolean | null
          driving_license_class?: string | null
          driving_license_document_path?: string | null
          driving_license_expiry?: string | null
          driving_license_number?: string | null
          driving_license_verified?: boolean | null
          email?: string | null
          good_conduct_document_path?: string | null
          good_conduct_verified?: boolean | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_location_update?: string | null
          national_id_document_path?: string | null
          national_id_verified?: boolean | null
          per_km_rate?: number | null
          phone?: string
          provider_name?: string
          provider_type?: string
          rating?: number | null
          service_areas?: string[] | null
          total_deliveries?: number | null
          updated_at?: string
          user_id?: string
          vehicle_types?: string[] | null
        }
        Relationships: []
      }
      delivery_requests: {
        Row: {
          attempted_providers: string[] | null
          auto_rotation_enabled: boolean | null
          budget_range: string | null
          builder_id: string
          created_at: string
          delivery_address: string
          delivery_latitude: number | null
          delivery_longitude: number | null
          id: string
          material_type: string
          max_rotation_attempts: number | null
          pickup_address: string
          pickup_date: string
          pickup_latitude: number | null
          pickup_longitude: number | null
          preferred_time: string | null
          provider_id: string | null
          provider_response: string | null
          quantity: number
          required_vehicle_type: string | null
          response_date: string | null
          response_notes: string | null
          rotation_completed_at: string | null
          special_instructions: string | null
          status: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          attempted_providers?: string[] | null
          auto_rotation_enabled?: boolean | null
          budget_range?: string | null
          builder_id: string
          created_at?: string
          delivery_address: string
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          id?: string
          material_type: string
          max_rotation_attempts?: number | null
          pickup_address: string
          pickup_date: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          preferred_time?: string | null
          provider_id?: string | null
          provider_response?: string | null
          quantity: number
          required_vehicle_type?: string | null
          response_date?: string | null
          response_notes?: string | null
          rotation_completed_at?: string | null
          special_instructions?: string | null
          status?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          attempted_providers?: string[] | null
          auto_rotation_enabled?: boolean | null
          budget_range?: string | null
          builder_id?: string
          created_at?: string
          delivery_address?: string
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          id?: string
          material_type?: string
          max_rotation_attempts?: number | null
          pickup_address?: string
          pickup_date?: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          preferred_time?: string | null
          provider_id?: string | null
          provider_response?: string | null
          quantity?: number
          required_vehicle_type?: string | null
          response_date?: string | null
          response_notes?: string | null
          rotation_completed_at?: string | null
          special_instructions?: string | null
          status?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_requests_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_status_updates: {
        Row: {
          created_at: string
          delivery_request_id: string | null
          id: string
          location_latitude: number | null
          location_longitude: number | null
          notes: string | null
          status: string
          updated_by_id: string
          updated_by_name: string
          updated_by_type: string
        }
        Insert: {
          created_at?: string
          delivery_request_id?: string | null
          id?: string
          location_latitude?: number | null
          location_longitude?: number | null
          notes?: string | null
          status: string
          updated_by_id: string
          updated_by_name: string
          updated_by_type: string
        }
        Update: {
          created_at?: string
          delivery_request_id?: string | null
          id?: string
          location_latitude?: number | null
          location_longitude?: number | null
          notes?: string | null
          status?: string
          updated_by_id?: string
          updated_by_name?: string
          updated_by_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_status_updates_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tracking: {
        Row: {
          created_at: string
          current_latitude: number
          current_longitude: number
          delivery_id: string
          delivery_status: string
          id: string
          provider_id: string
          tracking_timestamp: string
        }
        Insert: {
          created_at?: string
          current_latitude: number
          current_longitude: number
          delivery_id: string
          delivery_status: string
          id?: string
          provider_id: string
          tracking_timestamp?: string
        }
        Update: {
          created_at?: string
          current_latitude?: number
          current_longitude?: number
          delivery_id?: string
          delivery_status?: string
          id?: string
          provider_id?: string
          tracking_timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tracking_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "delivery_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_updates: {
        Row: {
          created_at: string
          delivery_id: string | null
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          created_at?: string
          delivery_id?: string | null
          id?: string
          notes?: string | null
          status: string
        }
        Update: {
          created_at?: string
          delivery_id?: string | null
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_updates_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_contact_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          authorized: boolean
          business_justification: string | null
          delivery_id: string | null
          delivery_status: string | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          authorized?: boolean
          business_justification?: string | null
          delivery_id?: string | null
          delivery_status?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          authorized?: boolean
          business_justification?: string | null
          delivery_id?: string | null
          delivery_status?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_contact_access_log_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_contact_data: {
        Row: {
          access_expires_at: string
          created_at: string
          delivery_id: string
          driver_email: string | null
          driver_name: string
          driver_phone: string
          id: string
          updated_at: string
        }
        Insert: {
          access_expires_at?: string
          created_at?: string
          delivery_id: string
          driver_email?: string | null
          driver_name: string
          driver_phone: string
          id?: string
          updated_at?: string
        }
        Update: {
          access_expires_at?: string
          created_at?: string
          delivery_id?: string
          driver_email?: string | null
          driver_name?: string
          driver_phone?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_contact_data_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: true
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_info_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          delivery_id: string | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          delivery_id?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          delivery_id?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_info_access_log_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_personal_data_audit: {
        Row: {
          access_granted: boolean | null
          access_justification: string | null
          access_type: string
          business_relationship_verified: boolean | null
          created_at: string | null
          driver_id: string | null
          id: string
          ip_address: unknown | null
          security_risk_level: string | null
          sensitive_fields_accessed: string[] | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_justification?: string | null
          access_type: string
          business_relationship_verified?: boolean | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          ip_address?: unknown | null
          security_risk_level?: string | null
          sensitive_fields_accessed?: string[] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_justification?: string | null
          access_type?: string
          business_relationship_verified?: boolean | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          ip_address?: unknown | null
          security_risk_level?: string | null
          sensitive_fields_accessed?: string[] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      emergency_lockdown_log: {
        Row: {
          affected_tables: string[] | null
          applied_by_user: string | null
          id: string
          lockdown_timestamp: string | null
          security_level: string | null
        }
        Insert: {
          affected_tables?: string[] | null
          applied_by_user?: string | null
          id?: string
          lockdown_timestamp?: string | null
          security_level?: string | null
        }
        Update: {
          affected_tables?: string[] | null
          applied_by_user?: string | null
          id?: string
          lockdown_timestamp?: string | null
          security_level?: string | null
        }
        Relationships: []
      }
      emergency_security_log: {
        Row: {
          created_at: string | null
          event_data: string | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          category: string | null
          comment: string | null
          created_at: string
          delivery_id: string | null
          id: string
          rating: number | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          comment?: string | null
          created_at?: string
          delivery_id?: string | null
          id?: string
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          comment?: string | null
          created_at?: string
          delivery_id?: string | null
          id?: string
          rating?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_received_notes: {
        Row: {
          additional_notes: string | null
          builder_id: string
          created_at: string
          delivery_id: string | null
          delivery_note_reference: string | null
          discrepancies: string | null
          grn_number: string
          id: string
          items: Json
          overall_condition: string
          project_id: string | null
          received_by: string
          received_date: string
          status: string
          supplier_name: string
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          builder_id: string
          created_at?: string
          delivery_id?: string | null
          delivery_note_reference?: string | null
          discrepancies?: string | null
          grn_number: string
          id?: string
          items?: Json
          overall_condition?: string
          project_id?: string | null
          received_by: string
          received_date: string
          status?: string
          supplier_name: string
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          builder_id?: string
          created_at?: string
          delivery_id?: string | null
          delivery_note_reference?: string | null
          discrepancies?: string | null
          grn_number?: string
          id?: string
          items?: Json
          overall_condition?: string
          project_id?: string | null
          received_by?: string
          received_date?: string
          status?: string
          supplier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          custom_invoice_path: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issuer_id: string
          items: Json
          notes: string | null
          payment_terms: string | null
          purchase_order_id: string | null
          status: string
          subtotal: number
          supplier_id: string
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_invoice_path?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issuer_id: string
          items?: Json
          notes?: string | null
          payment_terms?: string | null
          purchase_order_id?: string | null
          status?: string
          subtotal?: number
          supplier_id: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_invoice_path?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issuer_id?: string
          items?: Json
          notes?: string | null
          payment_terms?: string | null
          purchase_order_id?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      location_access_security_audit: {
        Row: {
          access_justification: string | null
          accessed_record_id: string | null
          accessed_table: string
          created_at: string | null
          delivery_status: string | null
          id: string
          ip_address: unknown | null
          location_data_type: string
          risk_level: string | null
          time_since_update: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_justification?: string | null
          accessed_record_id?: string | null
          accessed_table: string
          created_at?: string | null
          delivery_status?: string | null
          id?: string
          ip_address?: unknown | null
          location_data_type: string
          risk_level?: string | null
          time_since_update?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_justification?: string | null
          accessed_record_id?: string | null
          accessed_table?: string
          created_at?: string | null
          delivery_status?: string | null
          id?: string
          ip_address?: unknown | null
          location_data_type?: string
          risk_level?: string | null
          time_since_update?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      location_data_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          data_fields_accessed: string[] | null
          delivery_id: string | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          data_fields_accessed?: string[] | null
          delivery_id?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          data_fields_accessed?: string[] | null
          delivery_id?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_data_access_log_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      master_rls_security_audit: {
        Row: {
          access_reason: string | null
          additional_context: Json | null
          event_timestamp: string | null
          event_type: string
          id: string
        }
        Insert: {
          access_reason?: string | null
          additional_context?: Json | null
          event_timestamp?: string | null
          event_type: string
          id?: string
        }
        Update: {
          access_reason?: string | null
          additional_context?: Json | null
          event_timestamp?: string | null
          event_type?: string
          id?: string
        }
        Relationships: []
      }
      material_items: {
        Row: {
          batch_number: string | null
          category: string
          created_at: string | null
          dispatch_scan_id: string | null
          id: string
          item_sequence: number
          material_type: string
          purchase_order_id: string | null
          qr_code: string
          quantity: number
          receiving_scan_id: string | null
          status: string | null
          supplier_id: string | null
          unit: string
          updated_at: string | null
          verification_scan_id: string | null
        }
        Insert: {
          batch_number?: string | null
          category: string
          created_at?: string | null
          dispatch_scan_id?: string | null
          id?: string
          item_sequence: number
          material_type: string
          purchase_order_id?: string | null
          qr_code: string
          quantity: number
          receiving_scan_id?: string | null
          status?: string | null
          supplier_id?: string | null
          unit: string
          updated_at?: string | null
          verification_scan_id?: string | null
        }
        Update: {
          batch_number?: string | null
          category?: string
          created_at?: string | null
          dispatch_scan_id?: string | null
          id?: string
          item_sequence?: number
          material_type?: string
          purchase_order_id?: string | null
          qr_code?: string
          quantity?: number
          receiving_scan_id?: string | null
          status?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string | null
          verification_scan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_items_dispatch_scan_id_fkey"
            columns: ["dispatch_scan_id"]
            isOneToOne: false
            referencedRelation: "qr_scan_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_items_receiving_scan_id_fkey"
            columns: ["receiving_scan_id"]
            isOneToOne: false
            referencedRelation: "qr_scan_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_items_verification_scan_id_fkey"
            columns: ["verification_scan_id"]
            isOneToOne: false
            referencedRelation: "qr_scan_events"
            referencedColumns: ["id"]
          },
        ]
      }
      material_qr_codes: {
        Row: {
          batch_number: string | null
          created_at: string | null
          dispatched_at: string | null
          generated_at: string | null
          id: string
          material_type: string
          purchase_order_id: string | null
          qr_code: string
          quantity: number
          received_at: string | null
          status: string | null
          supplier_id: string | null
          unit: string | null
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          dispatched_at?: string | null
          generated_at?: string | null
          id?: string
          material_type: string
          purchase_order_id?: string | null
          qr_code: string
          quantity: number
          received_at?: string | null
          status?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          dispatched_at?: string | null
          generated_at?: string | null
          id?: string
          material_type?: string
          purchase_order_id?: string | null
          qr_code?: string
          quantity?: number
          received_at?: string | null
          status?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_qr_codes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_materials: {
        Row: {
          batch_number: string | null
          created_at: string
          id: string
          is_qr_coded: boolean
          is_scanned: boolean
          material_type: string
          order_id: string
          qr_code: string | null
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          id?: string
          is_qr_coded?: boolean
          is_scanned?: boolean
          material_type: string
          order_id: string
          qr_code?: string | null
          quantity: number
          unit?: string
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          id?: string
          is_qr_coded?: boolean
          is_scanned?: boolean
          material_type?: string
          order_id?: string
          qr_code?: string | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_materials_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_access_audit: {
        Row: {
          access_granted: boolean | null
          access_type: string
          accessed_fields: string[] | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          payment_id: string | null
          security_risk_level: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_type: string
          accessed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          payment_id?: string | null
          security_risk_level?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_type?: string
          accessed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          payment_id?: string | null
          security_risk_level?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_contact_vault: {
        Row: {
          accessed_count: number | null
          created_at: string | null
          email_encrypted: string | null
          encryption_key_id: string | null
          id: string
          last_accessed_at: string | null
          payment_id: string
          phone_number_encrypted: string | null
          updated_at: string | null
        }
        Insert: {
          accessed_count?: number | null
          created_at?: string | null
          email_encrypted?: string | null
          encryption_key_id?: string | null
          id?: string
          last_accessed_at?: string | null
          payment_id: string
          phone_number_encrypted?: string | null
          updated_at?: string | null
        }
        Update: {
          accessed_count?: number | null
          created_at?: string | null
          email_encrypted?: string | null
          encryption_key_id?: string | null
          id?: string
          last_accessed_at?: string | null
          payment_id?: string
          phone_number_encrypted?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_contact_vault_audit: {
        Row: {
          access_granted: boolean
          access_justification: string | null
          access_type: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          payment_id: string | null
          security_risk_level: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean
          access_justification?: string | null
          access_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          payment_id?: string | null
          security_risk_level?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean
          access_justification?: string | null
          access_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          payment_id?: string | null
          security_risk_level?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_encryption_audit: {
        Row: {
          created_at: string | null
          encryption_event: string
          encryption_strength: string
          field_encrypted: string
          id: string
          payment_id: string | null
          risk_assessment: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          encryption_event: string
          encryption_strength?: string
          field_encrypted: string
          id?: string
          payment_id?: string | null
          risk_assessment?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          encryption_event?: string
          encryption_strength?: string
          field_encrypted?: string
          id?: string
          payment_id?: string | null
          risk_assessment?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_info_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          acknowledgement_id: string | null
          id: string
          ip_address: unknown | null
          payment_fields_accessed: string[] | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          acknowledgement_id?: string | null
          id?: string
          ip_address?: unknown | null
          payment_fields_accessed?: string[] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          acknowledgement_id?: string | null
          id?: string
          ip_address?: unknown | null
          payment_fields_accessed?: string[] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_info_access_log_acknowledgement_id_fkey"
            columns: ["acknowledgement_id"]
            isOneToOne: false
            referencedRelation: "delivery_acknowledgements"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_preferences: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          payment_details: Json | null
          payment_method: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          payment_details?: Json | null
          payment_method: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          payment_details?: Json | null
          payment_method?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_transaction_audit_log: {
        Row: {
          access_granted: boolean | null
          accessed_fields: string[] | null
          created_at: string | null
          denial_reason: string | null
          field_values_hash: string | null
          id: string
          ip_address: unknown | null
          payment_id: string | null
          security_risk_level: string | null
          session_id: string | null
          transaction_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean | null
          accessed_fields?: string[] | null
          created_at?: string | null
          denial_reason?: string | null
          field_values_hash?: string | null
          id?: string
          ip_address?: unknown | null
          payment_id?: string | null
          security_risk_level?: string | null
          session_id?: string | null
          transaction_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean | null
          accessed_fields?: string[] | null
          created_at?: string | null
          denial_reason?: string | null
          field_values_hash?: string | null
          id?: string
          ip_address?: unknown | null
          payment_id?: string | null
          security_risk_level?: string | null
          session_id?: string | null
          transaction_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          description: string | null
          id: string
          provider: string
          provider_response: Json | null
          reference: string
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          provider: string
          provider_response?: Json | null
          reference: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          provider?: string
          provider_response?: Json | null
          reference?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      privacy_consent_audit: {
        Row: {
          action: string
          consent_type: string
          created_at: string
          details: Json | null
          id: string
          target_profile_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          consent_type: string
          created_at?: string
          details?: Json | null
          id?: string
          target_profile_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          consent_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_profile_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profile_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          viewed_profile_id: string | null
          viewer_user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          viewed_profile_id?: string | null
          viewer_user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          viewed_profile_id?: string | null
          viewer_user_id?: string | null
        }
        Relationships: []
      }
      profile_access_security_audit: {
        Row: {
          access_granted: boolean | null
          access_justification: string | null
          access_type: string
          accessing_user_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          security_risk_level: string | null
          sensitive_fields_accessed: string[] | null
          target_profile_id: string | null
          unauthorized_access_attempt: boolean | null
          user_agent: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_justification?: string | null
          access_type: string
          accessing_user_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          security_risk_level?: string | null
          sensitive_fields_accessed?: string[] | null
          target_profile_id?: string | null
          unauthorized_access_attempt?: boolean | null
          user_agent?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_justification?: string | null
          access_type?: string
          accessing_user_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          security_risk_level?: string | null
          sensitive_fields_accessed?: string[] | null
          target_profile_id?: string | null
          unauthorized_access_attempt?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      profile_contact_consent: {
        Row: {
          consent_status: string
          consent_type: string
          created_at: string
          expires_at: string | null
          granted_at: string | null
          id: string
          profile_id: string
          request_reason: string | null
          requester_id: string
          updated_at: string
        }
        Insert: {
          consent_status?: string
          consent_type: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          profile_id: string
          request_reason?: string | null
          requester_id: string
          updated_at?: string
        }
        Update: {
          consent_status?: string
          consent_type?: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          profile_id?: string
          request_reason?: string | null
          requester_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_contact_consent_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_contact_consent_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_contact_vault: {
        Row: {
          created_at: string
          email_backup: string | null
          id: string
          phone_hash: string | null
          phone_number: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_backup?: string | null
          id?: string
          phone_hash?: string | null
          phone_number?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_backup?: string | null
          id?: string
          phone_hash?: string | null
          phone_number?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_contact_vault_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_identity_security_audit: {
        Row: {
          access_granted: boolean | null
          access_justification: string | null
          access_type: string
          accessing_user_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          security_risk_level: string | null
          sensitive_fields_accessed: string[] | null
          target_profile_id: string | null
          unauthorized_access_attempt: boolean | null
          user_agent: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_justification?: string | null
          access_type: string
          accessing_user_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          security_risk_level?: string | null
          sensitive_fields_accessed?: string[] | null
          target_profile_id?: string | null
          unauthorized_access_attempt?: boolean | null
          user_agent?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_justification?: string | null
          access_type?: string
          accessing_user_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          security_risk_level?: string | null
          sensitive_fields_accessed?: string[] | null
          target_profile_id?: string | null
          unauthorized_access_attempt?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      profile_vault_access_audit: {
        Row: {
          access_granted: boolean
          access_type: string
          accessed_fields: string[] | null
          created_at: string
          id: string
          ip_address: unknown | null
          profile_id: string | null
          security_risk_level: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean
          access_type: string
          accessed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          profile_id?: string | null
          security_risk_level?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean
          access_type?: string
          accessed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          profile_id?: string | null
          security_risk_level?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_license: string | null
          builder_category: "professional" | "private" | null
          company_logo_url: string | null
          company_name: string | null
          company_registration: string | null
          created_at: string
          full_name: string | null
          id: string
          is_professional: boolean | null
          phone: string | null
          updated_at: string
          user_id: string
          user_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_license?: string | null
          builder_category?: "professional" | "private" | null
          company_logo_url?: string | null
          company_name?: string | null
          company_registration?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_professional?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id: string
          user_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_license?: string | null
          builder_category?: "professional" | "private" | null
          company_logo_url?: string | null
          company_name?: string | null
          company_registration?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_professional?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          access_code: string | null
          builder_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          location: string | null
          name: string
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          builder_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          builder_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          accessed_fields: string[] | null
          business_justification: string | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          viewed_provider_id: string
          viewer_user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          accessed_fields?: string[] | null
          business_justification?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          viewed_provider_id: string
          viewer_user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          accessed_fields?: string[] | null
          business_justification?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          viewed_provider_id?: string
          viewer_user_id?: string | null
        }
        Relationships: []
      }
      provider_business_access_audit: {
        Row: {
          access_granted: boolean | null
          access_justification: string | null
          access_type: string
          business_relationship_verified: boolean | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          provider_id: string | null
          security_risk_level: string | null
          sensitive_fields_accessed: string[] | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_justification?: string | null
          access_type: string
          business_relationship_verified?: boolean | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          provider_id?: string | null
          security_risk_level?: string | null
          sensitive_fields_accessed?: string[] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_justification?: string | null
          access_type?: string
          business_relationship_verified?: boolean | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          provider_id?: string | null
          security_risk_level?: string | null
          sensitive_fields_accessed?: string[] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      provider_business_relationships: {
        Row: {
          admin_approved: boolean | null
          created_at: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          provider_id: string
          relationship_type: string
          requester_id: string
          updated_at: string | null
          verification_evidence: Json | null
        }
        Insert: {
          admin_approved?: boolean | null
          created_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          provider_id: string
          relationship_type: string
          requester_id: string
          updated_at?: string | null
          verification_evidence?: Json | null
        }
        Update: {
          admin_approved?: boolean | null
          created_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          provider_id?: string
          relationship_type?: string
          requester_id?: string
          updated_at?: string | null
          verification_evidence?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_business_relationships_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "delivery_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_business_relationships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_contact_security_audit: {
        Row: {
          access_granted: boolean | null
          access_justification: string | null
          business_relationship_verified: boolean | null
          contact_field_requested: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          provider_id: string | null
          security_risk_level: string | null
          session_details: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_justification?: string | null
          business_relationship_verified?: boolean | null
          contact_field_requested: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          provider_id?: string | null
          security_risk_level?: string | null
          session_details?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_justification?: string | null
          business_relationship_verified?: boolean | null
          contact_field_requested?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          provider_id?: string | null
          security_risk_level?: string | null
          session_details?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      provider_contact_security_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          authorized: boolean | null
          business_justification: string | null
          field_accessed: string | null
          id: string
          ip_address: unknown | null
          provider_id: string | null
          security_level: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          authorized?: boolean | null
          business_justification?: string | null
          field_accessed?: string | null
          id?: string
          ip_address?: unknown | null
          provider_id?: string | null
          security_level?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          authorized?: boolean | null
          business_justification?: string | null
          field_accessed?: string | null
          id?: string
          ip_address?: unknown | null
          provider_id?: string | null
          security_level?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          buyer_id: string
          builder_fulfillment_choice?: string
          created_at: string
          delivery_address: string
          delivery_date: string
          delivery_notes: string | null
          delivery_requested_at: string | null
          delivery_required: boolean | null
          id: string
          items: Json
          payment_terms: string | null
          po_number: string
          project_name: string | null
          qr_code_generated: boolean | null
          qr_code_url: string | null
          quote_amount: number | null
          quote_valid_until: string | null
          quotation_request_id: string | null
          special_instructions: string | null
          status: string
          supplier_id: string
          supplier_notes: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          builder_fulfillment_choice?: string
          created_at?: string
          delivery_address: string
          delivery_date: string
          delivery_notes?: string | null
          delivery_requested_at?: string | null
          delivery_required?: boolean | null
          id?: string
          items?: Json
          payment_terms?: string | null
          po_number: string
          project_name?: string | null
          qr_code_generated?: boolean | null
          qr_code_url?: string | null
          quote_amount?: number | null
          quote_valid_until?: string | null
          quotation_request_id?: string | null
          special_instructions?: string | null
          status?: string
          supplier_id: string
          supplier_notes?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          builder_fulfillment_choice?: string
          created_at?: string
          delivery_address?: string
          delivery_date?: string
          delivery_notes?: string | null
          delivery_requested_at?: string | null
          delivery_required?: boolean | null
          id?: string
          items?: Json
          payment_terms?: string | null
          po_number?: string
          project_name?: string | null
          qr_code_generated?: boolean | null
          qr_code_url?: string | null
          quote_amount?: number | null
          quote_valid_until?: string | null
          quotation_request_id?: string | null
          special_instructions?: string | null
          status?: string
          supplier_id?: string
          supplier_notes?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      purchase_receipts: {
        Row: {
          buyer_id: string
          created_at: string
          delivery_address: string | null
          delivery_notes: string | null
          delivery_requested_at: string | null
          delivery_required: boolean | null
          id: string
          items: Json
          payment_method: string
          payment_reference: string | null
          receipt_number: string
          special_instructions: string | null
          status: string
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          delivery_address?: string | null
          delivery_notes?: string | null
          delivery_requested_at?: string | null
          delivery_required?: boolean | null
          id?: string
          items?: Json
          payment_method: string
          payment_reference?: string | null
          receipt_number: string
          special_instructions?: string | null
          status?: string
          supplier_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          delivery_address?: string | null
          delivery_notes?: string | null
          delivery_requested_at?: string | null
          delivery_required?: boolean | null
          id?: string
          items?: Json
          payment_method?: string
          payment_reference?: string | null
          receipt_number?: string
          special_instructions?: string | null
          status?: string
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      qr_scan_events: {
        Row: {
          created_at: string | null
          id: string
          material_condition: string | null
          notes: string | null
          photo_url: string | null
          qr_code: string
          quantity_scanned: number | null
          scan_location: Json | null
          scan_type: string
          scanned_at: string | null
          scanned_by: string | null
          scanner_device_id: string | null
          scanner_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_condition?: string | null
          notes?: string | null
          photo_url?: string | null
          qr_code: string
          quantity_scanned?: number | null
          scan_location?: Json | null
          scan_type: string
          scanned_at?: string | null
          scanned_by?: string | null
          scanner_device_id?: string | null
          scanner_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          material_condition?: string | null
          notes?: string | null
          photo_url?: string | null
          qr_code?: string
          quantity_scanned?: number | null
          scan_location?: Json | null
          scan_type?: string
          scanned_at?: string | null
          scanned_by?: string | null
          scanner_device_id?: string | null
          scanner_type?: string | null
        }
        Relationships: []
      }
      query_rate_limit_log: {
        Row: {
          created_at: string | null
          id: string
          query_count: number | null
          table_name: string
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          query_count?: number | null
          table_name: string
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          query_count?: number | null
          table_name?: string
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      quotation_access_audit: {
        Row: {
          access_granted: boolean | null
          access_type: string
          accessed_at: string | null
          id: string
          ip_address: unknown | null
          quotation_id: string | null
          requester_id: string | null
          supplier_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_type: string
          accessed_at?: string | null
          id?: string
          ip_address?: unknown | null
          quotation_id?: string | null
          requester_id?: string | null
          supplier_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_type?: string
          accessed_at?: string | null
          id?: string
          ip_address?: unknown | null
          quotation_id?: string | null
          requester_id?: string | null
          supplier_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quotation_requests: {
        Row: {
          created_at: string
          delivery_address: string
          id: string
          material_name: string
          preferred_delivery_date: string | null
          project_description: string | null
          quantity: number
          quote_amount: number | null
          quote_valid_until: string | null
          requester_id: string
          special_requirements: string | null
          status: string
          supplier_id: string
          supplier_notes: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_address: string
          id?: string
          material_name: string
          preferred_delivery_date?: string | null
          project_description?: string | null
          quantity: number
          quote_amount?: number | null
          quote_valid_until?: string | null
          requester_id: string
          special_requirements?: string | null
          status?: string
          supplier_id: string
          supplier_notes?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_address?: string
          id?: string
          material_name?: string
          preferred_delivery_date?: string | null
          project_description?: string | null
          quantity?: number
          quote_amount?: number | null
          quote_valid_until?: string | null
          requester_id?: string
          special_requirements?: string | null
          status?: string
          supplier_id?: string
          supplier_notes?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      receipt_uploads: {
        Row: {
          content_type: string | null
          created_at: string
          delivery_id: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          notes: string | null
          receipt_type: string | null
          scanned_supply_id: string | null
          shared_with_builder: boolean | null
          supplier_id: string | null
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          delivery_id?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          notes?: string | null
          receipt_type?: string | null
          scanned_supply_id?: string | null
          shared_with_builder?: boolean | null
          supplier_id?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          delivery_id?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          notes?: string | null
          receipt_type?: string | null
          scanned_supply_id?: string | null
          shared_with_builder?: boolean | null
          supplier_id?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_uploads_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_uploads_scanned_supply_id_fkey"
            columns: ["scanned_supply_id"]
            isOneToOne: false
            referencedRelation: "scanned_supplies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_uploads_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_audit: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          role_added: Database["public"]["Enums"]["app_role"] | null
          role_removed: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          role_added?: Database["public"]["Enums"]["app_role"] | null
          role_removed?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          role_added?: Database["public"]["Enums"]["app_role"] | null
          role_removed?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      scanned_receivables: {
        Row: {
          batch_number: string | null
          condition: string | null
          delivery_id: string | null
          delivery_order_id: string | null
          id: string
          matched_supply_id: string | null
          material_type: string
          notes: string | null
          project_id: string | null
          qr_code: string
          quantity: number | null
          received_at: string
          received_by: string | null
          received_status: string | null
          scanned_by: string | null
          supplier_info: string | null
          unit: string | null
          verified: boolean | null
        }
        Insert: {
          batch_number?: string | null
          condition?: string | null
          delivery_id?: string | null
          delivery_order_id?: string | null
          id?: string
          matched_supply_id?: string | null
          material_type: string
          notes?: string | null
          project_id?: string | null
          qr_code: string
          quantity?: number | null
          received_at?: string
          received_by?: string | null
          received_status?: string | null
          scanned_by?: string | null
          supplier_info?: string | null
          unit?: string | null
          verified?: boolean | null
        }
        Update: {
          batch_number?: string | null
          condition?: string | null
          delivery_id?: string | null
          delivery_order_id?: string | null
          id?: string
          matched_supply_id?: string | null
          material_type?: string
          notes?: string | null
          project_id?: string | null
          qr_code?: string
          quantity?: number | null
          received_at?: string
          received_by?: string | null
          received_status?: string | null
          scanned_by?: string | null
          supplier_info?: string | null
          unit?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "scanned_receivables_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scanned_receivables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scanned_supplies: {
        Row: {
          batch_number: string | null
          delivery_order_id: string | null
          dispatch_status: string | null
          dispatched_at: string | null
          dispatched_by: string | null
          id: string
          material_type: string
          notes: string | null
          qr_code: string
          quantity: number | null
          scanned_at: string
          scanned_by: string | null
          scanned_for_dispatch: boolean | null
          status: string | null
          supplier_id: string | null
          supplier_info: string | null
          unit: string | null
        }
        Insert: {
          batch_number?: string | null
          delivery_order_id?: string | null
          dispatch_status?: string | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          id?: string
          material_type: string
          notes?: string | null
          qr_code: string
          quantity?: number | null
          scanned_at?: string
          scanned_by?: string | null
          scanned_for_dispatch?: boolean | null
          status?: string | null
          supplier_id?: string | null
          supplier_info?: string | null
          unit?: string | null
        }
        Update: {
          batch_number?: string | null
          delivery_order_id?: string | null
          dispatch_status?: string | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          id?: string
          material_type?: string
          notes?: string | null
          qr_code?: string
          quantity?: number | null
          scanned_at?: string
          scanned_by?: string | null
          scanned_for_dispatch?: boolean | null
          status?: string | null
          supplier_id?: string | null
          supplier_info?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scanned_supplies_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string | null
          event_count: number | null
          id: string
          related_events: string[] | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description?: string | null
          event_count?: number | null
          id?: string
          related_events?: string[] | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          event_count?: number | null
          id?: string
          related_events?: string[] | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          device_fingerprint: Json | null
          event_type: string
          id: string
          severity: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          device_fingerprint?: Json | null
          event_type: string
          id?: string
          severity: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          device_fingerprint?: Json | null
          event_type?: string
          id?: string
          severity?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sensitive_data_access_audit: {
        Row: {
          access_granted: boolean | null
          access_reason: string | null
          access_type: string
          created_at: string | null
          fields_accessed: string[] | null
          id: string
          ip_address: unknown | null
          record_id: string | null
          security_risk_level: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_reason?: string | null
          access_type: string
          created_at?: string | null
          fields_accessed?: string[] | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          security_risk_level?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_reason?: string | null
          access_type?: string
          created_at?: string | null
          fields_accessed?: string[] | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          security_risk_level?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      supplier_applications: {
        Row: {
          address: string | null
          applicant_user_id: string
          application_notes: string | null
          business_registration_number: string | null
          company_name: string
          contact_person: string
          created_at: string
          email: string
          id: string
          materials_offered: string[] | null
          phone: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialties: string[] | null
          status: string
          updated_at: string
          years_in_business: number | null
        }
        Insert: {
          address?: string | null
          applicant_user_id: string
          application_notes?: string | null
          business_registration_number?: string | null
          company_name: string
          contact_person: string
          created_at?: string
          email: string
          id?: string
          materials_offered?: string[] | null
          phone: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialties?: string[] | null
          status?: string
          updated_at?: string
          years_in_business?: number | null
        }
        Update: {
          address?: string | null
          applicant_user_id?: string
          application_notes?: string | null
          business_registration_number?: string | null
          company_name?: string
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          materials_offered?: string[] | null
          phone?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialties?: string[] | null
          status?: string
          updated_at?: string
          years_in_business?: number | null
        }
        Relationships: []
      }
      supplier_business_relationships: {
        Row: {
          admin_approved: boolean | null
          created_at: string | null
          expires_at: string
          id: string
          relationship_type: string
          requester_id: string
          supplier_id: string
          updated_at: string | null
          verification_evidence: Json | null
          verified_at: string | null
        }
        Insert: {
          admin_approved?: boolean | null
          created_at?: string | null
          expires_at?: string
          id?: string
          relationship_type: string
          requester_id: string
          supplier_id: string
          updated_at?: string | null
          verification_evidence?: Json | null
          verified_at?: string | null
        }
        Update: {
          admin_approved?: boolean | null
          created_at?: string | null
          expires_at?: string
          id?: string
          relationship_type?: string
          requester_id?: string
          supplier_id?: string
          updated_at?: string | null
          verification_evidence?: Json | null
          verified_at?: string | null
        }
        Relationships: []
      }
      supplier_business_verification: {
        Row: {
          access_level: string
          created_at: string | null
          expires_at: string
          granted_by: string | null
          id: string
          is_active: boolean | null
          supplier_id: string | null
          updated_at: string | null
          user_id: string | null
          verification_evidence: Json | null
          verification_type: string
        }
        Insert: {
          access_level?: string
          created_at?: string | null
          expires_at: string
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          supplier_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_evidence?: Json | null
          verification_type: string
        }
        Update: {
          access_level?: string
          created_at?: string | null
          expires_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          supplier_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_evidence?: Json | null
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_business_verification_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contact_access_audit: {
        Row: {
          access_granted: boolean
          access_type: string
          accessed_fields: string[] | null
          business_justification: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          supplier_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean
          access_type: string
          accessed_fields?: string[] | null
          business_justification?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          supplier_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean
          access_type?: string
          accessed_fields?: string[] | null
          business_justification?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          supplier_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      supplier_contact_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          accessed_fields: string[] | null
          id: string
          ip_address: unknown | null
          supplier_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          accessed_fields?: string[] | null
          id?: string
          ip_address?: unknown | null
          supplier_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          accessed_fields?: string[] | null
          id?: string
          ip_address?: unknown | null
          supplier_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contact_access_log_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contact_consents: {
        Row: {
          consent_reason: string | null
          consent_type: string
          created_at: string | null
          expires_at: string
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          requester_profile_id: string
          revoked_at: string | null
          supplier_id: string
        }
        Insert: {
          consent_reason?: string | null
          consent_type: string
          created_at?: string | null
          expires_at: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          requester_profile_id: string
          revoked_at?: string | null
          supplier_id: string
        }
        Update: {
          consent_reason?: string | null
          consent_type?: string
          created_at?: string | null
          expires_at?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          requester_profile_id?: string
          revoked_at?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contact_consents_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contact_consents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contact_requests: {
        Row: {
          admin_id: string | null
          admin_response: string | null
          approved_at: string | null
          business_reason: string
          created_at: string
          expires_at: string
          id: string
          request_status: string
          requested_fields: string[]
          requester_id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          admin_response?: string | null
          approved_at?: string | null
          business_reason: string
          created_at?: string
          expires_at?: string
          id?: string
          request_status?: string
          requested_fields?: string[]
          requester_id: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          admin_response?: string | null
          approved_at?: string | null
          business_reason?: string
          created_at?: string
          expires_at?: string
          id?: string
          request_status?: string
          requested_fields?: string[]
          requester_id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_contact_security_audit: {
        Row: {
          access_granted: boolean | null
          access_justification: string | null
          business_relationship_verified: boolean | null
          contact_field_requested: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          security_risk_level: string | null
          sensitive_fields_accessed: string[] | null
          supplier_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_justification?: string | null
          business_relationship_verified?: boolean | null
          contact_field_requested: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          security_risk_level?: string | null
          sensitive_fields_accessed?: string[] | null
          supplier_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_justification?: string | null
          business_relationship_verified?: boolean | null
          contact_field_requested?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          security_risk_level?: string | null
          sensitive_fields_accessed?: string[] | null
          supplier_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          company_logo_url: string | null
          company_name: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_verified: boolean | null
          materials_offered: string[] | null
          phone: string | null
          profile_id: string | null
          rating: number | null
          specialties: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          company_logo_url?: string | null
          company_name: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean | null
          materials_offered?: string[] | null
          phone?: string | null
          profile_id?: string | null
          rating?: number | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          company_logo_url?: string | null
          company_name?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean | null
          materials_offered?: string[] | null
          phone?: string | null
          profile_id?: string | null
          rating?: number | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers_access_audit: {
        Row: {
          access_granted: boolean
          access_justification: string | null
          access_type: string
          created_at: string
          id: string
          ip_address: unknown | null
          security_risk_level: string
          sensitive_fields_accessed: string[] | null
          session_details: Json | null
          supplier_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean
          access_justification?: string | null
          access_type: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          security_risk_level?: string
          sensitive_fields_accessed?: string[] | null
          session_details?: Json | null
          supplier_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean
          access_justification?: string | null
          access_type?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          security_risk_level?: string
          sensitive_fields_accessed?: string[] | null
          session_details?: Json | null
          supplier_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suppliers_directory_safe: {
        Row: {
          company_name: string
          contact_status: string | null
          created_at: string | null
          id: string
          is_verified: boolean | null
          materials_offered: string[] | null
          rating: number | null
          specialties: string[] | null
          updated_at: string | null
        }
        Insert: {
          company_name: string
          contact_status?: string | null
          created_at?: string | null
          id: string
          is_verified?: boolean | null
          materials_offered?: string[] | null
          rating?: number | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          contact_status?: string | null
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          materials_offered?: string[] | null
          rating?: number | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tracking_updates: {
        Row: {
          created_at: string
          delivery_id: string | null
          id: string
          location: string | null
          notes: string | null
          status: string
        }
        Insert: {
          created_at?: string
          delivery_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          status: string
        }
        Update: {
          created_at?: string
          delivery_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_updates_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_name: string | null
          fingerprint_hash: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          fingerprint_hash: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_name?: string | null
          fingerprint_hash?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          supplier_id: string | null
          product_name: string
          product_image: string | null
          price: number
          quantity: number
          unit: string | null
          category: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          supplier_id?: string | null
          product_name: string
          product_image?: string | null
          price: number
          quantity?: number
          unit?: string | null
          category?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          supplier_id?: string | null
          product_name?: string
          product_image?: string | null
          price?: number
          quantity?: number
          unit?: string | null
          category?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          data: Json | null
          read: boolean | null
          read_at: string | null
          action_url: string | null
          action_label: string | null
          priority: string | null
          expires_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type?: string
          title: string
          message: string
          data?: Json | null
          read?: boolean | null
          read_at?: string | null
          action_url?: string | null
          action_label?: string | null
          priority?: string | null
          expires_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          data?: Json | null
          read?: boolean | null
          read_at?: string | null
          action_url?: string | null
          action_label?: string | null
          priority?: string | null
          expires_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      access_payment_vault_secure: {
        Args: { _payment_id: string }
        Returns: {
          access_granted: boolean
          email_encrypted: string
          phone_number_encrypted: string
        }[]
      }
      admin_review_contact_request_simple: {
        Args:
          | Record<PropertyKey, never>
          | { decision: string; notes?: string; request_uuid: string }
        Returns: undefined
      }
      approve_supplier_application: {
        Args: { application_id: string; approval_notes?: string }
        Returns: Json
      }
      builder_project_purchase_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          project_id: string
          order_count: number
          order_value_sum: number
        }[]
      }
      audit_supplier_select_attempts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      can_access_driver_contact: {
        Args: {
          delivery_record: Database["public"]["Tables"]["deliveries"]["Row"]
        }
        Returns: boolean
      }
      can_access_driver_info: {
        Args: {
          delivery_record: Database["public"]["Tables"]["deliveries"]["Row"]
        }
        Returns: boolean
      }
      can_access_grn: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      can_access_location_data: {
        Args: {
          delivery_record: Database["public"]["Tables"]["deliveries"]["Row"]
        }
        Returns: boolean
      }
      can_access_payment_info: {
        Args: {
          acknowledgement_record: Database["public"]["Tables"]["delivery_acknowledgements"]["Row"]
        }
        Returns: boolean
      }
      can_access_provider_contact: {
        Args: { provider_uuid: string }
        Returns: boolean
      }
      can_access_supplier_contact: {
        Args: { field_name: string; supplier_uuid: string }
        Returns: boolean
      }
      can_view_exact_coordinates: {
        Args: { request_id: string }
        Returns: boolean
      }
      check_provider_availability: {
        Args: { radius_km?: number; target_lat: number; target_lng: number }
        Returns: {
          can_contact: boolean
          distance_km: number
          is_available: boolean
          provider_id: string
          provider_name: string
        }[]
      }
      check_supplier_access_rate_limit: {
        Args: { target_supplier_id: string }
        Returns: boolean
      }
      cleanup_expired_business_relationships: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_provider_relationships: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_security_grants: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_verifications_manual: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_admin_only_policy: {
        Args: { table_name: string }
        Returns: undefined
      }
      create_missing_profiles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      detect_security_definer_views: {
        Args: Record<PropertyKey, never>
        Returns: {
          schema_name: string
          view_definition: string
          view_name: string
        }[]
      }
      drop_security_definer_views: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_taken: string
          view_dropped: string
        }[]
      }
      encrypt_payment_data_ultra_secure: {
        Args: { data_value: string; field_type: string }
        Returns: string
      }
      expire_old_contact_requests: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_access_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_material_qr_code: {
        Args: {
          _batch_number?: string
          _material_type: string
          _purchase_order_id?: string
          _quantity?: number
          _supplier_id?: string
          _unit?: string
        }
        Returns: string
      }
      get_builder_deliveries_safe: {
        Args: { builder_uuid: string }
        Returns: {
          actual_delivery_time: string
          created_at: string
          delivery_address: string
          delivery_date: string
          driver_display_message: string
          estimated_delivery_time: string
          has_driver_assigned: boolean
          id: string
          material_type: string
          notes: string
          pickup_address: string
          pickup_date: string
          quantity: number
          status: string
          tracking_number: string
          updated_at: string
          vehicle_details: string
          weight_kg: number
        }[]
      }
      get_business_profile_limited: {
        Args: { target_user_id: string }
        Returns: {
          company_name: string
          created_at: string
          id: string
          is_professional: boolean
          location: string
          rating: number
          role: string
          user_type: string
        }[]
      }
      get_camera_stream_access: {
        Args: { camera_uuid: string }
        Returns: {
          access_level: string
          access_message: string
          camera_id: string
          camera_name: string
          can_access_stream: boolean
          stream_url: string
        }[]
      }
      get_camera_stream_secure: {
        Args: { camera_uuid: string }
        Returns: {
          access_expires_at: string
          access_granted: boolean
          access_reason: string
          camera_id: string
          stream_url: string
        }[]
      }
      get_current_user_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role_secure: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_deliveries_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          actual_delivery_time: string
          builder_id: string
          created_at: string
          delivery_address: string
          delivery_date: string
          driver_name: string
          driver_phone: string
          estimated_delivery_time: string
          id: string
          material_type: string
          notes: string
          pickup_address: string
          pickup_date: string
          project_id: string
          quantity: number
          status: string
          supplier_id: string
          tracking_number: string
          updated_at: string
          vehicle_details: string
          weight_kg: number
        }[]
      }
      get_deliveries_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          actual_delivery_time: string
          builder_id: string
          can_access_driver_info: boolean
          created_at: string
          delivery_address: string
          delivery_date: string
          driver_status: string
          estimated_delivery_time: string
          id: string
          material_type: string
          notes: string
          pickup_address: string
          pickup_date: string
          project_id: string
          quantity: number
          status: string
          supplier_id: string
          tracking_number: string
          updated_at: string
          vehicle_details: string
          weight_kg: number
        }[]
      }
      get_deliveries_with_address_protection: {
        Args: Record<PropertyKey, never>
        Returns: {
          actual_delivery_time: string
          address_access_level: string
          builder_id: string
          created_at: string
          delivery_address: string
          delivery_date: string
          estimated_delivery_time: string
          id: string
          material_type: string
          notes: string
          pickup_address: string
          pickup_date: string
          project_id: string
          quantity: number
          status: string
          supplier_id: string
          tracking_number: string
          updated_at: string
          vehicle_details: string
          weight_kg: number
        }[]
      }
      get_delivery_address_secure: {
        Args: { address_type: string; delivery_uuid: string }
        Returns: {
          access_granted: boolean
          access_reason: string
          address: string
          delivery_id: string
        }[]
      }
      get_delivery_info_secure: {
        Args: { delivery_uuid: string }
        Returns: {
          actual_delivery_time: string
          builder_id: string
          can_view_driver_details: boolean
          created_at: string
          delivery_address: string
          delivery_date: string
          driver_contact_access_message: string
          driver_display_info: string
          estimated_delivery_time: string
          has_driver_assigned: boolean
          id: string
          material_type: string
          notes: string
          pickup_address: string
          pickup_date: string
          project_id: string
          quantity: number
          security_level: string
          status: string
          supplier_id: string
          tracking_number: string
          updated_at: string
          vehicle_details: string
          weight_kg: number
        }[]
      }
      get_delivery_location_masked: {
        Args: { delivery_uuid: string }
        Returns: {
          access_level: string
          approximate_latitude: number
          approximate_longitude: number
          delivery_id: string
          delivery_status: string
          last_update: string
          location_description: string
        }[]
      }
      get_delivery_provider_contact_secure: {
        Args: { provider_uuid: string }
        Returns: {
          access_granted: boolean
          access_reason: string
          address: string
          contact_person: string
          email: string
          id: string
          phone: string
          provider_name: string
        }[]
      }
      get_delivery_provider_contact_ultra_secure: {
        Args: { justification: string; provider_uuid: string }
        Returns: {
          access_granted: boolean
          decrypted_email: string
          decrypted_phone: string
          provider_id: string
          security_level: string
        }[]
      }
      get_delivery_provider_safe: {
        Args: { provider_uuid: string }
        Returns: {
          address_masked: string
          can_view_contact: boolean
          capacity_kg: number
          email_masked: string
          id: string
          is_active: boolean
          is_verified: boolean
          phone_masked: string
          provider_name: string
          provider_type: string
          rating: number
          security_message: string
          service_areas: string[]
          total_deliveries: number
          vehicle_types: string[]
        }[]
      }
      get_delivery_providers_admin_only: {
        Args: Record<PropertyKey, never>
        Returns: {
          capacity_kg: number
          contact_status: string
          created_at: string
          id: string
          is_active: boolean
          is_verified: boolean
          provider_name: string
          provider_type: string
          rating: number
          service_areas: string[]
          total_deliveries: number
          updated_at: string
          vehicle_types: string[]
        }[]
      }
      get_delivery_providers_directory_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          capacity_display: string
          contact_status: string
          id: string
          is_active: boolean
          is_verified: boolean
          provider_name: string
          provider_type: string
          rate_display: string
          rating: number
          service_areas: string[]
          total_deliveries: number
          vehicle_types: string[]
        }[]
      }
      get_delivery_providers_public_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          contact_status: string
          id: string
          is_active: boolean
          is_verified: boolean
          provider_name: string
          provider_type: string
          rating: number
          service_areas: string[]
          total_deliveries: number
          vehicle_types: string[]
        }[]
      }
      get_delivery_providers_safe_listing: {
        Args: Record<PropertyKey, never>
        Returns: {
          capacity_kg: number
          id: string
          is_active: boolean
          is_verified: boolean
          provider_name: string
          provider_type: string
          rating: number
          service_areas: string[]
          total_deliveries: number
          vehicle_types: string[]
        }[]
      }
      get_delivery_request_safe: {
        Args: { request_uuid: string }
        Returns: {
          budget_range: string
          builder_id: string
          can_view_addresses: boolean
          created_at: string
          delivery_address_masked: string
          id: string
          material_type: string
          pickup_address_masked: string
          pickup_date: string
          preferred_time: string
          provider_id: string
          provider_response: string
          quantity: number
          required_vehicle_type: string
          response_date: string
          response_notes: string
          security_message: string
          special_instructions: string
          status: string
          updated_at: string
          weight_kg: number
        }[]
      }
      get_delivery_requests_with_address_protection: {
        Args: Record<PropertyKey, never>
        Returns: {
          address_access_level: string
          budget_range: string
          builder_id: string
          created_at: string
          delivery_address: string
          id: string
          material_type: string
          pickup_address: string
          pickup_date: string
          provider_id: string
          quantity: number
          special_instructions: string
          status: string
          updated_at: string
          weight_kg: number
        }[]
      }
      get_delivery_safe: {
        Args: { delivery_uuid: string }
        Returns: {
          actual_delivery_time: string
          builder_id: string
          can_view_addresses: boolean
          created_at: string
          delivery_address_masked: string
          delivery_date: string
          estimated_delivery_time: string
          id: string
          material_type: string
          notes: string
          pickup_address_masked: string
          pickup_date: string
          project_id: string
          quantity: number
          security_message: string
          status: string
          supplier_id: string
          tracking_number: string
          updated_at: string
          vehicle_details: string
          weight_kg: number
        }[]
      }
      get_delivery_summaries: {
        Args: Record<PropertyKey, never>
        Returns: {
          actual_delivery_time: string
          builder_id: string
          created_at: string
          estimated_delivery_time: string
          general_delivery_area: string
          general_pickup_area: string
          has_driver_assigned: boolean
          id: string
          material_type: string
          project_id: string
          quantity: number
          status: string
          supplier_id: string
          tracking_number: string
          updated_at: string
          weight_kg: number
        }[]
      }
      get_delivery_tracking_public: {
        Args: { tracking_num: string }
        Returns: {
          delivery_address: string
          estimated_delivery: string
          last_update: string
          material_type: string
          pickup_address: string
          status: string
          tracking_number: string
        }[]
      }
      get_delivery_with_secure_driver_info: {
        Args: { delivery_uuid: string }
        Returns: {
          actual_delivery_time: string
          builder_id: string
          can_view_driver_contact: boolean
          created_at: string
          delivery_address: string
          delivery_date: string
          driver_contact_info: string
          driver_display_name: string
          estimated_delivery_time: string
          id: string
          material_type: string
          notes: string
          pickup_address: string
          pickup_date: string
          project_id: string
          quantity: number
          security_message: string
          status: string
          supplier_id: string
          tracking_number: string
          updated_at: string
          vehicle_details: string
          weight_kg: number
        }[]
      }
      get_delivery_with_ultra_secure_driver_info: {
        Args: { delivery_uuid: string }
        Returns: {
          actual_delivery_time: string
          builder_id: string
          can_view_driver_contact: boolean
          created_at: string
          delivery_address: string
          delivery_date: string
          driver_contact_info: string
          driver_display_name: string
          estimated_delivery_time: string
          id: string
          material_type: string
          notes: string
          pickup_address: string
          pickup_date: string
          project_id: string
          quantity: number
          security_message: string
          status: string
          supplier_id: string
          tracking_number: string
          updated_at: string
          vehicle_details: string
          weight_kg: number
        }[]
      }
      get_driver_contact_secure: {
        Args:
          | { access_justification: string; delivery_uuid: string }
          | { delivery_uuid: string }
        Returns: {
          access_granted: boolean
          access_level: string
          delivery_id: string
          driver_name: string
          driver_phone: string
          security_message: string
        }[]
      }
      get_my_monitoring_service_requests: {
        Args: Record<PropertyKey, never>
        Returns: Record<string, unknown>[]
      }
      get_my_provider_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string
          availability_schedule: Json
          capacity_kg: number
          created_at: string
          driving_license_class: string
          driving_license_document_path: string
          driving_license_expiry: string
          driving_license_number: string
          driving_license_verified: boolean
          email: string
          hourly_rate: number
          id: string
          is_active: boolean
          is_verified: boolean
          per_km_rate: number
          phone: string
          provider_name: string
          provider_type: string
          rating: number
          service_areas: string[]
          total_deliveries: number
          updated_at: string
          vehicle_types: string[]
        }[]
      }
      get_own_supplier_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string
          company_name: string
          contact_person: string
          created_at: string
          email: string
          id: string
          is_verified: boolean
          materials_offered: string[]
          phone: string
          rating: number
          specialties: string[]
          updated_at: string
        }[]
      }
      get_payment_contact_secure: {
        Args:
          | { access_justification?: string; target_payment_id: string }
          | { payment_uuid: string }
        Returns: {
          access_granted: boolean
          access_reason: string
          id: string
          phone_number: string
        }[]
      }
      get_payment_preferences_secure: {
        Args: { user_uuid: string }
        Returns: {
          created_at: string
          has_encrypted_details: boolean
          id: string
          is_default: boolean
          payment_method: string
          user_id: string
        }[]
      }
      get_payment_secure: {
        Args: { payment_uuid: string }
        Returns: {
          amount: number
          created_at: string
          currency: string
          description: string
          id: string
          phone_number_masked: string
          provider: string
          provider_response_summary: Json
          reference: string
          status: string
          transaction_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_payment_vault_secure: {
        Args: { _payment_id: string }
        Returns: {
          access_granted: boolean
          email_encrypted: string
          id: string
          phone_number_encrypted: string
        }[]
      }
      get_profile_business_essential_only: {
        Args: { target_user_uuid: string }
        Returns: {
          business_display_name: string
          business_verification_status: string
          contact_status: string
          id: string
          is_professional: boolean
          role_display: string
          user_type: string
        }[]
      }
      get_profile_masked_safe: {
        Args: { target_user_uuid: string }
        Returns: {
          account_type: string
          contact_available: boolean
          display_name: string
          id: string
          is_business_account: boolean
          public_role: string
          verification_status: string
        }[]
      }
      get_profile_phone_secure: {
        Args: { profile_uuid: string }
        Returns: {
          access_granted: boolean
          access_reason: string
          contact_info: string
          profile_id: string
        }[]
      }
      get_profile_phone_vault: {
        Args: { target_profile_id: string }
        Returns: {
          access_granted: boolean
          access_reason: string
          phone_number: string
          profile_id: string
        }[]
      }
      get_profile_with_consent: {
        Args: { target_profile_id: string }
        Returns: {
          access_level: string
          company_name: string
          consent_status: string
          email: string
          full_name: string
          id: string
          location: string
          phone_number: string
          role: string
        }[]
      }
      get_profiles_business_directory: {
        Args: Record<PropertyKey, never>
        Returns: {
          company_name: string
          created_at: string
          full_name: string
          id: string
          is_professional: boolean
          role: string
          user_type: string
        }[]
      }
      get_profiles_safe_for_joins: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          company_logo_url: string
          company_name: string
          created_at: string
          full_name: string
          id: string
          is_professional: boolean
          updated_at: string
          user_id: string
          user_type: string
        }[]
      }
      get_project_safe: {
        Args: { project_uuid: string }
        Returns: {
          access_code: string
          access_level: string
          description: string
          id: string
          location: string
          name: string
          status: string
        }[]
      }
      get_provider_contact_for_delivery: {
        Args: { delivery_request_uuid: string }
        Returns: {
          can_contact: boolean
          phone: string
          provider_name: string
        }[]
      }
      get_provider_location_anonymized: {
        Args: { provider_uuid: string }
        Returns: {
          availability_status: string
          is_recently_active: boolean
          last_seen_approximate: string
          location_region: string
          provider_id: string
        }[]
      }
      get_provider_rotation_queue: {
        Args: {
          _max_providers?: number
          _pickup_lat: number
          _pickup_lng: number
          _request_id: string
        }
        Returns: {
          distance_km: number
          priority_score: number
          provider_id: string
          provider_name: string
          rating: number
        }[]
      }
      get_provider_safe_individual: {
        Args: { provider_uuid: string }
        Returns: {
          can_view_contact: boolean
          contact_method: string
          id: string
          is_active: boolean
          is_verified: boolean
          provider_name: string
          provider_type: string
          rating: number
          security_message: string
          service_areas: string[]
          total_deliveries: number
          vehicle_types: string[]
        }[]
      }
      get_provider_ultra_secure: {
        Args: { provider_uuid: string }
        Returns: {
          can_view_contact: boolean
          contact_method: string
          id: string
          is_active: boolean
          is_verified: boolean
          provider_name: string
          provider_type: string
          rating: number
          security_message: string
          service_areas: string[]
          total_deliveries: number
          vehicle_types: string[]
        }[]
      }
      get_providers_directory_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          can_contact: boolean
          capacity_display: string
          contact_status: string
          id: string
          is_active: boolean
          is_verified: boolean
          provider_name: string
          provider_type: string
          rating: number
          service_areas: string[]
          total_deliveries: number
          vehicle_types: string[]
        }[]
      }
      get_providers_directory_ultra_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          can_contact: boolean
          capacity_display: string
          contact_status: string
          id: string
          is_active: boolean
          is_verified: boolean
          provider_name: string
          provider_type: string
          rating: number
          service_areas: string[]
          total_deliveries: number
          vehicle_types: string[]
        }[]
      }
      get_providers_for_active_delivery_only: {
        Args: Record<PropertyKey, never>
        Returns: {
          contact_status: string
          id: string
          is_verified: boolean
          provider_name: string
          rating: number
          service_areas: string[]
          total_deliveries: number
          vehicle_types: string[]
        }[]
      }
      get_quotation_requests_with_address_protection: {
        Args: Record<PropertyKey, never>
        Returns: {
          address_access_level: string
          created_at: string
          delivery_address: string
          id: string
          material_name: string
          preferred_delivery_date: string
          project_description: string
          quantity: number
          quote_amount: number
          quote_valid_until: string
          requester_id: string
          special_requirements: string
          status: string
          supplier_id: string
          supplier_notes: string
          unit: string
          updated_at: string
        }[]
      }
      get_safe_camera_directory: {
        Args: Record<PropertyKey, never>
        Returns: {
          access_requirements: string
          can_request_access: boolean
          general_location: string
          id: string
          is_active: boolean
          name: string
          project_id: string
        }[]
      }
      get_safe_delivery_listings: {
        Args: Record<PropertyKey, never>
        Returns: {
          builder_id: string
          created_at: string
          delivery_date: string
          estimated_delivery_time: string
          general_location: string
          has_driver_assigned: boolean
          id: string
          material_type: string
          pickup_date: string
          quantity: number
          status: string
          supplier_id: string
          tracking_number: string
        }[]
      }
      get_scan_statistics: {
        Args: {
          _end_date?: string
          _start_date?: string
          _supplier_id?: string
        }
        Returns: {
          avg_dispatch_to_receive_hours: number
          damaged_items: number
          dispatch_scans: number
          dispatched_items: number
          pending_items: number
          received_items: number
          receiving_scans: number
          total_items: number
          total_scans: number
          verification_scans: number
          verified_items: number
        }[]
      }
      get_secure_acknowledgement: {
        Args: { acknowledgement_uuid: string }
        Returns: {
          acknowledged_by: string
          acknowledgement_date: string
          acknowledger_id: string
          can_view_payment: boolean
          comments: string
          created_at: string
          delivery_note_id: string
          digital_signature: string
          id: string
          payment_method: string
          payment_reference: string
          payment_status: string
          signed_document_path: string
          updated_at: string
        }[]
      }
      get_secure_camera_info: {
        Args: { camera_uuid: string }
        Returns: {
          can_view_stream: boolean
          created_at: string
          general_location: string
          id: string
          is_active: boolean
          location: string
          name: string
          project_id: string
          stream_access_message: string
          updated_at: string
        }[]
      }
      get_secure_camera_stream: {
        Args: { camera_uuid: string }
        Returns: {
          access_message: string
          camera_id: string
          camera_name: string
          can_access: boolean
          stream_url: string
        }[]
      }
      get_secure_delivery: {
        Args: { delivery_uuid: string }
        Returns: {
          actual_delivery_time: string
          builder_id: string
          can_view_driver_contact: boolean
          can_view_locations: boolean
          created_at: string
          delivery_address: string
          delivery_date: string
          driver_name: string
          driver_phone: string
          estimated_delivery_time: string
          id: string
          material_type: string
          notes: string
          pickup_address: string
          pickup_date: string
          project_id: string
          quantity: number
          status: string
          supplier_id: string
          tracking_number: string
          updated_at: string
          vehicle_details: string
          weight_kg: number
        }[]
      }
      get_secure_delivery_info: {
        Args: { delivery_uuid: string }
        Returns: {
          actual_delivery_time: string
          builder_id: string
          can_view_driver_contact: boolean
          created_at: string
          delivery_address: string
          delivery_date: string
          driver_contact_info: string
          driver_display_name: string
          estimated_delivery_time: string
          id: string
          material_type: string
          notes: string
          pickup_address: string
          pickup_date: string
          project_id: string
          quantity: number
          security_message: string
          status: string
          supplier_id: string
          tracking_number: string
          updated_at: string
          vehicle_details: string
          weight_kg: number
        }[]
      }
      get_secure_delivery_listings: {
        Args: Record<PropertyKey, never>
        Returns: {
          builder_id: string
          can_request_driver_contact: boolean
          created_at: string
          delivery_date: string
          estimated_delivery_time: string
          general_location: string
          has_driver_assigned: boolean
          id: string
          material_type: string
          pickup_date: string
          quantity: number
          status: string
          supplier_id: string
          tracking_number: string
        }[]
      }
      get_secure_delivery_request: {
        Args: { request_uuid: string }
        Returns: {
          budget_range: string
          builder_id: string
          can_view_addresses: boolean
          created_at: string
          delivery_address: string
          delivery_latitude: number
          delivery_longitude: number
          id: string
          material_type: string
          pickup_address: string
          pickup_date: string
          pickup_latitude: number
          pickup_longitude: number
          preferred_time: string
          provider_id: string
          provider_response: string
          quantity: number
          required_vehicle_type: string
          response_date: string
          response_notes: string
          special_instructions: string
          status: string
          updated_at: string
          weight_kg: number
        }[]
      }
      get_secure_driver_contact: {
        Args:
          | { delivery_uuid: string }
          | { delivery_uuid: string; requested_field?: string }
        Returns: {
          access_level: string
          can_access_contact: boolean
          delivery_id: string
          driver_email: string
          driver_name: string
          driver_phone: string
          security_message: string
        }[]
      }
      get_secure_location_data: {
        Args: {
          record_id: string
          requested_precision?: string
          table_name: string
        }
        Returns: {
          access_level: string
          can_access_precise: boolean
          id: string
          last_update: string
          latitude: number
          location_type: string
          longitude: number
          security_message: string
        }[]
      }
      get_secure_profile_info: {
        Args: { profile_uuid: string }
        Returns: {
          business_license: string
          can_view_contact: boolean
          company_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_professional: boolean
          phone: string
          role: string
          security_message: string
          user_id: string
          user_type: string
        }[]
      }
      get_secure_provider_contact: {
        Args: { provider_uuid: string }
        Returns: {
          can_view_contact: boolean
          capacity_kg: number
          contact_available_message: string
          id: string
          is_active: boolean
          is_verified: boolean
          masked_phone: string
          provider_name: string
          provider_type: string
          rating: number
          service_areas: string[]
          total_deliveries: number
          vehicle_types: string[]
        }[]
      }
      get_secure_provider_info: {
        Args: { provider_uuid: string }
        Returns: {
          address: string
          can_view_contact: boolean
          capacity_kg: number
          email: string
          hourly_rate: number
          id: string
          is_active: boolean
          is_verified: boolean
          per_km_rate: number
          phone: string
          provider_name: string
          provider_type: string
          rating: number
          service_areas: string[]
          total_deliveries: number
          vehicle_types: string[]
        }[]
      }
      get_secure_purchase_order: {
        Args: { order_uuid: string }
        Returns: {
          buyer_id: string
          can_view_address: boolean
          created_at: string
          delivery_address: string
          delivery_date: string
          id: string
          items: Json
          payment_terms: string
          po_number: string
          qr_code_generated: boolean
          qr_code_url: string
          quotation_request_id: string
          special_instructions: string
          status: string
          supplier_id: string
          total_amount: number
          updated_at: string
        }[]
      }
      get_supplier_contact_secure: {
        Args:
          | { requested_field?: string; supplier_uuid: string }
          | { supplier_uuid: string }
        Returns: {
          access_granted: boolean
          access_reason: string
          address: string
          company_name: string
          contact_person: string
          email: string
          id: string
          phone: string
        }[]
      }
      get_supplier_contact_ultra_secure: {
        Args: { access_justification?: string; supplier_uuid: string }
        Returns: {
          access_granted: boolean
          access_reason: string
          address: string
          business_relationship_verified: boolean
          company_name: string
          contact_person: string
          email: string
          id: string
          phone: string
        }[]
      }
      get_supplier_contact_verified: {
        Args: { supplier_uuid: string }
        Returns: {
          access_granted: boolean
          access_reason: string
          address: string
          company_name: string
          contact_person: string
          email: string
          id: string
          phone: string
        }[]
      }
      get_supplier_contact_with_approval: {
        Args: { target_supplier_id: string }
        Returns: {
          access_granted: boolean
          access_reason: string
          address: string
          company_name: string
          contact_person: string
          email: string
          id: string
          phone: string
        }[]
      }
      get_supplier_contact_with_business_validation: {
        Args:
          | {
              business_evidence?: Json
              request_justification?: string
              supplier_uuid: string
            }
          | { requested_field?: string; supplier_uuid: string }
        Returns: {
          access_granted: boolean
          access_reason: string
          address: string
          business_relationship_verified: boolean
          company_name: string
          contact_person: string
          email: string
          id: string
          phone: string
        }[]
      }
      get_supplier_public_info: {
        Args: { supplier_uuid: string }
        Returns: {
          company_name: string
          id: string
          is_verified: boolean
          materials_offered: string[]
          rating: number
          specialties: string[]
        }[]
      }
      get_supplier_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_rating: number
          total_suppliers: number
          verified_suppliers: number
        }[]
      }
      get_suppliers_directory_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          company_name: string
          created_at: string
          id: string
          is_verified: boolean
          materials_offered: string[]
          rating: number
          specialties: string[]
          updated_at: string
        }[]
      }
      get_suppliers_public_directory: {
        Args: Record<PropertyKey, never>
        Returns: {
          company_name: string
          created_at: string
          id: string
          is_verified: boolean
          materials_offered: string[]
          rating: number
          specialties: string[]
        }[]
      }
      get_suppliers_public_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          company_name: string
          contact_status: string
          created_at: string
          id: string
          is_verified: boolean
          materials_offered: string[]
          rating: number
          specialties: string[]
          updated_at: string
        }[]
      }
      get_ultra_secure_provider_contact: {
        Args: { provider_uuid: string; requested_field?: string }
        Returns: {
          access_restrictions: string
          can_access_contact: boolean
          capacity_kg: number
          contact_field_access: string
          email_address: string
          id: string
          is_active: boolean
          is_verified: boolean
          phone_number: string
          physical_address: string
          provider_name: string
          provider_type: string
          rating: number
          security_message: string
          service_areas: string[]
          total_deliveries: number
          vehicle_types: string[]
        }[]
      }
      get_user_deliveries: {
        Args: Record<PropertyKey, never>
        Returns: {
          actual_delivery_time: string
          builder_id: string
          can_view_driver_contact: boolean
          can_view_locations: boolean
          created_at: string
          delivery_address: string
          delivery_date: string
          driver_name: string
          driver_phone: string
          estimated_delivery_time: string
          id: string
          material_type: string
          notes: string
          pickup_address: string
          pickup_date: string
          project_id: string
          quantity: number
          status: string
          supplier_id: string
          tracking_number: string
          updated_at: string
          vehicle_details: string
          weight_kg: number
        }[]
      }
      get_user_display_role: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_user_payment_history: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount: number
          created_at: string
          currency: string
          description: string
          id: string
          phone_number_masked: string
          provider: string
          reference: string
          status: string
          transaction_id_masked: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: string
      }
      handle_provider_rejection: {
        Args: { _provider_id: string; _request_id: string }
        Returns: boolean
      }
      has_active_business_relationship: {
        Args: { target_supplier_id: string }
        Returns: boolean
      }
      has_active_delivery_relationship: {
        Args: { delivery_uuid: string }
        Returns: boolean
      }
      has_active_provider_relationship: {
        Args: { target_provider_user_id: string }
        Returns: boolean
      }
      has_legitimate_business_relationship: {
        Args: { target_supplier_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_enum: {
        Args:
          | { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }
          | { _role: string; _user_id: string }
        Returns: boolean
      }
      has_supplier_business_relationship: {
        Args: { supplier_uuid: string }
        Returns: boolean
      }
      has_supplier_contact_consent: {
        Args: { _consent_type?: string; _supplier_id: string }
        Returns: boolean
      }
      has_verified_business_relationship: {
        Args: { _profile_id: string }
        Returns: boolean
      }
      has_verified_business_relationship_with_profile: {
        Args: { target_profile_id: string }
        Returns: boolean
      }
      has_verified_supplier_business_access: {
        Args: { supplier_uuid: string }
        Returns: boolean
      }
      has_verified_supplier_relationship: {
        Args: { supplier_uuid: string }
        Returns: boolean
      }
      insert_payment_with_contact: {
        Args: {
          p_amount: number
          p_currency: string
          p_description: string
          p_phone_number: string
          p_provider: string
          p_provider_response: Json
          p_reference: string
          p_status: string
          p_transaction_id: string
          p_user_id: string
        }
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_user_secure: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authorized_for_delivery: {
        Args: { delivery_uuid: string }
        Returns: boolean
      }
      is_builder: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_camera_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_camera_builder: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_builder: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_delivery_communication_participant: {
        Args: { sender_id_param: string; sender_type_param: string }
        Returns: boolean
      }
      is_feedback_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_own_supplier_record: {
        Args: { supplier_user_id: string }
        Returns: boolean
      }
      is_supplier_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_delivery_access: {
        Args: {
          action_param: string
          fields_param?: string[]
          resource_id_param?: string
          resource_type_param: string
        }
        Returns: undefined
      }
      log_driver_info_access: {
        Args: { access_type_param: string; delivery_uuid: string }
        Returns: undefined
      }
      log_location_data_access: {
        Args: {
          access_type_param: string
          delivery_uuid: string
          fields_accessed?: string[]
        }
        Returns: undefined
      }
      log_payment_access: {
        Args: {
          _access_granted: boolean
          _accessed_fields: string[]
          _payment_id: string
          _transaction_type: string
        }
        Returns: undefined
      }
      log_payment_info_access: {
        Args: {
          access_type_param: string
          acknowledgement_uuid: string
          fields_accessed?: string[]
        }
        Returns: undefined
      }
      log_payment_transaction_access: {
        Args: {
          _access_granted: boolean
          _accessed_fields: string[]
          _denial_reason?: string
          _payment_id: string
          _transaction_type: string
        }
        Returns: undefined
      }
      log_profile_access: {
        Args: { access_type_param: string; viewed_profile_uuid: string }
        Returns: undefined
      }
      log_provider_access: {
        Args: {
          access_type_param: string
          fields_accessed?: string[]
          justification?: string
          provider_uuid: string
        }
        Returns: undefined
      }
      log_provider_access_and_detect_harvesting: {
        Args: { access_type?: string; provider_uuid: string }
        Returns: boolean
      }
      log_provider_business_access_and_authorize: {
        Args: { access_type_param: string; provider_uuid: string }
        Returns: boolean
      }
      log_provider_sensitive_access: {
        Args: {
          access_granted: boolean
          field_name: string
          justification?: string
          provider_uuid: string
        }
        Returns: undefined
      }
      log_role_check_attempt: {
        Args: { function_name: string; is_authorized: boolean }
        Returns: undefined
      }
      mask_delivery_address: {
        Args: {
          full_address: string
          is_admin: boolean
          is_requester: boolean
          quotation_status: string
        }
        Returns: string
      }
      mask_sensitive_data_by_role: {
        Args: {
          accessing_role: string
          data_owner_role: string
          sensitive_data: string
        }
        Returns: string
      }
      notify_nearby_delivery_providers: {
        Args: {
          _delivery_lat: number
          _delivery_lng: number
          _notification_id: string
          _pickup_lat: number
          _pickup_lng: number
          _radius_km?: number
        }
        Returns: {
          distance_km: number
          provider_id: string
        }[]
      }
      record_qr_scan: {
        Args: {
          _material_condition?: string
          _notes?: string
          _photo_url?: string
          _qr_code: string
          _quantity_scanned?: number
          _scan_location?: Json
          _scan_type: string
          _scanner_device_id?: string
          _scanner_type?: string
        }
        Returns: Json
      }
      reject_supplier_application: {
        Args: { application_id: string; rejection_reason_text: string }
        Returns: Json
      }
      request_provider_contact_secure: {
        Args: { provider_uuid: string; request_reason?: string }
        Returns: {
          business_justification: string
          can_contact: boolean
          contact_method: string
          provider_id: string
          provider_name: string
          security_notice: string
        }[]
      }
      request_supplier_contact_access: {
        Args: { reason: string; target_supplier_id: string }
        Returns: Json
      }
      setup_provider_rotation_queue: {
        Args: { _request_id: string }
        Returns: number
      }
      update_qr_status: {
        Args: { _new_status: string; _qr_code: string }
        Returns: boolean
      }
      validate_delivery_access_authorization: {
        Args: { delivery_uuid: string }
        Returns: boolean
      }
      validate_rls_policy_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          has_conflicting_policies: boolean
          policy_count: number
          security_status: string
          table_name: string
        }[]
      }
      verify_active_delivery_access: {
        Args: { target_provider_id: string }
        Returns: boolean
      }
      verify_admin_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      verify_business_relationship: {
        Args: { relationship_evidence?: Json; target_supplier_id: string }
        Returns: Json
      }
      verify_business_relationship_strict: {
        Args: {
          requested_access_level?: string
          target_supplier_id: string
          verification_evidence?: Json
        }
        Returns: Json
      }
      verify_legitimate_business_access: {
        Args: { target_record_id: string; target_table: string }
        Returns: boolean
      }
      verify_profile_access_anti_fraud: {
        Args: { target_profile_id: string }
        Returns: {
          access_level: string
          can_access: boolean
          contact_masked: boolean
          security_message: string
        }[]
      }
      verify_profile_access_secure: {
        Args: { target_profile_id: string }
        Returns: {
          access_granted: boolean
          access_level: string
          data_protection_active: boolean
          security_message: string
        }[]
      }
      verify_security_lockdown: {
        Args: Record<PropertyKey, never>
        Returns: {
          admin_only_secured: boolean
          rls_enabled: boolean
          security_status: string
          table_name: string
        }[]
      }
      verify_security_model: {
        Args: Record<PropertyKey, never>
        Returns: {
          component: string
          description: string
          status: string
        }[]
      }
      verify_supplier_business_relationship: {
        Args:
          | { relationship_evidence?: Json; supplier_uuid: string }
          | { supplier_uuid: string }
        Returns: Json
      }
      verify_supplier_self_access: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      upsert_cart_item: {
        Args: {
          p_product_id: string
          p_product_name: string
          p_price: number
          p_quantity?: number
          p_supplier_id?: string | null
          p_product_image?: string | null
          p_unit?: string
          p_category?: string | null
          p_notes?: string | null
        }
        Returns: string
      }
      get_cart_total: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_items: number
          total_quantity: number
          total_price: number
        }[]
      }
      clear_cart: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_user_id: string
          p_type: string
          p_title: string
          p_message: string
          p_data?: Json
          p_action_url?: string | null
          p_action_label?: string | null
          p_priority?: string
          p_expires_at?: string | null
        }
        Returns: string
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      mark_all_notifications_read: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_unread_notification_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_recent_notifications: {
        Args: {
          p_limit?: number
          p_unread_only?: boolean
        }
        Returns: {
          id: string
          type: string
          title: string
          message: string
          data: Json
          read: boolean
          action_url: string | null
          action_label: string | null
          priority: string
          created_at: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "builder" | "supplier" | "delivery_provider"
      builder_category: "professional" | "private"
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
      app_role: ["admin", "builder", "supplier", "delivery_provider"],
    },
  },
} as const
