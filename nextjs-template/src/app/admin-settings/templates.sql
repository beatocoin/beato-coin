-- Create the templates table with role-based access control
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    styles TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::JSONB,
    version INTEGER DEFAULT 1,
    parent_id UUID REFERENCES templates(id) ON DELETE SET NULL
);

-- Create indexes for templates
CREATE INDEX idx_templates_user_id ON templates(user_id);
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
    t1.user_id,
    t1.parent_id,
    COUNT(t2.id) as total_versions
FROM templates t1
LEFT JOIN templates t2 ON t1.id = t2.parent_id OR t1.id = t2.id
GROUP BY t1.id, t1.name, t1.version, t1.created_at, t1.user_id, t1.parent_id;

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
        user_id,
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
GRANT EXECUTE ON FUNCTION duplicate_template TO service_role; 