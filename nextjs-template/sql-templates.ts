export const setupSQL = `-- Create the website_settings table
CREATE TABLE IF NOT EXISTS public.website_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_publishable_key TEXT NOT NULL DEFAULT '',
    stripe_secret_key TEXT NOT NULL DEFAULT '',
    stripe_webhook_secret TEXT NOT NULL DEFAULT '',
    stripe_connected_account_id TEXT NOT NULL DEFAULT '',
    site_name TEXT NOT NULL DEFAULT 'Site Name',
    site_description TEXT NOT NULL DEFAULT 'Create and manage websites easily',
    site_domain TEXT NOT NULL DEFAULT '',
    theme_colors JSONB NOT NULL DEFAULT '{
        "primary":"#5EB1BF",
        "secondary":"#F8FDFF",
        "dark":"#233D4D",
        "accent1":"#E07A5F",
        "accent2":"#FCB97D",
        "header":"#FFFFFF",
        "pageBackground":"#F8FDFF"
    }'::jsonb,
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    contact_email TEXT,
    social_links JSONB DEFAULT '{"twitter":"","facebook":"","linkedin":""}'::jsonb,
    analytics_id TEXT,
    seo_settings JSONB DEFAULT '{"meta_title":"","meta_description":"","keywords":[]}'::jsonb,
    enable_credits BOOLEAN DEFAULT false,
    trial_credits NUMERIC DEFAULT 0,
    trial_credits_pricing_page BOOLEAN DEFAULT false,
    enable_affiliate BOOLEAN DEFAULT false,
    page_settings JSONB DEFAULT '{}'::jsonb,
    commission_type TEXT DEFAULT 'flat_rate',
    affiliate_commission DECIMAL(10,2) DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create updated_at trigger function for website_settings
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.website_settings;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.website_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions for website_settings
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.website_settings TO postgres, service_role;
GRANT SELECT ON public.website_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.website_settings TO authenticated;

-- Insert default settings (only if table is empty)
INSERT INTO public.website_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.website_settings);

-- Create the user_data table
CREATE TABLE IF NOT EXISTS public.user_data (
    "UID" UUID PRIMARY KEY REFERENCES auth.users(id),
    user_role TEXT DEFAULT 'free subscriber',
    display_name TEXT,
    email TEXT,
    phone TEXT,
    credits NUMERIC DEFAULT 0,
    stripe_id JSONB DEFAULT '[]'::jsonb,
    api_keys JSONB DEFAULT '[]'::jsonb,
    trial_credits_claimed BOOLEAN DEFAULT false,
    affiliate_link_clicks INTEGER DEFAULT 0,
    referred_by TEXT,
    user_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create RLS policies for website_settings
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Policy for public access to settings
CREATE POLICY "Public can view settings"
    ON public.website_settings
    FOR SELECT
    TO public
    USING (true);

-- Policy for authenticated users to view settings
CREATE POLICY "Authenticated users can view settings"
    ON public.website_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for admin users to modify settings
CREATE POLICY "Admin users can modify settings"
    ON public.website_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_data
            WHERE "UID" = auth.uid()
            AND user_role = 'admin'
        )
    );

-- Create the affiliate_transactions table
CREATE TABLE IF NOT EXISTS public.affiliate_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    affiliate_id UUID NOT NULL REFERENCES auth.users(id),
    customer_id TEXT NOT NULL,
    order_id TEXT NOT NULL UNIQUE,
    commission_amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
    payout_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries on affiliate_id
CREATE INDEX idx_affiliate_transactions_affiliate_id ON affiliate_transactions(affiliate_id);

-- Create index for faster queries on status
CREATE INDEX idx_affiliate_transactions_status ON affiliate_transactions(status);

-- Add row level security (RLS) policies for affiliate_transactions
ALTER TABLE affiliate_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own affiliate transactions
CREATE POLICY "Users can view their own affiliate transactions"
ON affiliate_transactions
FOR SELECT
TO authenticated
USING (affiliate_id = auth.uid());

-- Policy for admin users to view and modify all transactions
CREATE POLICY "Admin users can view all affiliate transactions"
ON affiliate_transactions
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_data
        WHERE "UID" = auth.uid()
        AND user_role = 'admin'
    )
);

-- Create the api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "UID" UUID NOT NULL REFERENCES auth.users(id),
    api_key TEXT NOT NULL UNIQUE,
    credits_used NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_uid ON public.api_keys("UID");
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON public.api_keys(api_key);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER set_api_keys_updated_at
    BEFORE UPDATE ON public.api_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow users to view only their own API keys
CREATE POLICY "Users can view their own API keys"
    ON public.api_keys
    FOR SELECT
    TO authenticated
    USING ("UID" = auth.uid());

-- Allow users to create their own API keys
CREATE POLICY "Users can create their own API keys"
    ON public.api_keys
    FOR INSERT
    TO authenticated
    WITH CHECK ("UID" = auth.uid());

-- Allow users to update their own API keys
CREATE POLICY "Users can update their own API keys"
    ON public.api_keys
    FOR UPDATE
    TO authenticated
    USING ("UID" = auth.uid());

-- Allow users to delete their own API keys
CREATE POLICY "Users can delete their own API keys"
    ON public.api_keys
    FOR DELETE
    TO authenticated
    USING ("UID" = auth.uid());

-- Grant permissions
GRANT ALL ON public.api_keys TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;

-- Create the trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_data (
        "UID",
        user_role,
        display_name,
        email
    )
    VALUES (
        NEW.id,
        'free subscriber',
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email
    )
    ON CONFLICT ("UID") DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Create the trigger for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions for user_data
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Create the agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "UID" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  api_url TEXT,
  prompt TEXT,
  agent_role TEXT,
  is_public BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::JSONB
);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_agents_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE FUNCTION update_agents_updated_at_column();

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Create policies

-- 1. Policy for users to select their own agents and public agents
CREATE POLICY "Users can view their own agents and public agents"
ON agents
FOR SELECT
USING (
  ("UID" = auth.uid()) OR (is_public = true)
);

-- 2. Policy for users to insert their own agents
CREATE POLICY "Users can insert their own agents"
ON agents
FOR INSERT
WITH CHECK (
  "UID" = auth.uid()
);

-- 3. Policy for users to update their own agents
CREATE POLICY "Users can update their own agents"
ON agents
FOR UPDATE
USING (
  "UID" = auth.uid()
)
WITH CHECK (
  "UID" = auth.uid()
);

-- 4. Policy for users to delete their own agents
CREATE POLICY "Users can delete their own agents"
ON agents
FOR DELETE
USING (
  "UID" = auth.uid()
);

-- Create the storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);

-- Create a policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND (LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp'))
);

-- Create a policy to allow public access to read files
CREATE POLICY "Allow public to read images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Create a policy to allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Create agent_messages table for storing conversation history
CREATE TABLE IF NOT EXISTS public.agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "UID" UUID REFERENCES auth.users(id),
    agent_id UUID REFERENCES public.agents(id),
    prompt TEXT,
    message TEXT
);

-- Create indexes for faster queries
CREATE INDEX agent_messages_uid_idx ON public.agent_messages("UID");
CREATE INDEX agent_messages_agent_id_idx ON public.agent_messages(agent_id);
CREATE INDEX agent_messages_session_id_idx ON public.agent_messages(session_id);

-- Setup Row Level Security (RLS)
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for access control

-- Allow users to insert their own messages
CREATE POLICY "Users can insert their own messages"
ON public.agent_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "UID");

-- Allow users to read their own messages
CREATE POLICY "Users can read their own messages"
ON public.agent_messages
FOR SELECT
TO authenticated
USING (auth.uid() = "UID");

-- Allow users to read messages from public agents
CREATE POLICY "Users can read messages from public agents"
ON public.agent_messages
FOR SELECT
TO authenticated
USING (
    agent_id IN (
        SELECT id FROM public.agents WHERE is_public = true
    )
);

-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.agent_messages
FOR DELETE
TO authenticated
USING (auth.uid() = "UID");`

export const templatesSQL = `-- Create the templates table with role-based access control
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    styles TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    "UID" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::JSONB,
    version INTEGER DEFAULT 1,
    parent_id UUID REFERENCES templates(id) ON DELETE SET NULL
);

-- Create indexes for templates
CREATE INDEX idx_templates_uid ON templates("UID");
CREATE INDEX idx_templates_is_published ON templates(is_published);

-- Enable Row Level Security for templates
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for templates
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_templates_updated_at();

-- Create policies for templates

-- View policy - Only admin users can view templates
CREATE POLICY "Only admins can view templates"
    ON templates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_data
            WHERE "UID" = auth.uid()
            AND user_role = 'admin'
        )
    );

-- Insert policy - Only admin users can create templates
CREATE POLICY "Only admins can create templates"
    ON templates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_data
            WHERE "UID" = auth.uid()
            AND user_role = 'admin'
        )
    );

-- Update policy - Only admin users can update templates
CREATE POLICY "Only admins can update templates"
    ON templates FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_data
            WHERE "UID" = auth.uid()
            AND user_role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_data
            WHERE "UID" = auth.uid()
            AND user_role = 'admin'
        )
    );

-- Delete policy - Only admin users can delete templates
CREATE POLICY "Only admins can delete templates"
    ON templates FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_data
            WHERE "UID" = auth.uid()
            AND user_role = 'admin'
        )
    );

-- Create template versioning view
CREATE OR REPLACE VIEW template_versions AS
SELECT 
    t1.id,
    t1.name,
    t1.version,
    t1.created_at,
    t1."UID",
    t1.parent_id,
    COUNT(t2.id) as total_versions
FROM templates t1
LEFT JOIN templates t2 ON t1.id = t2.parent_id OR t1.id = t2.id
GROUP BY t1.id, t1.name, t1.version, t1.created_at, t1."UID", t1.parent_id;

-- Create template duplication function
CREATE OR REPLACE FUNCTION duplicate_template(template_id UUID, new_name VARCHAR(255))
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_template_id UUID;
BEGIN
    -- Check if the user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_data
        WHERE "UID" = auth.uid()
        AND user_role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admin users can duplicate templates';
    END IF;

    -- Check if the template exists
    IF NOT EXISTS (
        SELECT 1 FROM templates WHERE id = template_id
    ) THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    -- Create new template as a copy
    INSERT INTO templates (
        name,
        content,
        styles,
        "UID",
        is_published,
        is_template,
        metadata,
        version,
        parent_id
    )
    SELECT
        new_name,
        content,
        styles,
        auth.uid(),
        false,
        false,
        metadata,
        version + 1,
        template_id
    FROM templates
    WHERE id = template_id
    RETURNING id INTO new_template_id;

    RETURN new_template_id;
END;
$$;

-- Revoke existing permissions if any exist
REVOKE ALL ON templates FROM authenticated;
REVOKE ALL ON template_versions FROM authenticated;
REVOKE EXECUTE ON FUNCTION duplicate_template FROM authenticated;
REVOKE ALL ON templates FROM anon;
REVOKE ALL ON template_versions FROM anon;

-- Grant appropriate permissions
GRANT SELECT ON templates TO authenticated;
GRANT SELECT ON template_versions TO authenticated;

-- Grant full access to service role for backend operations
GRANT ALL ON templates TO service_role;
GRANT ALL ON template_versions TO service_role;
GRANT EXECUTE ON FUNCTION duplicate_template TO service_role;`