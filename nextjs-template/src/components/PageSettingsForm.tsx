"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import Loading from '@/components/ui/loading'
import toast, { Toaster } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { clearPageSettingsCache } from "@/utils/page-settings"

interface PageSettings {
  agents?: {
    title: string
    link_text: string
    description: string
  }
  pricing?: {
    title: string
    link_text: string
    description: string
  }
}

interface WebsiteSettings {
  id: string
  page_settings: PageSettings
}

export default function PageSettingsForm() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [settings, setSettings] = useState<WebsiteSettings | null>(null)
  const [formData, setFormData] = useState({
    agents: {
      title: '',
      link_text: '',
      description: ''
    },
    pricing: {
      title: '',
      link_text: '',
      description: ''
    }
  })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('website_settings')
          .select('id, page_settings')
          .single()

        if (error) throw error

        setSettings(data)
        if (data?.page_settings) {
          setFormData({
            agents: {
              title: data.page_settings.agents?.title || '',
              link_text: data.page_settings.agents?.link_text || '',
              description: data.page_settings.agents?.description || ''
            },
            pricing: {
              title: data.page_settings.pricing?.title || '',
              link_text: data.page_settings.pricing?.link_text || '',
              description: data.page_settings.pricing?.description || ''
            }
          })
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        toast.error('Failed to load page settings')
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!settings?.id) throw new Error('No settings ID found')

      const { error } = await supabase
        .from('website_settings')
        .update({
          page_settings: {
            ...settings.page_settings,
            agents: formData.agents,
            pricing: formData.pricing
          }
        })
        .eq('id', settings.id)

      if (error) throw error

      // Clear the page settings cache after successful update
      clearPageSettingsCache()

      toast.success('Settings updated successfully', {
        position: 'top-center',
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#FFFFFF',
          padding: '16px',
          borderRadius: '8px',
        },
        iconTheme: {
          primary: '#FFFFFF',
          secondary: '#10B981',
        },
      })
    } catch (error: any) {
      console.error('Error updating settings:', error)
      toast.error(error.message || 'Failed to update settings', {
        position: 'top-center',
        duration: 3000,
        style: {
          background: '#EF4444',
          color: '#FFFFFF',
          padding: '16px',
          borderRadius: '8px',
        },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const [section, field] = name.split('.')
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }))
  }

  if (isLoading) return <Loading />

  return (
    <form onSubmit={handleSubmit}>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
          },
        }}
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Agents Page Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="agents.title">Page Title</Label>
              <Input
                id="agents.title"
                name="agents.title"
                value={formData.agents.title}
                onChange={handleChange}
                placeholder="Enter page title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agents.link_text">Link Text</Label>
              <Input
                id="agents.link_text"
                name="agents.link_text"
                value={formData.agents.link_text}
                onChange={handleChange}
                placeholder="Enter link text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agents.description">Description</Label>
              <Textarea
                id="agents.description"
                name="agents.description"
                value={formData.agents.description}
                onChange={handleChange}
                placeholder="Enter page description"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing Page Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pricing.title">Page Title</Label>
              <Input
                id="pricing.title"
                name="pricing.title"
                value={formData.pricing.title}
                onChange={handleChange}
                placeholder="Enter page title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricing.link_text">Link Text</Label>
              <Input
                id="pricing.link_text"
                name="pricing.link_text"
                value={formData.pricing.link_text}
                onChange={handleChange}
                placeholder="Enter link text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricing.description">Description</Label>
              <Textarea
                id="pricing.description"
                name="pricing.description"
                value={formData.pricing.description}
                onChange={handleChange}
                placeholder="Enter page description"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </form>
  )
} 