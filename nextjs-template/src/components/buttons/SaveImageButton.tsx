import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';

interface SaveImageButtonProps {
  imageUrl: string;
  orientation?: 'portrait' | 'landscape';
  userId: string;
  className?: string;
}

const SaveImageButton: React.FC<SaveImageButtonProps> = ({ imageUrl, orientation, userId, className }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      // Fetch the image via the Next.js API route to bypass CORS
      const proxyRes = await fetch('/api/proxy-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      if (!proxyRes.ok) throw new Error('Failed to fetch image from proxy');
      const blob = await proxyRes.blob();
      // Determine file extension from content-type or url
      let ext = '';
      const contentType = blob.type;
      if (contentType.startsWith('image/')) {
        ext = contentType.split('/')[1];
      } else {
        // fallback to url extension
        const urlParts = imageUrl.split('.');
        ext = urlParts[urlParts.length - 1].split('?')[0];
      }
      const fileName = `image-${Date.now()}.${ext}`;
      const filePath = `${userId}/${fileName}`;
      const supabase = createClient();
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: blob.type,
      });
      if (uploadError) throw new Error('Upload failed: ' + uploadError.message);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={loading}
      className={`px-5 py-2 rounded font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${className || ''}`}
      style={{ background: colors.primary, opacity: loading ? 0.7 : 1 }}
      aria-busy={loading}
      aria-label="Save Image"
    >
      {loading ? 'Saving...' : success ? 'Saved!' : 'Save Image'}
      {error && <span className="ml-2 text-red-200 text-xs">{error}</span>}
    </button>
  );
};

export default SaveImageButton; 