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
    PostgrestVersion: "12.0.2 (a4e00ff)"
  }
  public: {
    Tables: {
      systems: {
        Row: {
          system_id: string
          system_type: string | null
          volume: number | null
          width: number | null
          length: number | null
          depth: number | null
          diameter: number | null
          created_at: string
        }
        Insert: {
          system_id: string
          system_type?: string | null
          volume?: number | null
          width?: number | null
          length?: number | null
          depth?: number | null
          diameter?: number | null
          created_at?: string
        }
        Update: {
          system_id?: string
          system_type?: string | null
          volume?: number | null
          width?: number | null
          length?: number | null
          depth?: number | null
          diameter?: number | null
          created_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          supplier_id: string
          name: string
          contact_info: string | null
          created_at: string
        }
        Insert: {
          supplier_id?: string
          name: string
          contact_info?: string | null
          created_at?: string
        }
        Update: {
          supplier_id?: string
          name?: string
          contact_info?: string | null
          created_at?: string
        }
        Relationships: []
      }
      feeds_metadata: {
        Row: {
          feed_id: string
          brand: string | null
          feed_name: string | null
          pellet_size: string | null
          manufacturing_location: string | null
          created_at: string
        }
        Insert: {
          feed_id: string
          brand?: string | null
          feed_name?: string | null
          pellet_size?: string | null
          manufacturing_location?: string | null
          created_at?: string
        }
        Update: {
          feed_id?: string
          brand?: string | null
          feed_name?: string | null
          pellet_size?: string | null
          manufacturing_location?: string | null
          created_at?: string
        }
        Relationships: []
      }
      fingerlings_metadata: {
        Row: {
          fingerling_id: string
          supplier_id: string | null
          brand: string | null
          fingerling_name: string | null
          manufacturing_location: string | null
          created_at: string
        }
        Insert: {
          fingerling_id?: string
          supplier_id?: string | null
          brand?: string | null
          fingerling_name?: string | null
          manufacturing_location?: string | null
          created_at?: string
        }
        Update: {
          fingerling_id?: string
          supplier_id?: string | null
          brand?: string | null
          fingerling_name?: string | null
          manufacturing_location?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fingerlings_metadata_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["supplier_id"]
          }
        ]
      }
      mortality_events: {
        Row: {
          id: string
          system_id: string | null
          date: string
          number_of_fish: number | null
          total_weight: number | null
          average_body_weight: number | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          system_id?: string | null
          date: string
          number_of_fish?: number | null
          total_weight?: number | null
          average_body_weight?: number | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          system_id?: string | null
          date?: string
          number_of_fish?: number | null
          total_weight?: number | null
          average_body_weight?: number | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortality_events_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["system_id"]
          }
        ]
      }
      feeding_events: {
        Row: {
          id: string
          system_id: string | null
          date: string
          amount: number | null
          feed_id: string | null
          feeding_response: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          system_id?: string | null
          date: string
          amount?: number | null
          feed_id?: string | null
          feeding_response?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          system_id?: string | null
          date?: string
          amount?: number | null
          feed_id?: string | null
          feeding_response?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feeding_events_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "feeding_events_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feeds_metadata"
            referencedColumns: ["feed_id"]
          }
        ]
      }
      sampling_events: {
        Row: {
          id: string
          system_id: string | null
          date: string
          number_of_samples: number | null
          total_weight: number | null
          average_body_weight: number | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          system_id?: string | null
          date: string
          number_of_samples?: number | null
          total_weight?: number | null
          average_body_weight?: number | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          system_id?: string | null
          date?: string
          number_of_samples?: number | null
          total_weight?: number | null
          average_body_weight?: number | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sampling_events_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["system_id"]
          }
        ]
      }
      transfer_events: {
        Row: {
          id: string
          origin_system_id: string | null
          target_system_id: string | null
          date: string
          number_of_fish: number | null
          total_weight: number | null
          average_body_weight: number | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          origin_system_id?: string | null
          target_system_id?: string | null
          date: string
          number_of_fish?: number | null
          total_weight?: number | null
          average_body_weight?: number | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          origin_system_id?: string | null
          target_system_id?: string | null
          date?: string
          number_of_fish?: number | null
          total_weight?: number | null
          average_body_weight?: number | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_events_origin_system_id_fkey"
            columns: ["origin_system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "transfer_events_target_system_id_fkey"
            columns: ["target_system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["system_id"]
          }
        ]
      }
      harvest_events: {
        Row: {
          id: string
          system_id: string | null
          date: string
          number_of_fish: number | null
          total_weight: number | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          system_id?: string | null
          date: string
          number_of_fish?: number | null
          total_weight?: number | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          system_id?: string | null
          date?: string
          number_of_fish?: number | null
          total_weight?: number | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "harvest_events_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["system_id"]
          }
        ]
      }
      water_quality_events: {
        Row: {
          id: string
          system_id: string | null
          date: string
          dissolved_oxygen: number | null
          total_ammonia: number | null
          no2: number | null
          temperature: number | null
          ph: number | null
          no3: number | null
          secchi_disk: number | null
          salinity: number | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          system_id?: string | null
          date: string
          dissolved_oxygen?: number | null
          total_ammonia?: number | null
          no2?: number | null
          temperature?: number | null
          ph?: number | null
          no3?: number | null
          secchi_disk?: number | null
          salinity?: number | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          system_id?: string | null
          date?: string
          dissolved_oxygen?: number | null
          total_ammonia?: number | null
          no2?: number | null
          temperature?: number | null
          ph?: number | null
          no3?: number | null
          secchi_disk?: number | null
          salinity?: number | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_quality_events_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["system_id"]
          }
        ]
      }
      incoming_feed_events: {
        Row: {
          id: string
          feed_id: string | null
          date_of_arrival: string
          amount: number | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          feed_id?: string | null
          date_of_arrival: string
          amount?: number | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          feed_id?: string | null
          date_of_arrival?: string
          amount?: number | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incoming_feed_events_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feeds_metadata"
            referencedColumns: ["feed_id"]
          }
        ]
      }
      _affected_systems: {
        Row: {
          system_id: number
        }
        Insert: {
          system_id: number
        }
        Update: {
          system_id?: number
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
          record_id: number
          table_name: string
        }
        Insert: {
          change_time?: string
          change_type: string
          column_name?: string | null
          id?: number
          new_value?: string | null
          old_value?: string | null
          record_id: number
          table_name: string
        }
        Update: {
          change_time?: string
          change_type?: string
          column_name?: string | null
          id?: number
          new_value?: string | null
          old_value?: string | null
          record_id?: number
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
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_time_period: {
        Row: {
          created_at: string
          date_end: string | null
          date_start: string | null
          days_since_end: number | null
          days_since_start: number | null
          id: number
          time_period: Database["public"]["Enums"]["time_period"]
        }
        Insert: {
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          days_since_end?: number | null
          days_since_start?: number | null
          id?: number
          time_period: Database["public"]["Enums"]["time_period"]
        }
        Update: {
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          days_since_end?: number | null
          days_since_start?: number | null
          id?: number
          time_period?: Database["public"]["Enums"]["time_period"]
        }
        Relationships: []
      }
      electrical_appliance: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      feed_incoming: {
        Row: {
          created_at: string
          date: string
          feed_amount: number
          feed_type_id: number | null
          id: number
        }
        Insert: {
          created_at?: string
          date: string
          feed_amount: number
          feed_type_id?: number | null
          id?: number
        }
        Update: {
          created_at?: string
          date?: string
          feed_amount?: number
          feed_type_id?: number | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "feed_incoming_feed_id_fkey"
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
          id: number
          name: string
          number_of_fish: number | null
          supplier_id: number
        }
        Insert: {
          abw?: number | null
          created_at?: string
          date_of_delivery: string
          id?: number
          name: string
          number_of_fish?: number | null
          supplier_id: number
        }
        Update: {
          abw?: number | null
          created_at?: string
          date_of_delivery?: string
          id?: number
          name?: string
          number_of_fish?: number | null
          supplier_id?: number
        }
        Relationships: [
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
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      fish_mortality: {
        Row: {
          abw: number | null
          batch_id: number | null
          created_at: string
          date: string
          id: number
          number_of_fish_mortality: number
          system_id: number
          total_weight_mortality: number | null
        }
        Insert: {
          abw?: number | null
          batch_id?: number | null
          created_at?: string
          date: string
          id?: number
          number_of_fish_mortality: number
          system_id: number
          total_weight_mortality?: number | null
        }
        Update: {
          abw?: number | null
          batch_id?: number | null
          created_at?: string
          date?: string
          id?: number
          number_of_fish_mortality?: number
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
          id: number
          number_of_fish_transfer: number
          origin_system_id: number
          target_system_id: number
          total_weight_transfer: number
        }
        Insert: {
          abw?: number | null
          batch_id?: number | null
          created_at?: string
          date: string
          id?: number
          number_of_fish_transfer: number
          origin_system_id: number
          target_system_id: number
          total_weight_transfer: number
        }
        Update: {
          abw?: number | null
          batch_id?: number | null
          created_at?: string
          date?: string
          id?: number
          number_of_fish_transfer?: number
          origin_system_id?: number
          target_system_id?: number
          total_weight_transfer?: number
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
      input: {
        Row: {
          created_at: string
          id: number
          input_end_date: string | null
          input_start_date: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          input_end_date?: string | null
          input_start_date?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          input_end_date?: string | null
          input_start_date?: string | null
        }
        Relationships: []
      }
      power_consumption: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
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
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_production_historical: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      solar_production_prediction: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      stocking_events: {
        Row: {
          average_body_weight_g: number
          created_at: string | null
          created_by: string | null
          id: string
          number_of_fish: number
          source: string | null
          stocking_date: string
          system_id: string
          total_weight_kg: number
        }
        Insert: {
          average_body_weight_g: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          number_of_fish: number
          source?: string | null
          stocking_date: string
          system_id: string
          total_weight_kg: number
        }
        Update: {
          average_body_weight_g?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          number_of_fish?: number
          source?: string | null
          stocking_date?: string
          system_id?: string
          total_weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "stocking_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      system: {
        Row: {
          created_at: string
          depth: number | null
          diameter: number | null
          growth_stage: Database["public"]["Enums"]["system_growth_stage"]
          id: number
          length: number | null
          name: string
          type: Database["public"]["Enums"]["system_type"]
          volume: number | null
          width: number | null
        }
        Insert: {
          created_at?: string
          depth?: number | null
          diameter?: number | null
          growth_stage: Database["public"]["Enums"]["system_growth_stage"]
          id?: number
          length?: number | null
          name: string
          type: Database["public"]["Enums"]["system_type"]
          volume?: number | null
          width?: number | null
        }
        Update: {
          created_at?: string
          depth?: number | null
          diameter?: number | null
          growth_stage?: Database["public"]["Enums"]["system_growth_stage"]
          id?: number
          length?: number | null
          name?: string
          type?: Database["public"]["Enums"]["system_type"]
          volume?: number | null
          width?: number | null
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
            referencedRelation: "system"
            referencedColumns: ["id"]
          }
        ]
      }

    }
    Views: {
      dashboard: {
        Row: {
          abw: number | null
          avg_water_quality: number | null
          biomass: number | null
          efcr: number | null
          efcr_arrow: Database["public"]["Enums"]["arrows"] | null
          growth_stage:
          | Database["public"]["Enums"]["system_growth_stage"]
          | null
          mortality_count: number | null
          prev_efcr: number | null
          prev_mortality: number | null
          start_stock: number | null
          system_id: number | null
          time_period: string | null
          total_feed: number | null
          total_gain: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_fish_inventory_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_events: {
        Row: {
          average_body_weight: number | null
          created_at: string
          created_by: string | null
          date: string
          id: string
          number_of_fish: number | null
          origin_system_id: string | null
          target_system_id: string | null
          total_weight: number | null
        }
        Insert: {
          average_body_weight?: number | null
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          number_of_fish?: number | null
          origin_system_id?: string | null
          target_system_id?: string | null
          total_weight?: number | null
        }
        Update: {
          average_body_weight?: number | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          number_of_fish?: number | null
          origin_system_id?: string | null
          target_system_id?: string | null
          total_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_events_origin_system_id_fkey"
            columns: ["origin_system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "transfer_events_target_system_id_fkey"
            columns: ["target_system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["system_id"]
          }
        ]
      }
      systems: {
        Row: {
          system_id: string
          system_type: Database["public"]["Enums"]["system_type"] | null
          growth_stage: Database["public"]["Enums"]["system_growth_stage"] | null
          volume: number | null
          width: number | null
          length: number | null
          depth: number | null
          diameter: number | null
          created_at: string
        }
        Insert: {
          system_id: string
          system_type?: Database["public"]["Enums"]["system_type"] | null
          growth_stage?: Database["public"]["Enums"]["system_growth_stage"] | null
          volume?: number | null
          width?: number | null
          length?: number | null
          depth?: number | null
          diameter?: number | null
          created_at?: string
        }
        Update: {
          system_id?: string
          system_type?: Database["public"]["Enums"]["system_type"] | null
          growth_stage?: Database["public"]["Enums"]["system_growth_stage"] | null
          volume?: number | null
          width?: number | null
          length?: number | null
          depth?: number | null
          diameter?: number | null
          created_at?: string
        }
        Relationships: []
      }
      dashboard_consolidated: {
        Row: {
          current_end: string | null
          current_start: string | null
          efcr_arrow: Database["public"]["Enums"]["arrows"] | null
          farm_abw: number | null
          farm_avg_water_quality: number | null
          farm_biomass: number | null
          farm_efcr: number | null
          farm_mortality_count: number | null
          farm_survival_rate: number | null
          prev_farm_efcr: number | null
          time_period: string | null
        }
        Relationships: []
      }
      production_summary: {
        Row: {
          average_body_weight: number | null
          biomass_density: number | null
          cumulative_mortality: number | null
          daily_biomass_gain: number | null
          daily_mortality_count: number | null
          date: string | null
          efcr_period: number | null
          feeding_amount_aggregated: number | null
          growth_stage:
          | Database["public"]["Enums"]["system_growth_stage"]
          | null
          number_of_fish_inventory: number | null
          system_id: number | null
          system_name: string | null
          system_volume: number | null
          total_biomass: number | null
          total_feed_amount_period: number | null
          water_quality_rating: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_fish_inventory_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_daily_fish_inventory_consolidated: {
        Args: never
        Returns: undefined
      }
      create_dashboard: { Args: never; Returns: undefined }
      create_dashboard_consolidated: { Args: never; Returns: undefined }
      create_efcr_period_last_sampling_view: { Args: never; Returns: undefined }
      create_production_summary: { Args: never; Returns: undefined }
      refresh_all_materialized_views: { Args: never; Returns: undefined }
      update_daily_fish_inventory_table: { Args: never; Returns: undefined }
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
      feeding_response: "very_good" | "good" | "bad"
      system_growth_stage: "grow_out" | "nursing"
      system_type: "cage" | "compartment" | "all_active_cages"
      time_period:
      | "day"
      | "week"
      | "2 weeks"
      | "month"
      | "quarter"
      | "6 months"
      | "year"
      type_of_harvest: "partial" | "final"
      type_of_stocking: "empty" | "already_stocked"
      units: "m" | "mg/l" | "ppt" | "┬░C"
      water_quality_parameters:
      | "pH"
      | "temperature"
      | "dissolved_oxygen"
      | "secchi_disk_depth"
      | "nitrite"
      | "nitrate"
      | "ammonia_ammonium"
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
      feeding_response: ["very_good", "good", "bad"],
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
      type_of_harvest: ["partial", "final"],
      type_of_stocking: ["empty", "already_stocked"],
      units: ["m", "mg/l", "ppt", "┬░C"],
      water_quality_parameters: [
        "pH",
        "temperature",
        "dissolved_oxygen",
        "secchi_disk_depth",
        "nitrite",
        "nitrate",
        "ammonia_ammonium",
        "salinity",
      ],
      water_quality_rating: ["optimal", "acceptable", "critical", "lethal"],
    },
  },
} as const
