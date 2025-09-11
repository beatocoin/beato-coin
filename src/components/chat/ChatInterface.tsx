"use client"

import { useState, FormEvent, useEffect, ReactNode, KeyboardEvent, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Loader2, KeyboardIcon } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Simple type assertions to fix build issues with Next.js 15.2.1
const ButtonComponent = Button as any
const TextareaComponent = Textarea as any
const InputComponent = Input as any
const LabelComponent = Label as any
const SelectComponent = Select as any
const SelectContentComponent = SelectContent as any
const SelectItemComponent = SelectItem as any
const SelectTriggerComponent = SelectTrigger as any
const SelectValueComponent = SelectValue as any
const SendComponent = Send as any
const Loader2Component = Loader2 as any
const KeyboardIconComponent = KeyboardIcon as any
const SwitchComponent = Switch as any
const TooltipProviderComponent = TooltipProvider as any
const TooltipComponent = Tooltip as any
const TooltipTriggerComponent = TooltipTrigger as any
const TooltipContentComponent = TooltipContent as any

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  post_id?: string // Optional post_id for linking to posts
}

interface FormField {
  input: 'none' | 'text' | 'textarea' | 'dropdown' | 'website_credentials'
  input_label?: string
  dropdown_options?: Record<string, string>
  [key: string]: any
}

interface ChatInterfaceProps {
  onSendMessage: (message: string, formData?: Record<string, any>) => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  secondaryButton?: ReactNode
  formFields?: FormField[]
  userId?: string
  agentId?: string
  formData?: Record<string, any>
  setFormData?: React.Dispatch<React.SetStateAction<Record<string, any>>>
}

export function ChatInterface({
  onSendMessage,
  isLoading = false,
  disabled = false,
  placeholder = 'Type your message here...',
  secondaryButton,
  formFields = [],
  userId,
  agentId,
  formData: controlledFormData,
  setFormData: controlledSetFormData
}: ChatInterfaceProps) {
  // Use controlled form state if provided, otherwise local state
  const [uncontrolledFormData, setUncontrolledFormData] = useState<Record<string, any>>({})
  const formData = controlledFormData !== undefined ? controlledFormData : uncontrolledFormData;
  const setFormData = controlledSetFormData !== undefined ? controlledSetFormData : setUncontrolledFormData;
  const [message, setMessage] = useState('')
  // Add state for enter to send toggle
  const [enterToSend, setEnterToSend] = useState(true)
  // Helper to detect mobile
  const [isMobile, setIsMobile] = useState(false);

  // Helper functions for form cache
  const getCacheKey = useCallback(() => {
    if (!userId || !agentId) return null;
    return `agent_form_cache_${userId}_${agentId}`;
  }, [userId, agentId]);

  const getFormCache = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const cacheKey = getCacheKey();
    if (!cacheKey) return null;

    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (!cachedData) return null;

      const { data, expiry } = JSON.parse(cachedData);
      
      // Check if cache has expired (1 day = 86400000 ms)
      if (expiry < Date.now()) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error retrieving form cache:', error);
      return null;
    }
  }, [getCacheKey]);

  const saveFormCache = useCallback((data: Record<string, any>) => {
    if (typeof window === 'undefined') return;
    const cacheKey = getCacheKey();
    if (!cacheKey) return;

    try {
      // Set expiry to 1 day from now
      const expiry = Date.now() + 86400000;
      localStorage.setItem(cacheKey, JSON.stringify({ data, expiry }));
    } catch (error) {
      console.error('Error saving form cache:', error);
    }
  }, [getCacheKey]);

  // Debug form fields
  useEffect(() => {
  }, [formFields]);

  // Initialize form data with cached values or default values from config
  useEffect(() => {
    if (formFields && formFields.length > 0) {
      // Try to get cached form data first
      const cachedFormData = getFormCache();
      
      if (cachedFormData) {
        // Use cached form data if available
        setFormData(cachedFormData);
        return;
      }
      
      // Otherwise use default values from config
      const initialFormData = formFields.reduce((acc, field) => {
        const paramName = Object.keys(field).find(key => 
          !['input', 'input_label', 'dropdown_options'].includes(key)
        );
        
        if (paramName) {
          if (field.input === 'dropdown' && field.dropdown_options && Object.keys(field.dropdown_options).length > 0) {
            // Use the first option as the default for dropdowns
            acc[paramName] = field.dropdown_options[Object.keys(field.dropdown_options)[0]];
          } else if (field.input === 'website_credentials' && field.dropdown_options && Object.keys(field.dropdown_options).length > 0) {
            // Use the first website ID as default for website_credentials
            acc[paramName] = Object.keys(field.dropdown_options)[0]; // Use the ID (key) as default value
          } else if (field.input === 'text' || field.input === 'textarea') {
            // Use the default value from config or an empty string
            acc[paramName] = field[paramName] || ''; 
          } else {
            // Fallback or handle other types if necessary
            acc[paramName] = field[paramName] || null; // Or some other default
          }
        }
        return acc;
      }, {} as Record<string, any>);
      setFormData(initialFormData);
    }
  }, [formFields, getFormCache]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // Check if message is non-empty or if we have form data (specifically including website_id for website_credentials)
    const hasWebsiteId = formData['website_id'] && formData['website_id'].trim() !== '';
    
    if ((message.trim() || hasWebsiteId || Object.keys(formData).length > 0) && !isLoading && !disabled) {
      // Cache the form data before sending
      saveFormCache(formData);
      
      onSendMessage(message.trim(), formData)
      setMessage('')
      // Do NOT reset formData here. Leave as is so values persist.
    }
  }

  // Handle keyboard events in the textarea
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Only handle Enter key press if enterToSend is enabled
    if (enterToSend && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent adding a new line
      
      // Only submit if conditions are met
      const hasWebsiteId = formData['website_id'] && formData['website_id'].trim() !== '';
      if ((message.trim() || hasWebsiteId || Object.keys(formData).length > 0) && !isLoading && !disabled) {
        // Cache the form data before sending
        saveFormCache(formData);
        
        onSendMessage(message.trim(), formData);
        setMessage('');
        // Do NOT reset formData here. Leave as is so values persist.
      }
    }
  };

  const handleFormFieldChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const renderFormField = (field: FormField) => {
    // Special handling for website_credentials which doesn't use a traditional fieldKey
    if (field.input === 'website_credentials') {
      if (!field.dropdown_options) {
        return null;
      }
      return (
        <div key="website_credentials" className="flex flex-col space-y-2 p-3 border border-gray-200 rounded-md mb-4">
          <LabelComponent className="font-semibold">{field.input_label || "Select Website"}</LabelComponent>
          <SelectComponent
            value={formData['website_id'] || ''}
            onValueChange={(value: string) => {
              handleFormFieldChange('website_id', value);
            }}
          >
            <SelectTriggerComponent className="border-2 border-blue-200 focus:border-blue-400">
              <SelectValueComponent>
                {formData['website_id'] ? field.dropdown_options[formData['website_id']] : 'Select a website'}
              </SelectValueComponent>
            </SelectTriggerComponent>
            <SelectContentComponent>
              {Object.entries(field.dropdown_options).map(([value, label]) => (
                <SelectItemComponent key={value} value={value}>
                  {label}
                </SelectItemComponent>
              ))}
            </SelectContentComponent>
          </SelectComponent>
        </div>
      );
    }
    
    // Regular field handling for other input types
    const fieldKey = Object.keys(field).find(key => key !== 'input' && key !== 'input_label' && key !== 'dropdown_options')
    
    if (!fieldKey) return null

    switch (field.input) {
      case 'text':
        return (
          <div key={fieldKey} className="flex flex-col space-y-2">
            <LabelComponent>{field.input_label || fieldKey}</LabelComponent>
            <InputComponent
              value={formData[fieldKey] || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleFormFieldChange(fieldKey, e.target.value)
              }
              placeholder={`Enter ${field.input_label || fieldKey}`}
            />
          </div>
        )
      case 'textarea':
        return (
          <div key={fieldKey} className="flex flex-col space-y-2">
            <LabelComponent>{field.input_label || fieldKey}</LabelComponent>
            <TextareaComponent
              value={formData[fieldKey] || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                handleFormFieldChange(fieldKey, e.target.value)
              }
              placeholder={`Enter ${field.input_label || fieldKey}`}
            />
          </div>
        )
      case 'dropdown':
        if (!field.dropdown_options) return null
        return (
          <div key={fieldKey} className="flex flex-col space-y-2">
            <LabelComponent>{field.input_label || fieldKey}</LabelComponent>
            <SelectComponent
              value={formData[fieldKey] || field[fieldKey]}
              onValueChange={(value: string) => handleFormFieldChange(fieldKey, value)}
            >
              <SelectTriggerComponent>
                <SelectValueComponent>
                  {field.dropdown_options[formData[fieldKey] || field[fieldKey]]}
                </SelectValueComponent>
              </SelectTriggerComponent>
              <SelectContentComponent>
                {Object.entries(field.dropdown_options).map(([value, label]) => (
                  <SelectItemComponent key={value} value={value}>
                    {label}
                  </SelectItemComponent>
                ))}
              </SelectContentComponent>
            </SelectComponent>
          </div>
        )
      default:
        return null
    }
  }

  // Debug rendering of form fields
  useEffect(() => {
    if (formFields.length > 0) {
    }
  }, [formFields]);

  useEffect(() => {
  }, [isLoading, disabled])

  // Toggle enter to send setting
  const toggleEnterToSend = () => {
    setEnterToSend(prev => !prev);
  };

  // Helper to detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-6">
        {formFields.length > 0 && (
          <div className="max-w-[750px] w-full grid grid-cols-1 gap-6 mb-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100 shadow-sm">
            {formFields.map(field => renderFormField(field))}
          </div>
        )}
        <div className="relative max-w-[750px] w-full">
          <TextareaComponent
            value={message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            className={`w-full min-h-[120px] resize-none rounded-xl border-2 bg-background shadow-sm transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 p-[25px]${isMobile ? ' !p-[10px]' : ' p-[25px]'}`}
            disabled={isLoading || disabled}
          />
        </div>
        <div className="flex justify-between items-center max-w-[750px] w-full">
          <div className="flex items-center">
            {!isMobile && (
              <TooltipProviderComponent>
                <TooltipComponent>
                  <TooltipTriggerComponent asChild>
                    <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200">
                      <LabelComponent htmlFor="enter-to-send" className="text-xs text-gray-600 cursor-pointer flex items-center">
                        <KeyboardIconComponent className="h-3 w-3 mr-1" />
                        Enter to send
                      </LabelComponent>
                      <SwitchComponent 
                        id="enter-to-send" 
                        checked={enterToSend} 
                        onCheckedChange={toggleEnterToSend} 
                        aria-label="Toggle Enter to send"
                      />
                    </div>
                  </TooltipTriggerComponent>
                  <TooltipContentComponent>
                    <p className="text-xs">
                      {enterToSend 
                        ? "Press Enter to send message. Use Shift+Enter for new line." 
                        : "Press Enter for new line. Use the Send button to send message."}
                    </p>
                  </TooltipContentComponent>
                </TooltipComponent>
              </TooltipProviderComponent>
            )}
          </div>
          <ButtonComponent 
            type="submit"
            disabled={isLoading || disabled || (!message.trim() && !formData['website_id'])}
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-primary hover:bg-primary/90 text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2Component className="h-4 w-4 animate-spin" />
                <span className="animate-pulse">Thinking...</span>
              </>
            ) : (
              <>
                Send Message
                <SendComponent className="h-4 w-4" />
              </>
            )}
          </ButtonComponent>
        </div>
      </form>
    </div>
  )
} 