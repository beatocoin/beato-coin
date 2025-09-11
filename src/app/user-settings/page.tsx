"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/utils/supabase/client"
import { v4 as uuidv4 } from 'uuid'
import { User } from '@supabase/supabase-js'
import Loading from "@/components/ui/loading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusIcon, XIcon } from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"
import toast, { Toaster } from 'react-hot-toast'

// Define the website interface
interface Website {
  id: string
  website_name: string
  website_url: string
  consumer_key: string
  consumer_secret: string
}

// Define form schema using zod
const formSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  phoneNumber: z.string().optional(),
  websites: z.array(
    z.object({
      id: z.string(),
      website_name: z.string().min(1, "Website name is required"),
      website_url: z.string().url("Please enter a valid URL"),
      consumer_key: z.string().min(1, "Consumer key is required"),
      consumer_secret: z.string().min(1, "Consumer secret is required"),
    })
  ).default([]),
})

type FormValues = z.infer<typeof formSchema>

export default function UserSettingsPage() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [websites, setWebsites] = useState<Website[]>([])
  const { colors } = useTheme()
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      phoneNumber: "",
      websites: []
    }
  })

  // Add a new website to the form
  const addWebsite = () => {
    const newWebsite = {
      id: uuidv4(),
      website_name: "",
      website_url: "",
      consumer_key: "",
      consumer_secret: ""
    }
    setWebsites([...websites, newWebsite])
  }

  // Remove a website from the form
  const removeWebsite = (id: string) => {
    setWebsites(websites.filter(site => site.id !== id))
  }

  // Load user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Check if user is logged in
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('Authentication error:', authError)
          window.location.href = '/auth'
          return
        }
        
        if (!user) {
          window.location.href = '/auth'
          return
        }

        setCurrentUser(user)

        // Get user data
        const { data: userData, error: userDataError } = await supabase
          .from('user_data')
          .select('display_name, phone, user_settings')
          .eq('UID', user.id)
          .single()

        if (userDataError) {
          console.error('Error fetching user data:', userDataError)
          setIsLoading(false)
          return
        }

        // Set form values from user data
        setValue('displayName', userData?.display_name || '')
        setValue('phoneNumber', userData?.phone || '')

        // Handle websites from user_settings
        if (userData?.user_settings?.websites && Array.isArray(userData.user_settings.websites)) {
          const loadedWebsites = userData.user_settings.websites.map((site: any) => ({
            id: site.id || uuidv4(),
            website_name: site.website_name || '',
            website_url: site.website_url || '',
            consumer_key: site.consumer_key || '',
            consumer_secret: site.consumer_secret || ''
          }))
          
          setWebsites(loadedWebsites)
          setValue('websites', loadedWebsites)
        } else {
          // Initialize with an empty array instead of a default website
          setWebsites([])
          setValue('websites', [])
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error loading user data:', error)
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [supabase, setValue])

  // Update form values when websites state changes
  useEffect(() => {
    setValue('websites', websites)
  }, [websites, setValue])

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    if (!currentUser) return
    
    setIsSaving(true)
    
    try {
      const userSettings = {
        websites: data.websites
      }
      
      const { error } = await supabase
        .from('user_data')
        .update({
          display_name: data.displayName,
          phone: data.phoneNumber,
          user_settings: userSettings,
          updated_at: new Date()
        })
        .eq('UID', currentUser.id)
      
      if (error) {
        console.error('Error updating user settings:', error)
        toast.error('Failed to save settings', {
          position: 'top-center',
          duration: 3000,
          style: {
            background: '#EF4444',
            color: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
          },
        })
      } else {
        toast.success('Settings saved successfully', {
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
      }
    } catch (error) {
      console.error('Error saving user settings:', error)
      toast.error('An unexpected error occurred', {
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
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="container mx-auto py-8 px-4">
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
      <h1 className="text-2xl font-bold mb-8">User Settings</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                {...register('displayName')}
                placeholder="Enter your display name"
              />
              {errors.displayName && (
                <p className="text-red-500 text-sm mt-1">{errors.displayName.message}</p>
              )}
            </div>
            
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                {...register('phoneNumber')}
                placeholder="Enter your phone number"
              />
              {errors.phoneNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.phoneNumber.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Websites Section */}
        <Card>
          <CardHeader>
            <CardTitle>Websites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {websites.length === 0 ? (
              <p className="text-muted-foreground italic">No websites added yet. Click the button below to add one.</p>
            ) : (
              websites.map((website, index) => (
                <div 
                  key={website.id} 
                  className="space-y-4 p-4 rounded-md"
                  style={{ backgroundColor: colors.dark }}
                >
                  <div className="flex justify-between items-center text-white">
                    <h3 className="text-lg font-medium">Website {index + 1}</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeWebsite(website.id)}
                      className="h-8 w-8 p-0 text-white hover:text-white hover:bg-red-500"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-white">
                    {/* Website Name */}
                    <div className="space-y-2">
                      <Label htmlFor={`websites.${index}.website_name`} className="text-white">Website Name</Label>
                      <Input
                        id={`websites.${index}.website_name`}
                        {...register(`websites.${index}.website_name`)}
                        placeholder="Enter website name"
                        className="bg-white text-black"
                      />
                      {errors.websites?.[index]?.website_name && (
                        <p className="text-red-300 text-sm mt-1">{errors.websites[index]?.website_name?.message}</p>
                      )}
                    </div>
                    
                    {/* Website URL */}
                    <div className="space-y-2">
                      <Label htmlFor={`websites.${index}.website_url`} className="text-white">Website URL</Label>
                      <Input
                        id={`websites.${index}.website_url`}
                        {...register(`websites.${index}.website_url`)}
                        placeholder="Enter website URL"
                        className="bg-white text-black"
                      />
                      {errors.websites?.[index]?.website_url && (
                        <p className="text-red-300 text-sm mt-1">{errors.websites[index]?.website_url?.message}</p>
                      )}
                    </div>
                    
                    {/* Consumer Key */}
                    <div className="space-y-2">
                      <Label htmlFor={`websites.${index}.consumer_key`} className="text-white">Consumer Key</Label>
                      <Input
                        id={`websites.${index}.consumer_key`}
                        {...register(`websites.${index}.consumer_key`)}
                        placeholder="Enter consumer key"
                        className="bg-white text-black"
                      />
                      {errors.websites?.[index]?.consumer_key && (
                        <p className="text-red-300 text-sm mt-1">{errors.websites[index]?.consumer_key?.message}</p>
                      )}
                    </div>
                    
                    {/* Consumer Secret */}
                    <div className="space-y-2">
                      <Label htmlFor={`websites.${index}.consumer_secret`} className="text-white">Consumer Secret</Label>
                      <Input
                        id={`websites.${index}.consumer_secret`}
                        {...register(`websites.${index}.consumer_secret`)}
                        placeholder="Enter consumer secret"
                        className="bg-white text-black"
                      />
                      {errors.websites?.[index]?.consumer_secret && (
                        <p className="text-red-300 text-sm mt-1">{errors.websites[index]?.consumer_secret?.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            <Button
              type="button"
              variant="outline"
              onClick={addWebsite}
              className="w-[250px] mx-auto flex items-center justify-center"
              style={{ borderColor: colors.accent1, color: colors.accent1 }}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Website
            </Button>
          </CardContent>
        </Card>
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isSaving}
            style={{ backgroundColor: colors.primary }}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  )
}