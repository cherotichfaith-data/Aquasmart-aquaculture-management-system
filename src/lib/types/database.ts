export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      _affected_systems: {
        Row: {
          min_affected_date: string
          system_id: number
        }
        Insert: {
          min_affected_date: string
          system_id: number
        }
        Update: {
          min_affected_date?: string
          system_id?: number
        }
        Relationships: []
      }
      _refresh_queue: {
        Row: {
          key: string
          requested_at: string
        }
        Insert: {
          key: string
          requested_at?: string
        }
        Update: {
          key?: string
          requested_at?: string
        }
        Relationships: []
      }
      alert_log: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_taken: string | null
          farm_id: string
          fired_at: string
          id: string
          message: string
          rule_code: string
          severity: string
          system_id: number | null
          threshold: number | null
          value: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_taken?: string | null
          farm_id: string
          fired_at?: string
          id?: string
          message: string
          rule_code: string
          severity: string
          system_id?: number | null
          threshold?: number | null
          value?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_taken?: string | null
          farm_id?: string
          fired_at?: string
          id?: string
          message?: string
          rule_code?: string
          severity?: string
          system_id?: number | null
          threshold?: number | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_log_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_log_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "alert_log_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "alert_log_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_threshold: {
        Row: {
          created_at: string | null
          farm_id: string | null
          high_ammonia_threshold: number | null
          high_mortality_threshold: number | null
          id: string
          low_do_threshold: number | null
          scope: string
          system_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          farm_id?: string | null
          high_ammonia_threshold?: number | null
          high_mortality_threshold?: number | null
          id?: string
          low_do_threshold?: number | null
          scope: string
          system_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          farm_id?: string | null
          high_ammonia_threshold?: number | null
          high_mortality_threshold?: number | null
          id?: string
          low_do_threshold?: number | null
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
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "alert_threshold_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
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
      change_log: {
        Row: {
          change_time: string
          change_type: string
          column_name: string | null
          id: number
          new_value: string | null
          old_value: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          change_time?: string
          change_type: string
          column_name?: string | null
          id?: number
          new_value?: string | null
          old_value?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          change_time?: string
          change_type?: string
          column_name?: string | null
          id?: number
          new_value?: string | null
          old_value?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      daily_fish_inventory_table: {
        Row: {
          abw_last_sampling: number | null
          biomass_density: number | null
          biomass_last_sampling: number | null
          feeding_amount: number | null
          feeding_amount_aggregated: number | null
          feeding_rate: number | null
          id: number
          inventory_date: string
          last_sampling_date: string | null
          mortality_rate: number | null
          number_of_fish: number | null
          number_of_fish_harvested: number | null
          number_of_fish_mortality: number | null
          number_of_fish_mortality_aggregated: number | null
          number_of_fish_stocked: number | null
          number_of_fish_transferred_in: number | null
          number_of_fish_transferred_out: number | null
          system_id: number
          system_volume: number | null
        }
        Insert: {
          abw_last_sampling?: number | null
          biomass_density?: number | null
          biomass_last_sampling?: number | null
          feeding_amount?: number | null
          feeding_amount_aggregated?: number | null
          feeding_rate?: number | null
          id?: number
          inventory_date: string
          last_sampling_date?: string | null
          mortality_rate?: number | null
          number_of_fish?: number | null
          number_of_fish_harvested?: number | null
          number_of_fish_mortality?: number | null
          number_of_fish_mortality_aggregated?: number | null
          number_of_fish_stocked?: number | null
          number_of_fish_transferred_in?: number | null
          number_of_fish_transferred_out?: number | null
          system_id: number
          system_volume?: number | null
        }
        Update: {
          abw_last_sampling?: number | null
          biomass_density?: number | null
          biomass_last_sampling?: number | null
          feeding_amount?: number | null
          feeding_amount_aggregated?: number | null
          feeding_rate?: number | null
          id?: number
          inventory_date?: string
          last_sampling_date?: string | null
          mortality_rate?: number | null
          number_of_fish?: number | null
          number_of_fish_harvested?: number | null
          number_of_fish_mortality?: number | null
          number_of_fish_mortality_aggregated?: number | null
          number_of_fish_stocked?: number | null
          number_of_fish_transferred_in?: number | null
          number_of_fish_transferred_out?: number | null
          system_id?: number
          system_volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_fish_inventory_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "daily_fish_inventory_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "daily_fish_inventory_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "daily_water_quality_rating_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "daily_water_quality_rating_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      farm: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          location: string | null
          name: string
          owner: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          name: string
          owner?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          owner?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      farm_user: {
        Row: {
          created_at: string | null
          farm_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          farm_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          farm_id?: string
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
      feed_incoming: {
        Row: {
          created_at: string
          date: string
          farm_id: string
          feed_amount: number
          feed_type_id: number | null
          id: number
        }
        Insert: {
          created_at?: string
          date: string
          farm_id: string
          feed_amount: number
          feed_type_id?: number | null
          id?: number
        }
        Update: {
          created_at?: string
          date?: string
          farm_id?: string
          feed_amount?: number
          feed_type_id?: number | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "feed_incoming_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_incoming_feed_id_fkey"
            columns: ["feed_type_id"]
            isOneToOne: false
            referencedRelation: "feed_type"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_inventory_snapshot: {
        Row: {
          bag_weight_kg: number
          created_at: string
          date: string
          farm_id: string
          feed_type_id: number
          id: number
          notes: string | null
          number_of_bags: number
          open_bags_kg: number
          snapshot_time: string
          total_stock_kg: number | null
        }
        Insert: {
          bag_weight_kg: number
          created_at?: string
          date: string
          farm_id: string
          feed_type_id: number
          id?: number
          notes?: string | null
          number_of_bags: number
          open_bags_kg?: number
          snapshot_time: string
          total_stock_kg?: number | null
        }
        Update: {
          bag_weight_kg?: number
          created_at?: string
          date?: string
          farm_id?: string
          feed_type_id?: number
          id?: number
          notes?: string | null
          number_of_bags?: number
          open_bags_kg?: number
          snapshot_time?: string
          total_stock_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_inventory_snapshot_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_inventory_snapshot_feed_type_id_fkey"
            columns: ["feed_type_id"]
            isOneToOne: false
            referencedRelation: "feed_type"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_plan: {
        Row: {
          abw_max_g: number | null
          abw_min_g: number
          batch_id: number | null
          created_at: string
          effective_from: string
          effective_to: string | null
          farm_id: number
          feed_type_id: number | null
          feeding_sessions_per_day: number
          id: number
          is_active: boolean
          notes: string | null
          pellet_size_mm: string | null
          system_id: number | null
          target_efcr: number
          target_feeding_rate_pct: number
        }
        Insert: {
          abw_max_g?: number | null
          abw_min_g?: number
          batch_id?: number | null
          created_at?: string
          effective_from: string
          effective_to?: string | null
          farm_id: number
          feed_type_id?: number | null
          feeding_sessions_per_day?: number
          id?: number
          is_active?: boolean
          notes?: string | null
          pellet_size_mm?: string | null
          system_id?: number | null
          target_efcr: number
          target_feeding_rate_pct: number
        }
        Update: {
          abw_max_g?: number | null
          abw_min_g?: number
          batch_id?: number | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          farm_id?: number
          feed_type_id?: number | null
          feeding_sessions_per_day?: number
          id?: number
          is_active?: boolean
          notes?: string | null
          pellet_size_mm?: string | null
          system_id?: number | null
          target_efcr?: number
          target_feeding_rate_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "feed_plan_batch_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "fingerling_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_plan_feed_type_fkey"
            columns: ["feed_type_id"]
            isOneToOne: false
            referencedRelation: "feed_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_plan_system_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "feed_plan_system_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "feed_plan_system_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
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
          crude_protein_percentage: number
          feed_category: Database["public"]["Enums"]["feed_category"]
          feed_line: string | null
          feed_pellet_size: Database["public"]["Enums"]["feed_pellet_size"]
          feed_supplier: number
          id: number
        }
        Insert: {
          created_at?: string
          crude_fat_percentage?: number | null
          crude_protein_percentage: number
          feed_category: Database["public"]["Enums"]["feed_category"]
          feed_line?: string | null
          feed_pellet_size: Database["public"]["Enums"]["feed_pellet_size"]
          feed_supplier: number
          id?: number
        }
        Update: {
          created_at?: string
          crude_fat_percentage?: number | null
          crude_protein_percentage?: number
          feed_category?: Database["public"]["Enums"]["feed_category"]
          feed_line?: string | null
          feed_pellet_size?: Database["public"]["Enums"]["feed_pellet_size"]
          feed_supplier?: number
          id?: number
        }
        Relationships: [
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
          date: string
          feed_type_id: number
          feeding_amount: number
          feeding_response: Database["public"]["Enums"]["feeding_response"]
          id: number
          notes: string | null
          system_id: number
        }
        Insert: {
          batch_id?: number | null
          created_at?: string
          date: string
          feed_type_id: number
          feeding_amount: number
          feeding_response: Database["public"]["Enums"]["feeding_response"]
          id?: number
          notes?: string | null
          system_id: number
        }
        Update: {
          batch_id?: number | null
          created_at?: string
          date?: string
          feed_type_id?: number
          feeding_amount?: number
          feeding_response?: Database["public"]["Enums"]["feeding_response"]
          id?: number
          notes?: string | null
          system_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "feed_record_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "feed_record_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
          },
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
            foreignKeyName: "feeding_record_feed_id_fkey"
            columns: ["feed_type_id"]
            isOneToOne: false
            referencedRelation: "feed_type"
            referencedColumns: ["id"]
          },
        ]
      }
      fingerling_batch: {
        Row: {
          abw: number | null
          created_at: string
          date_of_delivery: string
          farm_id: string
          id: number
          name: string
          number_of_fish: number | null
          supplier_id: number
        }
        Insert: {
          abw?: number | null
          created_at?: string
          date_of_delivery: string
          farm_id: string
          id?: number
          name: string
          number_of_fish?: number | null
          supplier_id: number
        }
        Update: {
          abw?: number | null
          created_at?: string
          date_of_delivery?: string
          farm_id?: string
          id?: number
          name?: string
          number_of_fish?: number | null
          supplier_id?: number
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
          abw: number
          batch_id: number | null
          created_at: string
          date: string
          id: number
          number_of_fish_harvest: number
          system_id: number
          total_weight_harvest: number
          type_of_harvest: Database["public"]["Enums"]["type_of_harvest"]
        }
        Insert: {
          abw: number
          batch_id?: number | null
          created_at?: string
          date: string
          id?: number
          number_of_fish_harvest: number
          system_id: number
          total_weight_harvest: number
          type_of_harvest: Database["public"]["Enums"]["type_of_harvest"]
        }
        Update: {
          abw?: number
          batch_id?: number | null
          created_at?: string
          date?: string
          id?: number
          number_of_fish_harvest?: number
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
            foreignKeyName: "fish_harvest_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "fish_harvest_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
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
          avg_dead_wt_g: number | null
          batch_id: number | null
          cause: string
          created_at: string
          date: string
          farm_id: string | null
          id: number
          is_mass_mortality: boolean | null
          notes: string | null
          number_of_fish_mortality: number
          recorded_by: string | null
          system_id: number
        }
        Insert: {
          avg_dead_wt_g?: number | null
          batch_id?: number | null
          cause?: string
          created_at?: string
          date: string
          farm_id?: string | null
          id?: number
          is_mass_mortality?: boolean | null
          notes?: string | null
          number_of_fish_mortality: number
          recorded_by?: string | null
          system_id: number
        }
        Update: {
          avg_dead_wt_g?: number | null
          batch_id?: number | null
          cause?: string
          created_at?: string
          date?: string
          farm_id?: string | null
          id?: number
          is_mass_mortality?: boolean | null
          notes?: string | null
          number_of_fish_mortality?: number
          recorded_by?: string | null
          system_id?: number
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
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "mortality_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
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
          date: string
          id: number
          notes: string | null
          number_of_fish_sampling: number
          system_id: number
          total_weight_sampling: number
        }
        Insert: {
          abw: number
          batch_id?: number | null
          created_at?: string
          date: string
          id?: number
          notes?: string | null
          number_of_fish_sampling: number
          system_id: number
          total_weight_sampling: number
        }
        Update: {
          abw?: number
          batch_id?: number | null
          created_at?: string
          date?: string
          id?: number
          notes?: string | null
          number_of_fish_sampling?: number
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
            foreignKeyName: "fish_weight_sampling_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "fish_weight_sampling_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
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
          date: string
          id: number
          notes: string | null
          number_of_fish_stocking: number
          system_id: number
          total_weight_stocking: number
          type_of_stocking: Database["public"]["Enums"]["type_of_stocking"]
        }
        Insert: {
          abw: number
          batch_id: number
          created_at?: string
          date: string
          id?: number
          notes?: string | null
          number_of_fish_stocking: number
          system_id: number
          total_weight_stocking: number
          type_of_stocking: Database["public"]["Enums"]["type_of_stocking"]
        }
        Update: {
          abw?: number
          batch_id?: number
          created_at?: string
          date?: string
          id?: number
          notes?: string | null
          number_of_fish_stocking?: number
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
            foreignKeyName: "stocking_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "stocking_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
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
          date: string
          external_target_name: string | null
          id: number
          notes: string | null
          number_of_fish_transfer: number
          origin_system_id: number
          target_system_id: number | null
          total_weight_transfer: number
          transfer_type: Database["public"]["Enums"]["transfer_type"]
        }
        Insert: {
          abw?: number | null
          batch_id?: number | null
          created_at?: string
          date: string
          external_target_name?: string | null
          id?: number
          notes?: string | null
          number_of_fish_transfer: number
          origin_system_id: number
          target_system_id?: number | null
          total_weight_transfer: number
          transfer_type?: Database["public"]["Enums"]["transfer_type"]
        }
        Update: {
          abw?: number | null
          batch_id?: number | null
          created_at?: string
          date?: string
          external_target_name?: string | null
          id?: number
          notes?: string | null
          number_of_fish_transfer?: number
          origin_system_id?: number
          target_system_id?: number | null
          total_weight_transfer?: number
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
            foreignKeyName: "transfer_origin_system_id_fkey"
            columns: ["origin_system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "transfer_origin_system_id_fkey"
            columns: ["origin_system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
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
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "transfer_target_system_id_fkey"
            columns: ["target_system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
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
      production_cycle: {
        Row: {
          cycle_end: string | null
          cycle_id: number
          cycle_start: string
          delta_biomass: number | null
          delta_number_of_fish: number | null
          ongoing_cycle: boolean
          system_id: number
        }
        Insert: {
          cycle_end?: string | null
          cycle_id?: number
          cycle_start: string
          delta_biomass?: number | null
          delta_number_of_fish?: number | null
          ongoing_cycle: boolean
          system_id: number
        }
        Update: {
          cycle_end?: string | null
          cycle_id?: number
          cycle_start?: string
          delta_biomass?: number | null
          delta_number_of_fish?: number | null
          ongoing_cycle?: boolean
          system_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_cycle_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "production_cycle_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
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
      system: {
        Row: {
          commissioned_at: string | null
          created_at: string
          decommissioned_at: string | null
          depth: number | null
          diameter: number | null
          farm_id: string
          growth_stage: Database["public"]["Enums"]["system_growth_stage"]
          id: number
          is_active: boolean
          length: number | null
          name: string
          type: Database["public"]["Enums"]["system_type"]
          unit: string | null
          volume: number | null
          width: number | null
        }
        Insert: {
          commissioned_at?: string | null
          created_at?: string
          decommissioned_at?: string | null
          depth?: number | null
          diameter?: number | null
          farm_id: string
          growth_stage: Database["public"]["Enums"]["system_growth_stage"]
          id?: number
          is_active?: boolean
          length?: number | null
          name: string
          type: Database["public"]["Enums"]["system_type"]
          unit?: string | null
          volume?: number | null
          width?: number | null
        }
        Update: {
          commissioned_at?: string | null
          created_at?: string
          decommissioned_at?: string | null
          depth?: number | null
          diameter?: number | null
          farm_id?: string
          growth_stage?: Database["public"]["Enums"]["system_growth_stage"]
          id?: number
          is_active?: boolean
          length?: number | null
          name?: string
          type?: Database["public"]["Enums"]["system_type"]
          unit?: string | null
          volume?: number | null
          width?: number | null
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
          default_views: Json | null
          full_name: string | null
          notifications_enabled: boolean | null
          role: string | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_views?: Json | null
          full_name?: string | null
          notifications_enabled?: boolean | null
          role?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_views?: Json | null
          full_name?: string | null
          notifications_enabled?: boolean | null
          role?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          unit: Database["public"]["Enums"]["units"]
        }
        Insert: {
          created_at?: string
          id?: number
          parameter_acceptable?: Json | null
          parameter_critical?: Json | null
          parameter_lethal?: Json | null
          parameter_name: Database["public"]["Enums"]["water_quality_parameters"]
          parameter_optimal?: Json | null
          unit?: Database["public"]["Enums"]["units"]
        }
        Update: {
          created_at?: string
          id?: number
          parameter_acceptable?: Json | null
          parameter_critical?: Json | null
          parameter_lethal?: Json | null
          parameter_name?: Database["public"]["Enums"]["water_quality_parameters"]
          parameter_optimal?: Json | null
          unit?: Database["public"]["Enums"]["units"]
        }
        Relationships: []
      }
      water_quality_measurement: {
        Row: {
          created_at: string
          date: string
          id: number
          location_reference: string | null
          measured_at: string
          parameter_name: Database["public"]["Enums"]["water_quality_parameters"]
          parameter_value: number
          system_id: number
          time: string
          water_depth: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: number
          location_reference?: string | null
          measured_at: string
          parameter_name: Database["public"]["Enums"]["water_quality_parameters"]
          parameter_value: number
          system_id: number
          time: string
          water_depth: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: number
          location_reference?: string | null
          measured_at?: string
          parameter_name?: Database["public"]["Enums"]["water_quality_parameters"]
          parameter_value?: number
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
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "water_quality_measurements_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
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
      analytics_feed_inventory_day: {
        Row: {
          fact_date: string | null
          farm_id: string | null
          feed_delivery_count: number | null
          feed_incoming_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_incoming_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_system_day: {
        Row: {
          abw: number | null
          abw_sampled: number | null
          biomass_density: number | null
          biomass_end: number | null
          fact_date: string | null
          farm_id: string | null
          feeding_amount: number | null
          feeding_amount_inventory: number | null
          feeding_amount_recorded: number | null
          feeding_events_count: number | null
          feeding_rate: number | null
          fish_end: number | null
          growth_stage:
            | Database["public"]["Enums"]["system_growth_stage"]
            | null
          has_inventory: boolean | null
          is_active: boolean | null
          mortality_count: number | null
          mortality_count_inventory: number | null
          mortality_count_recorded: number | null
          mortality_rate: number | null
          number_of_fish_harvested: number | null
          number_of_fish_sampled: number | null
          number_of_fish_stocked: number | null
          number_of_fish_transfer_in: number | null
          number_of_fish_transfer_out: number | null
          sampling_end_date: string | null
          system_id: number | null
          system_name: string | null
          system_volume: number | null
          total_weight_harvested: number | null
          total_weight_sampled: number | null
          total_weight_stocked: number | null
          total_weight_transfer_in: number | null
          total_weight_transfer_out: number | null
          water_quality_rating: string | null
          water_quality_rating_numeric: number | null
          worst_parameter: string | null
          worst_parameter_unit: string | null
          worst_parameter_value: number | null
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
      analytics_system_day_mv: {
        Row: {
          abw: number | null
          abw_sampled: number | null
          biomass_density: number | null
          biomass_end: number | null
          fact_date: string | null
          farm_id: string | null
          feeding_amount: number | null
          feeding_amount_inventory: number | null
          feeding_amount_recorded: number | null
          feeding_events_count: number | null
          feeding_rate: number | null
          fish_end: number | null
          growth_stage:
            | Database["public"]["Enums"]["system_growth_stage"]
            | null
          has_inventory: boolean | null
          is_active: boolean | null
          mortality_count: number | null
          mortality_count_inventory: number | null
          mortality_count_recorded: number | null
          mortality_rate: number | null
          number_of_fish_harvested: number | null
          number_of_fish_sampled: number | null
          number_of_fish_stocked: number | null
          number_of_fish_transfer_in: number | null
          number_of_fish_transfer_out: number | null
          sampling_end_date: string | null
          system_id: number | null
          system_name: string | null
          system_volume: number | null
          total_weight_harvested: number | null
          total_weight_sampled: number | null
          total_weight_stocked: number | null
          total_weight_transfer_in: number | null
          total_weight_transfer_out: number | null
          water_quality_rating: string | null
          water_quality_rating_numeric: number | null
          worst_parameter: string | null
          worst_parameter_unit: string | null
          worst_parameter_value: number | null
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
      api_alert_thresholds: {
        Row: {
          created_at: string | null
          farm_id: string | null
          high_ammonia_threshold: number | null
          high_mortality_threshold: number | null
          id: string | null
          low_do_threshold: number | null
          scope: string | null
          system_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          farm_id?: string | null
          high_ammonia_threshold?: number | null
          high_mortality_threshold?: number | null
          id?: string | null
          low_do_threshold?: number | null
          scope?: string | null
          system_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          farm_id?: string | null
          high_ammonia_threshold?: number | null
          high_mortality_threshold?: number | null
          id?: string | null
          low_do_threshold?: number | null
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
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "alert_threshold_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
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
      api_daily_fish_inventory: {
        Row: {
          abw_last_sampling: number | null
          biomass_density: number | null
          biomass_last_sampling: number | null
          farm_id: string | null
          farm_name: string | null
          feeding_amount: number | null
          feeding_amount_aggregated: number | null
          feeding_rate: number | null
          inventory_date: string | null
          last_sampling_date: string | null
          mortality_rate: number | null
          number_of_fish: number | null
          number_of_fish_harvested: number | null
          number_of_fish_mortality: number | null
          number_of_fish_mortality_aggregated: number | null
          number_of_fish_stocked: number | null
          number_of_fish_transferred_in: number | null
          number_of_fish_transferred_out: number | null
          system_id: number | null
          system_name: string | null
          system_volume: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_fish_inventory_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "daily_fish_inventory_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "daily_fish_inventory_system_id_fkey"
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
          worst_parameter_unit: string | null
          worst_parameter_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_water_quality_rating_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "daily_water_quality_rating_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
          },
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
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "water_quality_measurements_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
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
      daily_fish_inventory: {
        Row: {
          abw_last_sampling: number | null
          biomass_density: number | null
          biomass_last_sampling: number | null
          farm_id: string | null
          feeding_amount: number | null
          feeding_amount_aggregated: number | null
          feeding_rate: number | null
          inventory_date: string | null
          last_sampling_date: string | null
          mortality_rate: number | null
          number_of_fish: number | null
          number_of_fish_harvested: number | null
          number_of_fish_mortality: number | null
          number_of_fish_mortality_aggregated: number | null
          number_of_fish_stocked: number | null
          number_of_fish_transferred_in: number | null
          number_of_fish_transferred_out: number | null
          system_id: number | null
          system_volume: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_fish_inventory_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "daily_fish_inventory_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "analytics_system_day_mv"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "daily_fish_inventory_system_id_fkey"
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
      production_summary: {
        Row: {
          activity: string | null
          activity_rank: number | null
          average_body_weight: number | null
          biomass_increase_aggregated: number | null
          biomass_increase_period: number | null
          cumulative_mortality: number | null
          cycle_id: number | null
          daily_mortality_count: number | null
          date: string | null
          efcr_aggregated: number | null
          efcr_period: number | null
          growth_stage:
            | Database["public"]["Enums"]["system_growth_stage"]
            | null
          number_of_fish_harvested: number | null
          number_of_fish_inventory: number | null
          number_of_fish_stocked: number | null
          number_of_fish_transfer_in: number | null
          number_of_fish_transfer_out: number | null
          ongoing_cycle: boolean | null
          system_id: number | null
          system_name: string | null
          total_biomass: number | null
          total_feed_amount_aggregated: number | null
          total_feed_amount_period: number | null
          total_weight_harvested: number | null
          total_weight_harvested_aggregated: number | null
          total_weight_stocked: number | null
          total_weight_stocked_aggregated: number | null
          total_weight_transfer_in: number | null
          total_weight_transfer_in_aggregated: number | null
          total_weight_transfer_out: number | null
          total_weight_transfer_out_aggregated: number | null
        }
        Relationships: []
      }
      report_feed_incoming_enriched: {
        Row: {
          created_at: string | null
          crude_fat_percentage: number | null
          crude_protein_percentage: number | null
          date: string | null
          farm_id: string | null
          feed_amount: number | null
          feed_category: string | null
          feed_label: string | null
          feed_line: string | null
          feed_pellet_size: string | null
          feed_type_id: number | null
          id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_incoming_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_incoming_feed_id_fkey"
            columns: ["feed_type_id"]
            isOneToOne: false
            referencedRelation: "feed_type"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
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
      api_farm_options_rpc: {
        Args: never
        Returns: {
          id: string
          label: string
          location: string
        }[]
      }
      api_feed_type_options_rpc: {
        Args: never
        Returns: {
          crude_fat_percentage: number
          crude_protein_percentage: number
          feed_category: string
          feed_line: string
          feed_pellet_size: string
          id: number
          label: string
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
      api_time_period_bounds:
        | {
            Args: {
              p_anchor_date?: string
              p_farm_id: string
              p_scope?: string
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
        | {
            Args: {
              p_anchor_date?: string
              p_farm_id: string
              p_time_period: Database["public"]["Enums"]["time_period"]
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
      ensure_reference_system_for_farm: {
        Args: { p_farm_id: string }
        Returns: undefined
      }
      get_farm_kpis_today: {
        Args: { p_farm_id: string }
        Returns: {
          active_systems: number
          do_compliance_pct: number
          farm_biomass_kg: number
          feed_today_kg: number
          min_stock_days: number
          mortality_today: number
          systems_fed: number
          systems_missing_feed: number
          unacked_critical: number
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
      get_fcr_trend_window: {
        Args: {
          p_end_date?: string
          p_farm_id: string
          p_start_date: string
          p_system_id: number
        }
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
      get_growth_trend_window: {
        Args: { p_end_date?: string; p_start_date: string; p_system_id: number }
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
      has_farm_role:
        | { Args: { farm: string; roles: string[] }; Returns: boolean }
        | {
            Args: { _user_id: string; farm: string; roles: string[] }
            Returns: boolean
          }
      is_farm_member:
        | { Args: { farm: string }; Returns: boolean }
        | { Args: { _user_id: string; farm: string }; Returns: boolean }
      process_inventory_queue: {
        Args: { p_limit?: number }
        Returns: {
          processed_from_date: string
          processed_system_id: number
          processed_to_date: string
          upserted_days: number
        }[]
      }
      refresh_all_materialized_views: { Args: never; Returns: undefined }
      refresh_daily_water_quality_rating: {
        Args: { p_from?: string; p_system_id?: number; p_to?: string }
        Returns: undefined
      }
      refresh_kpi_materialized_views: { Args: never; Returns: undefined }
      request_matview_refresh: { Args: never; Returns: undefined }
      transfer_impacts_efcr: {
        Args: {
          p_origin_system_id: number
          p_target_system_id: number
          p_transfer_type: Database["public"]["Enums"]["transfer_type"]
        }
        Returns: boolean
      }
      water_quality_rating_label: {
        Args: { p_rating_numeric: number }
        Returns: string
      }
    }
    Enums: {
      arrows: "up" | "down" | "straight"
      change_type_enum: "INSERT" | "UPDATE" | "DELETE"
      feed_category:
        | "pre-starter"
        | "starter"
        | "pre-grower"
        | "grower"
        | "finisher"
        | "broodstock"
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
      feeding_response: "very_good" | "good" | "fair" | "bad"
      system_growth_stage: "grow_out" | "nursing"
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
      units: "m" | "mg/l" | "ppt" | "┬░C" | "pH" | "NTU" | "┬╡S/cm"
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
      arrows: ["up", "down", "straight"],
      change_type_enum: ["INSERT", "UPDATE", "DELETE"],
      feed_category: [
        "pre-starter",
        "starter",
        "pre-grower",
        "grower",
        "finisher",
        "broodstock",
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
      ],
      feeding_response: ["very_good", "good", "fair", "bad"],
      system_growth_stage: ["grow_out", "nursing"],
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
      units: ["m", "mg/l", "ppt", "┬░C", "pH", "NTU", "┬╡S/cm"],
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

