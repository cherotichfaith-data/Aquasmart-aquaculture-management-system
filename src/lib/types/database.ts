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
      _affected_systems: {
        Row: {
          created_at: string
          min_affected_date: string
          system_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          min_affected_date: string
          system_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          min_affected_date?: string
          system_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "_affected_systems_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: true
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_threshold: {
        Row: {
          created_at: string | null
          critical_survival_pct: number | null
          farm_id: string | null
          high_ammonia_threshold: number | null
          high_mortality_threshold: number | null
          id: string
          low_do_threshold: number | null
          low_sgr_threshold: number | null
          low_survival_pct: number | null
          scope: string
          system_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          critical_survival_pct?: number | null
          farm_id?: string | null
          high_ammonia_threshold?: number | null
          high_mortality_threshold?: number | null
          id?: string
          low_do_threshold?: number | null
          low_sgr_threshold?: number | null
          low_survival_pct?: number | null
          scope: string
          system_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          critical_survival_pct?: number | null
          farm_id?: string | null
          high_ammonia_threshold?: number | null
          high_mortality_threshold?: number | null
          id?: string
          low_do_threshold?: number | null
          low_sgr_threshold?: number | null
          low_survival_pct?: number | null
          scope?: string
          system_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_threshold_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_threshold_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      daily_water_quality_rating: {
        Row: {
          created_at: string
          id: number
          rating: Database["public"]["Enums"]["water_quality_rating"]
          rating_date: string
          rating_numeric: number | null
          system_id: number
          worst_parameter:
            | Database["public"]["Enums"]["water_quality_parameters"]
            | null
          worst_parameter_unit: string | null
          worst_parameter_value: number | null
        }
        Insert: {
          created_at?: string
          id?: never
          rating: Database["public"]["Enums"]["water_quality_rating"]
          rating_date: string
          rating_numeric?: number | null
          system_id: number
          worst_parameter?:
            | Database["public"]["Enums"]["water_quality_parameters"]
            | null
          worst_parameter_unit?: string | null
          worst_parameter_value?: number | null
        }
        Update: {
          created_at?: string
          id?: never
          rating?: Database["public"]["Enums"]["water_quality_rating"]
          rating_date?: string
          rating_numeric?: number | null
          system_id?: number
          worst_parameter?:
            | Database["public"]["Enums"]["water_quality_parameters"]
            | null
          worst_parameter_unit?: string | null
          worst_parameter_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_water_quality_rating_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_time_period: {
        Row: {
          days_since_start: number
          time_period: Database["public"]["Enums"]["time_period"]
        }
        Insert: {
          days_since_start: number
          time_period: Database["public"]["Enums"]["time_period"]
        }
        Update: {
          days_since_start?: number
          time_period?: Database["public"]["Enums"]["time_period"]
        }
        Relationships: []
      }
      energy_alarm_events: {
        Row: {
          acknowledged_at: string | null
          alarm_code: string
          alarm_name: string | null
          created_at: string
          ended_at: string | null
          farm_id: string
          id: number
          message: string | null
          meter_id: string | null
          payload: Json
          resolved_at: string | null
          severity: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          alarm_code: string
          alarm_name?: string | null
          created_at?: string
          ended_at?: string | null
          farm_id: string
          id?: number
          message?: string | null
          meter_id?: string | null
          payload?: Json
          resolved_at?: string | null
          severity?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          alarm_code?: string
          alarm_name?: string | null
          created_at?: string
          ended_at?: string | null
          farm_id?: string
          id?: number
          message?: string | null
          meter_id?: string | null
          payload?: Json
          resolved_at?: string | null
          severity?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "energy_alarm_events_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_meter_timeseries: {
        Row: {
          active_power_kw: number | null
          apparent_power_kva: number | null
          created_at: string
          current_l1_a: number | null
          current_l2_a: number | null
          current_l3_a: number | null
          energy_export_kwh: number | null
          energy_import_kwh: number | null
          farm_id: string
          frequency_hz: number | null
          id: number
          measured_at: string
          meter_id: string
          payload: Json
          power_factor: number | null
          reactive_power_kvar: number | null
          updated_at: string
          voltage_l1_v: number | null
          voltage_l2_v: number | null
          voltage_l3_v: number | null
        }
        Insert: {
          active_power_kw?: number | null
          apparent_power_kva?: number | null
          created_at?: string
          current_l1_a?: number | null
          current_l2_a?: number | null
          current_l3_a?: number | null
          energy_export_kwh?: number | null
          energy_import_kwh?: number | null
          farm_id: string
          frequency_hz?: number | null
          id?: number
          measured_at: string
          meter_id: string
          payload?: Json
          power_factor?: number | null
          reactive_power_kvar?: number | null
          updated_at?: string
          voltage_l1_v?: number | null
          voltage_l2_v?: number | null
          voltage_l3_v?: number | null
        }
        Update: {
          active_power_kw?: number | null
          apparent_power_kva?: number | null
          created_at?: string
          current_l1_a?: number | null
          current_l2_a?: number | null
          current_l3_a?: number | null
          energy_export_kwh?: number | null
          energy_import_kwh?: number | null
          farm_id?: string
          frequency_hz?: number | null
          id?: number
          measured_at?: string
          meter_id?: string
          payload?: Json
          power_factor?: number | null
          reactive_power_kvar?: number | null
          updated_at?: string
          voltage_l1_v?: number | null
          voltage_l2_v?: number | null
          voltage_l3_v?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "energy_meter_timeseries_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
        ]
      }
      farm: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farm_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_user: {
        Row: {
          created_at: string | null
          farm_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          farm_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          farm_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_user_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_inventory: {
        Row: {
          amount_of_bags: number | null
          bag_weight: number | null
          comments: string | null
          created_at: string
          farm_id: string
          feed_type_id: number
          feed_type_label: string
          id: number
          inventory_date: string
          inventory_time: string | null
          opened_bags: number | null
        }
        Insert: {
          amount_of_bags?: number | null
          bag_weight?: number | null
          comments?: string | null
          created_at?: string
          farm_id: string
          feed_type_id: number
          feed_type_label: string
          id?: number
          inventory_date: string
          inventory_time?: string | null
          opened_bags?: number | null
        }
        Update: {
          amount_of_bags?: number | null
          bag_weight?: number | null
          comments?: string | null
          created_at?: string
          farm_id?: string
          feed_type_id?: number
          feed_type_label?: string
          id?: number
          inventory_date?: string
          inventory_time?: string | null
          opened_bags?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_inventory_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_inventory_feed_type_id_fkey"
            columns: ["feed_type_id"]
            isOneToOne: false
            referencedRelation: "feed_type"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_supplier: {
        Row: {
          company_name: string
          created_at: string
          id: number
          location_city: string | null
          location_country: string
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: number
          location_city?: string | null
          location_country: string
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: number
          location_city?: string | null
          location_country?: string
        }
        Relationships: []
      }
      feed_type: {
        Row: {
          created_at: string
          crude_fat_percentage: number | null
          crude_protein_percentage: number | null
          farm_id: string | null
          feed_category: Database["public"]["Enums"]["feed_category"]
          feed_line: string | null
          feed_pellet_size: Database["public"]["Enums"]["feed_pellet_size"]
          feed_supplier: number
          id: number
          is_active: boolean
        }
        Insert: {
          created_at?: string
          crude_fat_percentage?: number | null
          crude_protein_percentage?: number | null
          farm_id?: string | null
          feed_category: Database["public"]["Enums"]["feed_category"]
          feed_line?: string | null
          feed_pellet_size: Database["public"]["Enums"]["feed_pellet_size"]
          feed_supplier: number
          id?: number
          is_active?: boolean
        }
        Update: {
          created_at?: string
          crude_fat_percentage?: number | null
          crude_protein_percentage?: number | null
          farm_id?: string | null
          feed_category?: Database["public"]["Enums"]["feed_category"]
          feed_line?: string | null
          feed_pellet_size?: Database["public"]["Enums"]["feed_pellet_size"]
          feed_supplier?: number
          id?: number
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "feed_type_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_type_feed_supplier_fkey"
            columns: ["feed_supplier"]
            isOneToOne: false
            referencedRelation: "feed_supplier"
            referencedColumns: ["id"]
          },
        ]
      }
      feeding_record: {
        Row: {
          batch_id: number | null
          created_at: string
          cycle_id: number | null
          date: string
          feed_type_id: number | null
          feeding_amount: number
          feeding_response: number | null
          id: number
          local_id: string | null
          notes: string | null
          synced_at: string | null
          system_id: number
        }
        Insert: {
          batch_id?: number | null
          created_at?: string
          cycle_id?: number | null
          date: string
          feed_type_id?: number | null
          feeding_amount: number
          feeding_response?: number | null
          id?: number
          local_id?: string | null
          notes?: string | null
          synced_at?: string | null
          system_id: number
        }
        Update: {
          batch_id?: number | null
          created_at?: string
          cycle_id?: number | null
          date?: string
          feed_type_id?: number | null
          feeding_amount?: number
          feeding_response?: number | null
          id?: number
          local_id?: string | null
          notes?: string | null
          synced_at?: string | null
          system_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "feed_record_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feeding_record_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "fingerling_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feeding_record_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycle"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "feeding_record_feed_id_fkey"
            columns: ["feed_type_id"]
            isOneToOne: false
            referencedRelation: "feed_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feeding_response_level"
            columns: ["feeding_response"]
            isOneToOne: false
            referencedRelation: "feeding_response_level"
            referencedColumns: ["level"]
          },
        ]
      }
      feeding_response_level: {
        Row: {
          action_guideline: string
          after_10_min: string | null
          after_3_hours: string | null
          immediate_response: string
          label: string
          level: number
        }
        Insert: {
          action_guideline: string
          after_10_min?: string | null
          after_3_hours?: string | null
          immediate_response: string
          label: string
          level: number
        }
        Update: {
          action_guideline?: string
          after_10_min?: string | null
          after_3_hours?: string | null
          immediate_response?: string
          label?: string
          level?: number
        }
        Relationships: []
      }
      fingerling_batch: {
        Row: {
          abw: number | null
          created_at: string
          date_of_delivery: string
          farm_id: string | null
          id: number
          name: string
          number_of_fish: number | null
          supplier_id: number
          system_id: number | null
        }
        Insert: {
          abw?: number | null
          created_at?: string
          date_of_delivery: string
          farm_id?: string | null
          id?: number
          name: string
          number_of_fish?: number | null
          supplier_id: number
          system_id?: number | null
        }
        Update: {
          abw?: number | null
          created_at?: string
          date_of_delivery?: string
          farm_id?: string | null
          id?: number
          name?: string
          number_of_fish?: number | null
          supplier_id?: number
          system_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fingerling_batch_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fingerling_batch_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "fingerling_supplier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fingerling_batch_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      fingerling_supplier: {
        Row: {
          company_name: string
          created_at: string
          id: number
          location_city: string | null
          location_country: string
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: number
          location_city?: string | null
          location_country: string
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: number
          location_city?: string | null
          location_country?: string
        }
        Relationships: []
      }
      fish_harvest: {
        Row: {
          abw: number | null
          batch_id: number | null
          created_at: string
          cycle_id: number | null
          date: string
          id: number
          local_id: string | null
          number_of_fish_harvest: number | null
          synced_at: string | null
          system_id: number
          total_weight_harvest: number
          type_of_harvest: Database["public"]["Enums"]["type_of_harvest"]
        }
        Insert: {
          abw?: number | null
          batch_id?: number | null
          created_at?: string
          cycle_id?: number | null
          date: string
          id?: number
          local_id?: string | null
          number_of_fish_harvest?: number | null
          synced_at?: string | null
          system_id: number
          total_weight_harvest: number
          type_of_harvest: Database["public"]["Enums"]["type_of_harvest"]
        }
        Update: {
          abw?: number | null
          batch_id?: number | null
          created_at?: string
          cycle_id?: number | null
          date?: string
          id?: number
          local_id?: string | null
          number_of_fish_harvest?: number | null
          synced_at?: string | null
          system_id?: number
          total_weight_harvest?: number
          type_of_harvest?: Database["public"]["Enums"]["type_of_harvest"]
        }
        Relationships: [
          {
            foreignKeyName: "fish_harvest_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "fingerling_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fish_harvest_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycle"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "fish_harvest_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      fish_mortality: {
        Row: {
          batch_id: number | null
          cause: string
          created_at: string
          cycle_id: number | null
          date: string
          farm_id: string | null
          id: number
          is_mass_mortality: boolean | null
          local_id: string | null
          notes: string | null
          number_of_fish_mortality: number
          synced_at: string | null
          system_id: number
          total_weight_mortality: number | null
        }
        Insert: {
          batch_id?: number | null
          cause?: string
          created_at?: string
          cycle_id?: number | null
          date: string
          farm_id?: string | null
          id?: number
          local_id?: string | null
          notes?: string | null
          number_of_fish_mortality: number
          synced_at?: string | null
          system_id: number
          total_weight_mortality?: number | null
        }
        Update: {
          batch_id?: number | null
          cause?: string
          created_at?: string
          cycle_id?: number | null
          date?: string
          farm_id?: string | null
          id?: number
          local_id?: string | null
          notes?: string | null
          number_of_fish_mortality?: number
          synced_at?: string | null
          system_id?: number
          total_weight_mortality?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fish_mortality_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "fingerling_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fish_mortality_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycle"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "fish_mortality_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mortality_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      fish_sampling_weight: {
        Row: {
          abw: number
          batch_id: number | null
          created_at: string
          cycle_id: number | null
          date: string
          id: number
          local_id: string | null
          notes: string | null
          number_of_fish_sampling: number
          synced_at: string | null
          system_id: number
          total_weight_sampling: number
        }
        Insert: {
          abw: number
          batch_id?: number | null
          created_at?: string
          cycle_id?: number | null
          date: string
          id?: number
          local_id?: string | null
          notes?: string | null
          number_of_fish_sampling: number
          synced_at?: string | null
          system_id: number
          total_weight_sampling: number
        }
        Update: {
          abw?: number
          batch_id?: number | null
          created_at?: string
          cycle_id?: number | null
          date?: string
          id?: number
          local_id?: string | null
          notes?: string | null
          number_of_fish_sampling?: number
          synced_at?: string | null
          system_id?: number
          total_weight_sampling?: number
        }
        Relationships: [
          {
            foreignKeyName: "fish_sampling_weight_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "fingerling_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fish_sampling_weight_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycle"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "fish_weight_sampling_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      fish_stocking: {
        Row: {
          abw: number
          batch_id: number
          created_at: string
          cycle_id: number
          date: string
          id: number
          local_id: string | null
          notes: string | null
          number_of_fish_stocking: number
          synced_at: string | null
          system_id: number
          total_weight_stocking: number
          type_of_stocking: Database["public"]["Enums"]["type_of_stocking"]
        }
        Insert: {
          abw: number
          batch_id: number
          created_at?: string
          cycle_id: number
          date: string
          id?: number
          local_id?: string | null
          notes?: string | null
          number_of_fish_stocking: number
          synced_at?: string | null
          system_id: number
          total_weight_stocking: number
          type_of_stocking: Database["public"]["Enums"]["type_of_stocking"]
        }
        Update: {
          abw?: number
          batch_id?: number
          created_at?: string
          cycle_id?: number
          date?: string
          id?: number
          local_id?: string | null
          notes?: string | null
          number_of_fish_stocking?: number
          synced_at?: string | null
          system_id?: number
          total_weight_stocking?: number
          type_of_stocking?: Database["public"]["Enums"]["type_of_stocking"]
        }
        Relationships: [
          {
            foreignKeyName: "fish_stocking_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "fingerling_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fish_stocking_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycle"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "stocking_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      fish_transfer: {
        Row: {
          abw: number | null
          batch_id: number | null
          created_at: string
          cycle_id: number | null
          date: string
          external_origin_name: string | null
          external_target_name: string | null
          id: number
          local_id: string | null
          notes: string | null
          number_of_fish_transfer: number
          origin_system_id: number | null
          synced_at: string | null
          target_system_id: number | null
          total_weight_transfer: number | null
          transfer_type: Database["public"]["Enums"]["transfer_type"]
        }
        Insert: {
          abw?: number | null
          batch_id?: number | null
          created_at?: string
          cycle_id?: number | null
          date: string
          external_origin_name?: string | null
          external_target_name?: string | null
          id?: number
          local_id?: string | null
          notes?: string | null
          number_of_fish_transfer: number
          origin_system_id?: number | null
          synced_at?: string | null
          target_system_id?: number | null
          total_weight_transfer?: number | null
          transfer_type?: Database["public"]["Enums"]["transfer_type"]
        }
        Update: {
          abw?: number | null
          batch_id?: number | null
          created_at?: string
          cycle_id?: number | null
          date?: string
          external_origin_name?: string | null
          external_target_name?: string | null
          id?: number
          local_id?: string | null
          notes?: string | null
          number_of_fish_transfer?: number
          origin_system_id?: number | null
          synced_at?: string | null
          target_system_id?: number | null
          total_weight_transfer?: number | null
          transfer_type?: Database["public"]["Enums"]["transfer_type"]
        }
        Relationships: [
          {
            foreignKeyName: "fish_transfer_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "fingerling_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fish_transfer_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycle"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "transfer_origin_system_id_fkey"
            columns: ["origin_system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_target_system_id_fkey"
            columns: ["target_system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      normalization_review: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          issue_detail: string
          issue_type: string
          raw_upload_id: string | null
          resolution: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          row_data: Json
          table_name: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          issue_detail: string
          issue_type: string
          raw_upload_id?: string | null
          resolution?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          row_data: Json
          table_name: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          issue_detail?: string
          issue_type?: string
          raw_upload_id?: string | null
          resolution?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          row_data?: Json
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "normalization_review_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normalization_review_raw_upload_id_fkey"
            columns: ["raw_upload_id"]
            isOneToOne: false
            referencedRelation: "raw_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      organization: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          owner_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string | null
          slug?: string
        }
        Relationships: []
      }
      production_cycle: {
        Row: {
          batch_id: number
          cycle_end: string | null
          cycle_id: number
          cycle_start: string
          ongoing_cycle: boolean
          previous_system_id: number | null
          system_id: number
          target_weight_g: number | null
        }
        Insert: {
          batch_id: number
          cycle_end?: string | null
          cycle_id?: number
          cycle_start: string
          ongoing_cycle: boolean
          previous_system_id?: number | null
          system_id: number
          target_weight_g?: number | null
        }
        Update: {
          batch_id?: number
          cycle_end?: string | null
          cycle_id?: number
          cycle_start?: string
          ongoing_cycle?: boolean
          previous_system_id?: number | null
          system_id?: number
          target_weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "production_cycle_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "fingerling_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_cycle_previous_system_id_fkey"
            columns: ["previous_system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_cycle_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_uploads: {
        Row: {
          farm_id: string
          file_name: string
          file_type: string | null
          id: string
          parse_warnings: Json | null
          rejection_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          row_count: number | null
          status: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          farm_id: string
          file_name: string
          file_type?: string | null
          id?: string
          parse_warnings?: Json | null
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          row_count?: number | null
          status?: string
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          farm_id?: string
          file_name?: string
          file_type?: string | null
          id?: string
          parse_warnings?: Json | null
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          row_count?: number | null
          status?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_uploads_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
        ]
      }
      system: {
        Row: {
          cage_status: Database["public"]["Enums"]["cage_status_enum"] | null
          commissioned_at: string | null
          created_at: string
          decommissioned_at: string | null
          depth: number | null
          farm_id: string | null
          growth_stage: Database["public"]["Enums"]["system_growth_stage"]
          id: number
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["system_type"]
          unit: string | null
          volume: number | null
        }
        Insert: {
          cage_status?: Database["public"]["Enums"]["cage_status_enum"] | null
          commissioned_at?: string | null
          created_at?: string
          decommissioned_at?: string | null
          depth?: number | null
          farm_id?: string | null
          growth_stage: Database["public"]["Enums"]["system_growth_stage"]
          id?: number
          is_active?: boolean
          name: string
          type: Database["public"]["Enums"]["system_type"]
          unit?: string | null
          volume?: number | null
        }
        Update: {
          cage_status?: Database["public"]["Enums"]["cage_status_enum"] | null
          commissioned_at?: string | null
          created_at?: string
          decommissioned_at?: string | null
          depth?: number | null
          farm_id?: string | null
          growth_stage?: Database["public"]["Enums"]["system_growth_stage"]
          id?: number
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["system_type"]
          unit?: string | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "system_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile: {
        Row: {
          created_at: string | null
          email: string | null
          farm_id: string | null
          full_name: string | null
          notifications_enabled: boolean | null
          organization_id: string | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          farm_id?: string | null
          full_name?: string | null
          notifications_enabled?: boolean | null
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          farm_id?: string | null
          full_name?: string | null
          notifications_enabled?: boolean | null
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profile_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profile_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          alert_thresholds: Json | null
          created_at: string | null
          default_views: Json | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_thresholds?: Json | null
          created_at?: string | null
          default_views?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_thresholds?: Json | null
          created_at?: string | null
          default_views?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile"
            referencedColumns: ["user_id"]
          },
        ]
      }
      water_quality_framework: {
        Row: {
          created_at: string
          id: number
          parameter_acceptable: Json | null
          parameter_critical: Json | null
          parameter_lethal: Json | null
          parameter_name: Database["public"]["Enums"]["water_quality_parameters"]
          parameter_optimal: Json | null
          unit: Database["public"]["Enums"]["units"] | null
        }
        Insert: {
          created_at?: string
          id?: number
          parameter_acceptable?: Json | null
          parameter_critical?: Json | null
          parameter_lethal?: Json | null
          parameter_name: Database["public"]["Enums"]["water_quality_parameters"]
          parameter_optimal?: Json | null
          unit?: Database["public"]["Enums"]["units"] | null
        }
        Update: {
          created_at?: string
          id?: number
          parameter_acceptable?: Json | null
          parameter_critical?: Json | null
          parameter_lethal?: Json | null
          parameter_name?: Database["public"]["Enums"]["water_quality_parameters"]
          parameter_optimal?: Json | null
          unit?: Database["public"]["Enums"]["units"] | null
        }
        Relationships: []
      }
      water_quality_measurement: {
        Row: {
          created_at: string
          date: string
          id: number
          local_id: string | null
          location_reference: string | null
          measured_at: string
          parameter_name: Database["public"]["Enums"]["water_quality_parameters"]
          parameter_value: number
          synced_at: string | null
          system_id: number
          time: string
          water_depth: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: number
          local_id?: string | null
          location_reference?: string | null
          measured_at: string
          parameter_name: Database["public"]["Enums"]["water_quality_parameters"]
          parameter_value: number
          synced_at?: string | null
          system_id: number
          time: string
          water_depth: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: number
          local_id?: string | null
          location_reference?: string | null
          measured_at?: string
          parameter_name?: Database["public"]["Enums"]["water_quality_parameters"]
          parameter_value?: number
          synced_at?: string | null
          system_id?: number
          time?: string
          water_depth?: number
        }
        Relationships: [
          {
            foreignKeyName: "water_quality_measurement_parameter_fkey"
            columns: ["parameter_name"]
            isOneToOne: false
            referencedRelation: "water_quality_framework"
            referencedColumns: ["parameter_name"]
          },
          {
            foreignKeyName: "water_quality_measurements_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      api_alert_thresholds: {
        Row: {
          created_at: string | null
          critical_survival_pct: number | null
          farm_id: string | null
          high_ammonia_threshold: number | null
          high_mortality_threshold: number | null
          id: string | null
          low_do_threshold: number | null
          low_sgr_threshold: number | null
          low_survival_pct: number | null
          scope: string | null
          system_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          critical_survival_pct?: number | null
          farm_id?: string | null
          high_ammonia_threshold?: number | null
          high_mortality_threshold?: number | null
          id?: string | null
          low_do_threshold?: number | null
          low_sgr_threshold?: number | null
          low_survival_pct?: number | null
          scope?: string | null
          system_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          critical_survival_pct?: number | null
          farm_id?: string | null
          high_ammonia_threshold?: number | null
          high_mortality_threshold?: number | null
          id?: string | null
          low_do_threshold?: number | null
          low_sgr_threshold?: number | null
          low_survival_pct?: number | null
          scope?: string | null
          system_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_threshold_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_threshold_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      api_daily_water_quality_rating: {
        Row: {
          created_at: string | null
          farm_id: string | null
          rating: Database["public"]["Enums"]["water_quality_rating"] | null
          rating_date: string | null
          rating_numeric: number | null
          system_id: number | null
          system_name: string | null
          worst_parameter:
            | Database["public"]["Enums"]["water_quality_parameters"]
            | null
          worst_parameter_normalized: string | null
          worst_parameter_unit: string | null
          worst_parameter_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_water_quality_rating_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
        ]
      }
      api_water_quality_measurements: {
        Row: {
          created_at: string | null
          date: string | null
          farm_id: string | null
          id: number | null
          parameter_name:
            | Database["public"]["Enums"]["water_quality_parameters"]
            | null
          parameter_name_normalized: string | null
          parameter_value: number | null
          system_id: number | null
          system_name: string | null
          time: string | null
          unit: Database["public"]["Enums"]["units"] | null
          water_depth: number | null
        }
        Relationships: [
          {
            foreignKeyName: "system_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_quality_measurement_parameter_fkey"
            columns: ["parameter_name"]
            isOneToOne: false
            referencedRelation: "water_quality_framework"
            referencedColumns: ["parameter_name"]
          },
          {
            foreignKeyName: "water_quality_measurements_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      api_cycle_benchmarks: {
        Args: { p_farm_id: string; p_system_id?: number }
        Returns: {
          adg_vs_best: number
          benchmark_label: string
          best_adg_g_day: number
          best_efcr: number
          best_efcr_cycle_start: string
          best_survival_pct: number
          current_abw_g: number
          current_adg_g_day: number
          current_cycle_start: string
          current_days_in_cycle: number
          current_efcr: number
          current_survival_pct: number
          efcr_vs_best: number
          survival_vs_best: number
          system_id: number
          system_name: string
        }[]
      }
      api_daily_fish_inventory_rpc: {
        Args: {
          p_cursor_date?: string
          p_cursor_system_id?: number
          p_end_date?: string
          p_farm_id: string
          p_limit?: number
          p_order_asc?: boolean
          p_start_date?: string
          p_system_id?: number
        }
        Returns: {
          abw_last_sampling: number
          biomass_density: number
          biomass_last_sampling: number
          farm_id: string
          feeding_amount: number
          feeding_amount_aggregated: number
          feeding_rate: number
          inventory_date: string
          last_sampling_date: string
          mortality_rate: number
          number_of_fish: number
          number_of_fish_harvested: number
          number_of_fish_mortality: number
          number_of_fish_mortality_aggregated: number
          number_of_fish_stocked: number
          number_of_fish_transferred_in: number
          number_of_fish_transferred_out: number
          system_id: number
          system_name: string
          system_volume: number
        }[]
      }
      api_daily_overlay: {
        Args: {
          p_end_date?: string
          p_farm_id: string
          p_start_date?: string
          p_system_id?: number
        }
        Returns: {
          feeding_amount: number
          inventory_date: string
          number_of_fish_mortality: number
          system_id: number
        }[]
      }
      api_dashboard_consolidated: {
        Args: {
          p_end_date?: string
          p_farm_id: string
          p_limit?: number
          p_order_desc?: boolean
          p_start_date?: string
          p_system_id?: number
          p_time_period?: string
        }
        Returns: {
          abw_asof_end: number
          abw_asof_end_delta: number
          average_biomass: number
          average_biomass_delta: number
          biomass_density: number
          biomass_density_delta: number
          efcr_period_consolidated: number
          efcr_period_consolidated_delta: number
          feeding_rate: number
          feeding_rate_delta: number
          input_end_date: string
          input_start_date: string
          mortality_rate: number
          mortality_rate_delta: number
          system_id: number
          time_period: string
          water_quality_rating_average: string
          water_quality_rating_numeric_average: number
          water_quality_rating_numeric_delta: number
        }[]
      }
      api_dashboard_systems: {
        Args: {
          p_end_date?: string
          p_farm_id: string
          p_stage?: Database["public"]["Enums"]["system_growth_stage"]
          p_start_date?: string
          p_system_id?: number
        }
        Returns: {
          abw: number
          as_of_date: string
          biomass_density: number
          biomass_end: number
          efcr: number
          efcr_date: string
          feed_total: number
          feeding_rate: number
          fish_end: number
          growth_stage: Database["public"]["Enums"]["system_growth_stage"]
          input_end_date: string
          input_start_date: string
          missing_days_count: number
          mortality_rate: number
          sample_age_days: number
          sampling_end_date: string
          system_id: number
          system_name: string
          water_quality_latest_date: string
          water_quality_rating_average: string
          water_quality_rating_numeric_average: number
          worst_parameter: string
          worst_parameter_unit: string
          worst_parameter_value: number
        }[]
      }
      api_efcr_trend: {
        Args: {
          p_end_date?: string
          p_farm_id: string
          p_start_date?: string
          p_system_id?: number
        }
        Returns: {
          biomass_efcr_multiple: number
          biomass_last_sampling: number
          efcr_period_last_sampling: number
          farm_id: string
          inventory_date: string
          last_sampling_date: string
          system_id: number
          system_name: string
        }[]
      }
      api_farm_options_rpc: {
        Args: never
        Returns: {
          id: string
          label: string
          location: string
        }[]
      }
      api_farm_user_invitations: {
        Args: { p_farm_id: string }
        Returns: {
          accepted_at: string
          created_at: string
          email: string
          farm_id: string
          id: string
          invited_by: string
          invited_user_id: string
          last_sent_at: string
          revoked_at: string
          role: string
          status: string
          updated_at: string
        }[]
      }
      api_fcr_trend: {
        Args: { p_days?: number; p_farm_id: string; p_system_id: number }
        Returns: {
          abw_end_g: number
          days_interval: number
          fcr: number
          period_end: string
          period_start: string
          total_feed_kg: number
          weight_gain_kg: number
        }[]
      }
      api_feed_demand_forecast: {
        Args: { p_days_ahead?: number; p_farm_id: string }
        Returns: {
          avg_daily_kg: number
          current_stock_kg: number
          days_of_stock: number
          feed_category: string
          feed_line: string
          feed_pellet_size: string
          feed_type_id: number
          forecast_7d_kg: number
          forecast_total_kg: number
          stock_status: string
        }[]
      }
      api_feed_fcr_intervals: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_farm_id: string
          p_system_id?: number
        }
        Returns: {
          abw_end_g: number
          abw_start_g: number
          dominant_feed_type: string
          fcr: number
          interval_days: number
          interval_end: string
          interval_start: string
          live_fish: number
          sgr_pct_per_day: number
          system_id: number
          system_name: string
          total_feed_kg: number
          warning: string
          weight_gain_kg: number
        }[]
      }
      api_feed_rate_analysis: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_farm_id: string
          p_system_id?: number
        }
        Returns: {
          abw_g: number
          biomass_kg: number
          detail: string
          feed_date: string
          feed_kg: number
          feed_rate_pct: number
          live_fish: number
          lower_band_pct: number
          pellet_size: string
          status: string
          system_id: number
          system_name: string
          upper_band_pct: number
        }[]
      }
      api_feed_type_options_rpc:
        | {
            Args: never
            Returns: {
              crude_fat_percentage: number
              crude_protein_percentage: number
              farm_id: string
              feed_category: string
              feed_line: string
              feed_pellet_size: string
              id: number
              label: string
              visibility_scope: string
            }[]
          }
        | {
            Args: { p_farm_id: string }
            Returns: {
              crude_fat_percentage: number
              crude_protein_percentage: number
              farm_id: string
              feed_category: string
              feed_line: string
              feed_pellet_size: string
              id: number
              label: string
              visibility_scope: string
            }[]
          }
      api_fingerling_batch_options_rpc: {
        Args: { p_farm_id?: string }
        Returns: {
          abw: number
          date_of_delivery: string
          farm_id: string
          id: number
          label: string
          number_of_fish: number
          supplier_id: number
          system_id: number
        }[]
      }
      api_fingerling_supplier_options_rpc: {
        Args: never
        Returns: {
          company_name: string
          id: number
          location_city: string
          location_country: string
        }[]
      }
      api_growth_trend: {
        Args: { p_days?: number; p_farm_id: string; p_system_id: number }
        Returns: {
          abw_g: number
          adg_g_day: number
          days_interval: number
          prev_abw_g: number
          sample_date: string
          sgr_pct_day: number
          weight_gain_g: number
        }[]
      }
      api_harvest_forecast: {
        Args: { p_farm_id: string; p_system_id?: number }
        Returns: {
          adg_g_day: number
          confidence: string
          current_abw_g: number
          days_to_target: number
          last_sample_date: string
          projected_harvest_date: string
          sample_age_days: number
          status: string
          system_id: number
          system_name: string
          target_weight_g: number
        }[]
      }
      api_kpi_coverage: {
        Args: { p_date_from?: string; p_date_to?: string; p_farm_id: string }
        Returns: {
          basis: string
          coverage_label: string
          data_source: string
          kpi_key: string
          systems_covered: number
          systems_total: number
        }[]
      }
      api_latest_water_quality_status: {
        Args: { p_farm_id: string; p_system_id?: number }
        Returns: {
          ammonia_exceeded: boolean
          do_exceeded: boolean
          high_ammonia_threshold: number
          low_do_threshold: number
          rating: string
          rating_date: string
          rating_numeric: number
          system_id: number
          system_name: string
          worst_parameter: string
          worst_parameter_unit: string
          worst_parameter_value: number
        }[]
      }
      api_production_summary: {
        Args: {
          p_end_date?: string
          p_farm_id: string
          p_start_date?: string
          p_system_id?: number
        }
        Returns: {
          activity: string
          activity_rank: number
          average_body_weight: number
          biomass_increase_aggregated: number
          biomass_increase_period: number
          cumulative_mortality: number
          cycle_id: number
          daily_mortality_count: number
          date: string
          efcr_aggregated: number
          efcr_period: number
          growth_stage: string
          number_of_fish_harvested: number
          number_of_fish_inventory: number
          number_of_fish_stocked: number
          number_of_fish_transfer_in: number
          number_of_fish_transfer_out: number
          ongoing_cycle: boolean
          system_id: number
          system_name: string
          total_biomass: number
          total_feed_amount_aggregated: number
          total_feed_amount_period: number
          total_weight_harvested: number
          total_weight_harvested_aggregated: number
          total_weight_stocked: number
          total_weight_stocked_aggregated: number
          total_weight_transfer_in: number
          total_weight_transfer_in_aggregated: number
          total_weight_transfer_out: number
          total_weight_transfer_out_aggregated: number
        }[]
      }
      api_recommended_actions: {
        Args: { p_farm_id: string; p_system_id?: number }
        Returns: {
          context_json: Json
          current_value: number
          metric_name: string
          severity: string
          system_id: number
          system_name: string
          threshold_high: number
          threshold_low: number
          unit: string
        }[]
      }
      api_running_stock: {
        Args: { p_farm_id: string }
        Returns: {
          avg_daily_usage_kg: number
          current_stock_kg: number
          days_remaining: number
          feed_type_id: number
          feed_type_name: string
          last_delivery_date: string
          pellet_size: string
          stock_status: string
        }[]
      }
      api_survival_trend: {
        Args: {
          p_end_date?: string
          p_farm_id: string
          p_start_date: string
          p_system_id: number
        }
        Returns: {
          cum_deaths: number
          daily_deaths: number
          daily_mort_pct: number
          event_date: string
          live_count: number
          stocked: number
          survival_pct: number
        }[]
      }
      api_system_health_score: {
        Args: { p_farm_id: string; p_system_id?: number }
        Returns: {
          adg_g_day: number
          fcr_score: number
          growth_score: number
          health_grade: string
          health_score: number
          last_sample_date: string
          latest_abw_g: number
          latest_efcr: number
          mortality_rate_pct: number
          mortality_score: number
          system_id: number
          system_name: string
          wq_date: string
          wq_rating_avg: number
          wq_score: number
        }[]
      }
      api_system_options_rpc: {
        Args: {
          p_active_only?: boolean
          p_farm_id?: string
          p_stage?: Database["public"]["Enums"]["system_growth_stage"]
        }
        Returns: {
          farm_id: string
          farm_name: string
          growth_stage: Database["public"]["Enums"]["system_growth_stage"]
          id: number
          is_active: boolean
          label: string
          type: string
        }[]
      }
      api_system_timeline_bounds: {
        Args: { p_farm_id: string; p_system_id?: number }
        Returns: {
          configured_cycle_end: string
          configured_cycle_start: string
          final_harvest_date: string
          first_activity_date: string
          first_stocking_date: string
          last_activity_date: string
          period_source: string
          resolved_end: string
          resolved_ongoing: boolean
          resolved_start: string
          snapshot_as_of: string
          system_id: number
        }[]
      }
      api_time_period_bounds_scoped: {
        Args: {
          p_anchor_date?: string
          p_farm_id: string
          p_scope?: string
          p_system_id?: number
          p_time_period: string
        }
        Returns: {
          anchor_scope: string
          available_days: number
          available_from_date: string
          input_end_date: string
          input_start_date: string
          is_truncated: boolean
          latest_available_date: string
          requested_days: number
          resolved_days: number
          staleness_days: number
          time_period: string
        }[]
      }
      api_water_quality_sync_status: {
        Args: { p_farm_id: string }
        Returns: {
          latest_measurement_ts: string
          latest_rating_date: string
        }[]
      }
      claim_my_farm_user_invitations: { Args: never; Returns: number }
      classify_growth_stage_tanganicae: {
        Args: { p_abw_g: number }
        Returns: string
      }
      classify_water_quality_measurement: {
        Args: {
          p_acceptable: Json
          p_critical: Json
          p_lethal: Json
          p_optimal: Json
          p_parameter_value: number
        }
        Returns: {
          distance_from_next_better_band: number
          measurement_rating: Database["public"]["Enums"]["water_quality_rating"]
          severity_rank: number
        }[]
      }
      create_farm_user_invitation: {
        Args: { p_email: string; p_farm_id: string; p_role?: string }
        Returns: Database["public"]["CompositeTypes"]["farm_user_invitation_rpc_result"][]
        SetofOptions: {
          from: "*"
          to: "farm_user_invitation_rpc_result"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      feed_inventory_snapshot_kg: {
        Args: {
          p_amount_of_bags: number
          p_bag_weight: number
          p_opened_bags: number
        }
        Returns: number
      }
      get_daily_feed_target_kg: {
        Args: { p_farm_id?: string; p_system_id?: number }
        Returns: {
          daily_feed_max_kg: number
          daily_feed_min_kg: number
          daily_feed_target_kg: number
          estimated_biomass_kg: number
          feed_rate_max_pct: number
          feed_rate_min_pct: number
          growth_stage: string
          pellet_size_mm: string
          per_session_kg: number
          sessions_per_day: number
          system_name: string
        }[]
      }
      get_fcr_trend: {
        Args: { p_days?: number; p_farm_id: string; p_system_id: number }
        Returns: {
          abw_end_g: number
          days_interval: number
          fcr: number
          period_end: string
          period_start: string
          total_feed_kg: number
          weight_gain_kg: number
        }[]
      }
      get_feed_rate_target: {
        Args: { p_growth_stage: string }
        Returns: {
          abw_range_g: string
          feed_rate_max_pct: number
          feed_rate_mid_pct: number
          feed_rate_min_pct: number
          pellet_size_mm: string
          sessions_per_day: number
          stage: string
        }[]
      }
      get_growth_trend: {
        Args: { p_days?: number; p_system_id: number }
        Returns: {
          abw_g: number
          adg_g_day: number
          days_interval: number
          prev_abw_g: number
          sample_date: string
          sgr_pct_day: number
          weight_gain_g: number
        }[]
      }
      get_running_stock: {
        Args: { p_farm_id: string }
        Returns: {
          avg_daily_usage_kg: number
          current_stock_kg: number
          days_remaining: number
          feed_type_id: number
          feed_type_name: string
          last_delivery_date: string
          pellet_size: string
          stock_status: string
        }[]
      }
      get_survival_trend: {
        Args: { p_end_date?: string; p_start_date: string; p_system_id: number }
        Returns: {
          cum_deaths: number
          daily_deaths: number
          daily_mort_pct: number
          event_date: string
          live_count: number
          stocked: number
          survival_pct: number
        }[]
      }
      mark_farm_user_invitation_sent: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      process_inventory_queue: {
        Args: { p_limit?: number }
        Returns: {
          processed_from_date: string
          processed_system_id: number
          processed_to_date: string
          upserted_days: number
        }[]
      }
      refresh_analytics_cache: { Args: never; Returns: undefined }
      refresh_daily_water_quality_rating: {
        Args: { p_from?: string; p_system_id?: number; p_to?: string }
        Returns: undefined
      }
      request_matview_refresh: { Args: never; Returns: undefined }
      resolve_cycle_batch_for_system_date: {
        Args: { p_date: string; p_system_id: number }
        Returns: {
          batch_id: number
          cycle_id: number
        }[]
      }
      resolve_sampling_abw_g:
        | {
            Args: {
              p_abw: number
              p_number_of_fish_sampling: number
              p_total_weight_sampling: number
            }
            Returns: number
          }
        | {
            Args: {
              p_abw: number
              p_number_of_fish_sampling: number
              p_total_weight_sampling: number
            }
            Returns: number
          }
      revoke_farm_user_invitation: {
        Args: { p_invitation_id: string }
        Returns: string
      }
      transfer_impacts_efcr: {
        Args: {
          p_origin_system_id: number
          p_target_system_id: number
          p_transfer_type: Database["public"]["Enums"]["transfer_type"]
        }
        Returns: boolean
      }
      transfer_weight_kg: {
        Args: {
          p_abw: number
          p_number_of_fish_transfer: number
          p_total_weight_transfer: number
        }
        Returns: number
      }
      water_quality_rating_label: { Args: { p_score: number }; Returns: string }
    }
    Enums: {
      arrows: "up" | "down" | "straight"
      cage_status_enum: "occupied" | "available" | "retired"
      change_type_enum: "INSERT" | "UPDATE" | "DELETE"
      feed_category:
        | "pre-starter"
        | "starter"
        | "pre-grower"
        | "grower"
        | "finisher"
        | "broodstock"
        | "unknown"
      feed_pellet_size:
        | "mash_powder"
        | "<0.49mm"
        | "0.5-0.99mm"
        | "1.0-1.5mm"
        | "1.5-1.99mm"
        | "2mm"
        | "2.5mm"
        | "3mm"
        | "3.5mm"
        | "4mm"
        | "4.5mm"
        | "5mm"
        | "unknown"
        | "0.5mm"
        | "0.5-1.0mm"
        | "0.9-1.6mm"
      system_growth_stage:
        | "fingerling"
        | "juvenile"
        | "sub_adult"
        | "broodstock"
      system_type:
        | "cage"
        | "compartment"
        | "all_active_cages"
        | "rectangular_cage"
        | "circular_cage"
        | "pond"
        | "tank"
      time_period:
        | "day"
        | "week"
        | "2 weeks"
        | "month"
        | "quarter"
        | "6 months"
        | "year"
      transfer_type:
        | "transfer"
        | "grading"
        | "density_thinning"
        | "broodstock"
        | "count_check"
        | "lab_sample"
        | "training"
        | "external_out"
      type_of_harvest: "partial" | "final"
      type_of_stocking: "empty" | "already_stocked"
      units: "m" | "mg/l" | "ppt" | "°C" | "pH" | "NTU" | "µS/cm"
      water_quality_parameters:
        | "pH"
        | "temperature"
        | "dissolved_oxygen"
        | "secchi_disk_depth"
        | "nitrite"
        | "nitrate"
        | "ammonia"
        | "salinity"
      water_quality_rating: "optimal" | "acceptable" | "critical" | "lethal"
    }
    CompositeTypes: {
      farm_user_invitation_rpc_result: {
        id: string | null
        farm_id: string | null
        email: string | null
        role: string | null
        status: string | null
        invited_by: string | null
        invited_user_id: string | null
        created_at: string | null
        updated_at: string | null
        last_sent_at: string | null
        accepted_at: string | null
        revoked_at: string | null
        should_send_auth_invite: boolean | null
      }
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
      arrows: ["up", "down", "straight"],
      cage_status_enum: ["occupied", "available", "retired"],
      change_type_enum: ["INSERT", "UPDATE", "DELETE"],
      feed_category: [
        "pre-starter",
        "starter",
        "pre-grower",
        "grower",
        "finisher",
        "broodstock",
        "unknown",
      ],
      feed_pellet_size: [
        "mash_powder",
        "<0.49mm",
        "0.5-0.99mm",
        "1.0-1.5mm",
        "1.5-1.99mm",
        "2mm",
        "2.5mm",
        "3mm",
        "3.5mm",
        "4mm",
        "4.5mm",
        "5mm",
        "unknown",
        "0.5mm",
        "0.5-1.0mm",
        "0.9-1.6mm",
      ],
      system_growth_stage: [
        "fingerling",
        "juvenile",
        "sub_adult",
        "broodstock",
      ],
      system_type: [
        "cage",
        "compartment",
        "all_active_cages",
        "rectangular_cage",
        "circular_cage",
        "pond",
        "tank",
      ],
      time_period: [
        "day",
        "week",
        "2 weeks",
        "month",
        "quarter",
        "6 months",
        "year",
      ],
      transfer_type: [
        "transfer",
        "grading",
        "density_thinning",
        "broodstock",
        "count_check",
        "lab_sample",
        "training",
        "external_out",
      ],
      type_of_harvest: ["partial", "final"],
      type_of_stocking: ["empty", "already_stocked"],
      units: ["m", "mg/l", "ppt", "°C", "pH", "NTU", "µS/cm"],
      water_quality_parameters: [
        "pH",
        "temperature",
        "dissolved_oxygen",
        "secchi_disk_depth",
        "nitrite",
        "nitrate",
        "ammonia",
        "salinity",
      ],
      water_quality_rating: ["optimal", "acceptable", "critical", "lethal"],
    },
  },
} as const
