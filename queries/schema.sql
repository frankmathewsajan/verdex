-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.lstm_input_sequences (
  id bigint NOT NULL DEFAULT nextval('lstm_input_sequences_id_seq'::regclass),
  parameter character varying NOT NULL,
  sequence_index integer NOT NULL,
  input_steps integer NOT NULL DEFAULT 30,
  output_steps integer NOT NULL DEFAULT 10,
  sequence_start_datetime timestamp without time zone NOT NULL,
  sequence_end_datetime timestamp without time zone NOT NULL,
  input_sequence ARRAY NOT NULL,
  target_sequence ARRAY NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  notebook_version character varying,
  CONSTRAINT lstm_input_sequences_pkey PRIMARY KEY (id)
);
CREATE TABLE public.normalized_data (
  id bigint NOT NULL DEFAULT nextval('normalized_data_id_seq'::regclass),
  datetime timestamp without time zone NOT NULL,
  parameter character varying NOT NULL,
  normalized_value numeric NOT NULL,
  original_value numeric NOT NULL,
  scaler_min numeric NOT NULL,
  scaler_max numeric NOT NULL,
  notebook character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT normalized_data_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  user_name text,
  language text DEFAULT 'english'::text CHECK (language = ANY (ARRAY['english'::text, 'hindi'::text, 'telugu'::text])),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  onboarding_completed boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.raw_sensor_readings (
  id bigint NOT NULL DEFAULT nextval('raw_sensor_readings_id_seq'::regclass),
  datetime timestamp without time zone NOT NULL UNIQUE,
  nitrogen numeric NOT NULL,
  phosphorus numeric NOT NULL,
  potassium numeric NOT NULL,
  ph numeric NOT NULL,
  temperature numeric NOT NULL,
  humidity numeric NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  data_source character varying DEFAULT 'csv_import'::character varying,
  CONSTRAINT raw_sensor_readings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sensor_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  latitude numeric NOT NULL CHECK (latitude >= '-90'::integer::numeric AND latitude <= 90::numeric),
  longitude numeric NOT NULL CHECK (longitude >= '-180'::integer::numeric AND longitude <= 180::numeric),
  satellite_count integer,
  bearing numeric,
  nitrogen integer NOT NULL,
  phosphorus integer NOT NULL,
  potassium integer NOT NULL,
  ph numeric NOT NULL CHECK (ph >= 0::numeric AND ph <= 14::numeric),
  moisture integer NOT NULL CHECK (moisture >= 0 AND moisture <= 100),
  temperature numeric,
  humidity numeric,
  soil_conductivity integer,
  device_id text,
  device_name text,
  user_id uuid,
  CONSTRAINT sensor_readings_pkey PRIMARY KEY (id),
  CONSTRAINT sensor_readings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);