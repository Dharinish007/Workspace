export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type HabitSchedule =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] };

export interface Database {
  public: {
    Tables: {
      user_settings: {
        Row: {
          user_id: string;
          display_name: string;
          theme: 'light' | 'dark';
          week_start: 'monday' | 'sunday';
          background_style: 'current' | 'paper' | 'notion';
          habit_default_color: string;
          event_default_color: string;
          last_backup: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string;
          theme?: 'light' | 'dark';
          week_start?: 'monday' | 'sunday';
          background_style?: 'current' | 'paper' | 'notion';
          habit_default_color?: string;
          event_default_color?: string;
          last_backup?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string;
          theme?: 'light' | 'dark';
          week_start?: 'monday' | 'sunday';
          background_style?: 'current' | 'paper' | 'notion';
          habit_default_color?: string;
          event_default_color?: string;
          last_backup?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pages: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          order: number;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          color?: string;
          order?: number;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          color?: string;
          order?: number;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          page_id: string;
          title: string;
          priority: 'high' | 'medium' | 'low';
          important: boolean;
          completed: boolean;
          completed_at: string | null;
          due_date: string | null;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          page_id: string;
          title: string;
          priority?: 'high' | 'medium' | 'low';
          important?: boolean;
          completed?: boolean;
          completed_at?: string | null;
          due_date?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          page_id?: string;
          title?: string;
          priority?: 'high' | 'medium' | 'low';
          important?: boolean;
          completed?: boolean;
          completed_at?: string | null;
          due_date?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_tasks_user_page';
            columns: ['user_id', 'page_id'];
            isOneToOne: false;
            referencedRelation: 'pages';
            referencedColumns: ['user_id', 'id'];
          }
        ];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          schedule: HabitSchedule;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          color?: string;
          schedule?: HabitSchedule | Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          color?: string;
          schedule?: HabitSchedule | Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          user_id: string;
          habit_id: string;
          date: string;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          habit_id: string;
          date: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          habit_id?: string;
          date?: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_habit_logs_user_habit';
            columns: ['user_id', 'habit_id'];
            isOneToOne: false;
            referencedRelation: 'habits';
            referencedColumns: ['user_id', 'id'];
          }
        ];
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          date: string;
          start_time: string | null;
          end_time: string | null;
          color: string;
          category: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          date: string;
          start_time?: string | null;
          end_time?: string | null;
          color?: string;
          category?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          date?: string;
          start_time?: string | null;
          end_time?: string | null;
          color?: string;
          category?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      day_colors: {
        Row: {
          user_id: string;
          date: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          color: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          date?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          title: string | null;
          body: string;
          mood: 'terrible' | 'bad' | 'neutral' | 'good' | 'great' | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          title?: string | null;
          body?: string;
          mood?: 'terrible' | 'bad' | 'neutral' | 'good' | 'great' | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          title?: string | null;
          body?: string;
          mood?: 'terrible' | 'bad' | 'neutral' | 'good' | 'great' | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          tags: string[];
          pinned: boolean;
          pinned_order: number;
          icon: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          content?: string;
          tags?: string[];
          pinned?: boolean;
          pinned_order?: number;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          tags?: string[];
          pinned?: boolean;
          pinned_order?: number;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      validate_habit_schedule: {
        Args: {
          schedule: Json;
        };
        Returns: boolean;
      };
      initialize_user_workspace: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

