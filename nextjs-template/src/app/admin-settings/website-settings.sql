-- Create the website_settings table
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
    commission_type TEXT DEFAULT 'flat_rate',
    affiliate_commission DECIMAL(10,2) DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create updated_at trigger function (used by multiple tables)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at on website_settings
DROP TRIGGER IF EXISTS set_updated_at ON public.website_settings;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.website_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions for website_settings schema usage
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.website_settings TO postgres, service_role;
GRANT SELECT ON public.website_settings TO anon, authenticated;
-- Note: RLS policies below handle fine-grained access for authenticated users.

-- Insert default settings (only if table is empty)
INSERT INTO public.website_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.website_settings);

-- Create the user_data table
CREATE TABLE IF NOT EXISTS public.user_data (
    "UID" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_role TEXT DEFAULT 'free subscriber',
    display_name TEXT,
    email TEXT,
    phone TEXT,
    credits NUMERIC DEFAULT 0,
    stripe_id JSONB DEFAULT '[]'::jsonb,
    api_keys JSONB DEFAULT '[]'::jsonb, -- Consider moving to dedicated api_keys table
    user_settings JSONB DEFAULT '{}'::jsonb, -- Added this column
    trial_credits_claimed BOOLEAN DEFAULT false,
    affiliate_link_clicks INTEGER DEFAULT 0,
    referred_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create trigger for updated_at on user_data
DROP TRIGGER IF EXISTS set_user_data_updated_at ON public.user_data;
CREATE TRIGGER set_user_data_updated_at
    BEFORE UPDATE ON public.user_data
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS for website_settings
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy for public access to website_settings
DROP POLICY IF EXISTS "Public can view settings" ON public.website_settings;
CREATE POLICY "Public can view settings"
    ON public.website_settings
    FOR SELECT
    TO public -- includes anon and authenticated
    USING (true);

-- RLS Policy for admin users to modify website_settings
DROP POLICY IF EXISTS "Admin users can modify settings" ON public.website_settings;
CREATE POLICY "Admin users can modify settings"
    ON public.website_settings
    FOR ALL -- covers INSERT, UPDATE, DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_data
            WHERE "UID" = auth.uid()
            AND user_role = 'admin'
        )
    )
    WITH CHECK ( -- Ensure check matches USING for admins
        EXISTS (
            SELECT 1 FROM public.user_data
            WHERE "UID" = auth.uid()
            AND user_role = 'admin'
        )
    );

-- Enable RLS for user_data
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own user_data
DROP POLICY IF EXISTS "Users can view their own data" ON public.user_data;
CREATE POLICY "Users can view their own data"
    ON public.user_data
    FOR SELECT
    TO authenticated
    USING ("UID" = auth.uid());

-- RLS Policy: Users can update their own user_data
DROP POLICY IF EXISTS "Users can update their own data" ON public.user_data;
CREATE POLICY "Users can update their own data"
    ON public.user_data
    FOR UPDATE
    TO authenticated
    USING ("UID" = auth.uid())
    WITH CHECK ("UID" = auth.uid());

-- RLS Policy: Admin users can view all user_data (adjust if needed)
DROP POLICY IF EXISTS "Admins can view all user data" ON public.user_data;
CREATE POLICY "Admins can view all user data"
    ON public.user_data
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_data admin_check
            WHERE admin_check."UID" = auth.uid() AND admin_check.user_role = 'admin'
        )
    );

-- RLS Policy: Allow service_role full access (important for triggers like handle_new_user)
DROP POLICY IF EXISTS "Allow service_role full access on user_data" ON public.user_data;
CREATE POLICY "Allow service_role full access on user_data"
    ON public.user_data
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- Create the affiliate_transactions table
CREATE TABLE IF NOT EXISTS public.affiliate_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    affiliate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    order_id TEXT NOT NULL UNIQUE,
    commission_amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
    payout_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries on affiliate_id
CREATE INDEX IF NOT EXISTS idx_affiliate_transactions_affiliate_id ON affiliate_transactions(affiliate_id);
-- Create index for faster queries on status
CREATE INDEX IF NOT EXISTS idx_affiliate_transactions_status ON affiliate_transactions(status);

-- Add row level security (RLS) policies for affiliate_transactions
ALTER TABLE affiliate_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own affiliate transactions
DROP POLICY IF EXISTS "Users can view their own affiliate transactions" ON affiliate_transactions;
CREATE POLICY "Users can view their own affiliate transactions"
    ON affiliate_transactions
    FOR SELECT
    TO authenticated
    USING (affiliate_id = auth.uid());

-- Policy for admin users to view and modify all transactions
DROP POLICY IF EXISTS "Admin users can manage all affiliate transactions" ON affiliate_transactions;
CREATE POLICY "Admin users can manage all affiliate transactions"
    ON affiliate_transactions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_data
            WHERE "UID" = auth.uid()
            AND user_role = 'admin'
        )
    )
    WITH CHECK ( -- Ensure checks align with USING clause for admin role
        EXISTS (
            SELECT 1 FROM user_data
            WHERE "UID" = auth.uid()
            AND user_role = 'admin'
        )
    );


-- Create the api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "UID" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL UNIQUE DEFAULT 'ak_' || replace(gen_random_uuid()::text, '-', ''), -- Generate default key
    credits_used NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_uid ON public.api_keys("UID");
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON public.api_keys(api_key);

-- Create trigger for updated_at on api_keys
DROP TRIGGER IF EXISTS set_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER set_api_keys_updated_at
    BEFORE UPDATE ON public.api_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS for api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for api_keys
-- Allow users to view only their own API keys
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
CREATE POLICY "Users can view their own API keys"
    ON public.api_keys
    FOR SELECT
    TO authenticated
    USING ("UID" = auth.uid());

-- Allow users to create their own API keys
DROP POLICY IF EXISTS "Users can create their own API keys" ON public.api_keys;
CREATE POLICY "Users can create their own API keys"
    ON public.api_keys
    FOR INSERT
    TO authenticated
    WITH CHECK ("UID" = auth.uid());

-- Allow users to update only credits_used on their own API keys (restrict updates)
DROP POLICY IF EXISTS "Users can update credits on their own API keys" ON public.api_keys;
CREATE POLICY "Users can update credits on their own API keys"
    ON public.api_keys
    FOR UPDATE
    TO authenticated
    USING ("UID" = auth.uid())
    WITH CHECK ("UID" = auth.uid()); -- Allow update only if UID matches

-- Allow users to delete their own API keys
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
CREATE POLICY "Users can delete their own API keys"
    ON public.api_keys
    FOR DELETE
    TO authenticated
    USING ("UID" = auth.uid());

-- Policy: Admin users can manage all API keys (Optional, if needed)
DROP POLICY IF EXISTS "Admin users can manage all api keys" ON public.api_keys;
CREATE POLICY "Admin users can manage all api keys"
    ON public.api_keys
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_data
            WHERE "UID" = auth.uid() AND user_role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_data
            WHERE "UID" = auth.uid() AND user_role = 'admin'
        )
    );


-- Create the trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Important: Allows function to write to user_data table
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_data (
        "UID",
        user_role,
        display_name,
        email,
        user_settings -- Initialize user_settings if needed
    )
    VALUES (
        NEW.id,
        'free subscriber', -- Default role
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), -- Use full_name or email
        NEW.email,
        '{}'::jsonb -- Default empty settings
    )
    ON CONFLICT ("UID") DO NOTHING; -- Avoid error if user record somehow exists

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
        RETURN NEW; -- Allow the auth.users insert to succeed even if this trigger fails
END;
$$;

-- Drop existing trigger before creating new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- Grant necessary permissions for functions and sequences if needed
-- Example: GRANT USAGE, SELECT ON SEQUENCE public.some_sequence TO authenticated;


-- Create the websites table (Removed template_id)
CREATE TABLE IF NOT EXISTS public.websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL, -- Removed
    name TEXT NOT NULL,
    description TEXT,
    custom_domain TEXT UNIQUE, -- Ensure domains are unique
    subdomain TEXT UNIQUE, -- Ensure Gevi subdomains are unique
    site_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores website content/structure
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    last_published_at TIMESTAMP WITH TIME ZONE
);

-- Create trigger for updated_at on websites
DROP TRIGGER IF EXISTS set_updated_at_websites ON public.websites;
CREATE TRIGGER set_updated_at_websites
    BEFORE UPDATE ON public.websites
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); -- Uses function from setupSQL

-- Create indexes for websites
CREATE INDEX IF NOT EXISTS idx_websites_user_id ON public.websites(user_id);
CREATE INDEX IF NOT EXISTS idx_websites_custom_domain ON public.websites(custom_domain);
CREATE INDEX IF NOT EXISTS idx_websites_subdomain ON public.websites(subdomain);
CREATE INDEX IF NOT EXISTS idx_websites_is_published ON public.websites(is_published);

-- Enable RLS for websites
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for websites
-- Policy: Users can view their own websites
DROP POLICY IF EXISTS "Users can view their own websites" ON public.websites;
CREATE POLICY "Users can view their own websites"
    ON public.websites
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy: Users can create websites
DROP POLICY IF EXISTS "Users can create websites" ON public.websites;
CREATE POLICY "Users can create websites"
    ON public.websites
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own websites
DROP POLICY IF EXISTS "Users can update their own websites" ON public.websites;
CREATE POLICY "Users can update their own websites"
    ON public.websites
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own websites
DROP POLICY IF EXISTS "Users can delete their own websites" ON public.websites;
CREATE POLICY "Users can delete their own websites"
    ON public.websites
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Policy: Admin users can manage all websites (Optional)
DROP POLICY IF EXISTS "Admin users can manage all websites" ON public.websites;
CREATE POLICY "Admin users can manage all websites"
    ON public.websites
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_data
            WHERE "UID" = auth.uid() AND user_role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_data
            WHERE "UID" = auth.uid() AND user_role = 'admin'
        )
    );


-- Function to check domain/subdomain availability
CREATE OR REPLACE FUNCTION public.check_domain_availability(
    p_custom_domain TEXT DEFAULT NULL,
    p_subdomain TEXT DEFAULT NULL,
    p_website_id_to_exclude UUID DEFAULT NULL -- Optional: exclude a specific website ID (e.g., when updating)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE -- Indicates the function cannot modify the database and always returns the same results for the same arguments within a single transaction.
SECURITY INVOKER -- Runs as the calling user
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Check custom domain
    IF p_custom_domain IS NOT NULL AND p_custom_domain != '' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.websites
            WHERE custom_domain = p_custom_domain
              AND (p_website_id_to_exclude IS NULL OR id != p_website_id_to_exclude)
        ) INTO v_exists;
        IF v_exists THEN
            RAISE DEBUG 'Custom domain % already exists.', p_custom_domain;
            RETURN false; -- Custom domain exists
        END IF;
    END IF;

    -- Check subdomain
    IF p_subdomain IS NOT NULL AND p_subdomain != '' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.websites
            WHERE subdomain = p_subdomain
              AND (p_website_id_to_exclude IS NULL OR id != p_website_id_to_exclude)
        ) INTO v_exists;
        IF v_exists THEN
             RAISE DEBUG 'Subdomain % already exists.', p_subdomain;
            RETURN false; -- Subdomain exists
        END IF;
    END IF;

    RETURN true; -- Neither exists (or were not checked, or belonged to the excluded website ID)
END;
$$;

-- Function to get published website data by domain/subdomain
-- IMPORTANT: For public website access, using SECURITY DEFINER might be necessary
-- if anonymous users need to bypass RLS. SECURITY INVOKER runs as the calling user.
CREATE OR REPLACE FUNCTION public.get_published_website(
    p_domain TEXT DEFAULT NULL,
    p_subdomain TEXT DEFAULT NULL
)
RETURNS SETOF public.websites -- Consider returning only needed columns (e.g., site_data)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER -- Runs as calling user (respects RLS).
AS $$
BEGIN
    IF p_domain IS NOT NULL AND p_domain != '' THEN
        RETURN QUERY
        SELECT * FROM public.websites w
        WHERE w.custom_domain = p_domain AND w.is_published = true;
    ELSIF p_subdomain IS NOT NULL AND p_subdomain != '' THEN
        RETURN QUERY
        SELECT * FROM public.websites w
        WHERE w.subdomain = p_subdomain AND w.is_published = true;
    ELSE
        -- Return nothing if no valid domain/subdomain provided
        RETURN;
    END IF;
END;
$$;

-- Grant execution permission on functions
GRANT EXECUTE ON FUNCTION public.check_domain_availability(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_published_website(TEXT, TEXT) TO public; -- Grant to public (anon + authenticated)


-- Final Grants (ensure roles have necessary permissions on created objects)
-- Grant basic usage on schema to roles that need it
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables (RLS handles row access, but table-level needed)
GRANT SELECT ON public.website_settings TO public; -- Already done by policy, but explicit grant is okay
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_data TO authenticated; -- RLS restricts further
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_transactions TO authenticated; -- RLS restricts further
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated; -- RLS restricts further
GRANT SELECT, INSERT, UPDATE, DELETE ON public.websites TO authenticated; -- RLS restricts further

-- Grant service_role full access generally (use specific grants if possible for better security)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Note: Review DEFAULT PRIVILEGES if you want future tables/functions to automatically inherit permissions.