"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/utils/supabase/client"
import { v4 as uuidv4 } from 'uuid'
import toast, { Toaster } from 'react-hot-toast'
import Link from "next/link"
import { useTheme } from "@/contexts/ThemeContext"
import { IconPicker } from "@/components/ui/icon-picker"

// UI components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusIcon, XIcon } from "lucide-react"

// Simple type assertions to fix build issues with Next.js 15.2.1
const ButtonComponent = Button as any
const InputComponent = Input as any
const LabelComponent = Label as any
const SelectComponent = Select as any
const SelectContentComponent = SelectContent as any
const SelectItemComponent = SelectItem as any
const SelectTriggerComponent = SelectTrigger as any
const SelectValueComponent = SelectValue as any
const SwitchComponent = Switch as any
const TextareaComponent = Textarea as any
const CardComponent = Card as any
const CardContentComponent = CardContent as any
const CardHeaderComponent = CardHeader as any
const CardTitleComponent = CardTitle as any
const PlusIconComponent = PlusIcon as any
const XIconComponent = XIcon as any
const LinkComponent = Link as any

// Header field interface
interface HeaderField {
  id: string
  param: string
  value: string
}

// Body field interface
interface DropdownOption {
  id: string
  value: string
  label: string
}

interface BodyField {
  id: string
  param: string
  value: string
  formInput: 'none' | 'text' | 'textarea' | 'dropdown' | 'website_credentials'
  input_label?: string
  dropdownOptions?: DropdownOption[]
}

// Form schema with validation
const agentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  api_url: z.string().url("Please enter a valid URL").nullable().optional(),
  prompt: z.string().optional().nullable(),
  agent_role: z.string().optional().nullable(),
  is_public: z.boolean().default(false),
  config: z.record(z.string(), z.any()).optional().nullable(),
  placeholder: z.string().optional().nullable(),
  max_tokens: z.string().optional().nullable(),
  temperature: z.string().optional().nullable(),
  top_p: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
})

// Define the form values type
type AgentFormValues = z.infer<typeof agentFormSchema>

// Define the AgentFormProps interface
export interface AgentFormProps {
  mode: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    description: string
    api_url: string | null
    prompt: string | null
    agent_role: string | null
    is_public: boolean
    config: Record<string, any> | null
    icon?: string | null
  }
  onSubmit?: (data: AgentFormValues) => Promise<void>
}

export function AgentForm({ mode, initialData, onSubmit }: AgentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  const [headers, setHeaders] = useState<HeaderField[]>([])
  const [bodyParams, setBodyParams] = useState<BodyField[]>([])
  const { colors } = useTheme()
  
  // Initialize form with react-hook-form
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      api_url: initialData?.api_url || "",
      prompt: initialData?.prompt || "",
      agent_role: initialData?.agent_role || "",
      is_public: initialData?.is_public || false,
      config: initialData?.config || {},
      placeholder: initialData?.config?.options?.placeholder || "",
      max_tokens: initialData?.config?.options?.max_tokens || "",
      temperature: initialData?.config?.options?.temperature || "",
      top_p: initialData?.config?.options?.top_p || "",
      icon: initialData?.icon || "Bot",
    },
  })

  // Initialize headers and body params from config if they exist
  useEffect(() => {
    if (initialData?.config?.headers) {
      const initialHeaders = Object.entries(initialData.config.headers).map(([param, value]) => ({
        id: uuidv4(),
        param,
        value: value as string
      }));
      setHeaders(initialHeaders);
    }

    if (initialData?.config?.body) {
      const initialBodyParams = initialData.config.body.map((param: any) => {
        // Find the parameter name (first key that's not input, input_label, or dropdown_options)
        const paramName = Object.keys(param).find(key => 
          !['input', 'input_label', 'dropdown_options'].includes(key)
        ) || '';

        // Convert dropdown options to array format if they exist
        const dropdownOptions = param.dropdown_options ? 
          Object.entries(param.dropdown_options).map(([value, label]) => ({
            id: uuidv4(),
            value,
            label: label as string
          })) : [];

        return {
          id: uuidv4(),
          param: paramName,
          value: param[paramName] || '',
          formInput: param.input || 'none',
          input_label: param.input_label || '',
          dropdownOptions: dropdownOptions
        };
      });
      setBodyParams(initialBodyParams);
    }
  }, [initialData]);

  // Add a new header field
  const addHeader = () => {
    setHeaders([...headers, { id: uuidv4(), param: '', value: '' }]);
  };

  // Remove a header field
  const removeHeader = (id: string) => {
    setHeaders(headers.filter(header => header.id !== id));
  };

  // Update a header field
  const updateHeader = (id: string, field: 'param' | 'value', value: string) => {
    setHeaders(headers.map(header => 
      header.id === id ? { ...header, [field]: value } : header
    ));
  };

  // Add functions to handle dropdown options
  const addDropdownOption = (bodyParamId: string) => {
    setBodyParams(prev => prev.map(param => {
      if (param.id === bodyParamId) {
        return {
          ...param,
          dropdownOptions: [...(param.dropdownOptions || []), {
            id: uuidv4(),
            value: '',
            label: ''
          }]
        }
      }
      return param
    }))
  }

  const removeDropdownOption = (bodyParamId: string, optionId: string) => {
    setBodyParams(prev => prev.map(param => {
      if (param.id === bodyParamId) {
        return {
          ...param,
          dropdownOptions: param.dropdownOptions?.filter(opt => opt.id !== optionId) || []
        }
      }
      return param
    }))
  }

  const updateDropdownOption = (bodyParamId: string, optionId: string, field: keyof DropdownOption, value: string) => {
    setBodyParams(prev => prev.map(param => {
      if (param.id === bodyParamId) {
        return {
          ...param,
          dropdownOptions: param.dropdownOptions?.map(opt => 
            opt.id === optionId ? { ...opt, [field]: value } : opt
          ) || []
        }
      }
      return param
    }))
  }

  const addBodyParam = () => {
    setBodyParams(prev => [...prev, { 
      id: uuidv4(), 
      param: '', 
      value: '', 
      formInput: 'none',
      input_label: '',
      dropdownOptions: []
    }])
  }

  // Remove a body parameter
  const removeBodyParam = (id: string) => {
    setBodyParams(prev => prev.filter(param => param.id !== id))
  }

  // Update a body parameter
  const updateBodyParam = (id: string, field: keyof BodyField, value: string) => {
    setBodyParams(prev => prev.map(param => 
      param.id === id ? { ...param, [field]: value } : param
    ))
  }

  const handleSubmit = async (data: AgentFormValues) => {
    setIsSubmitting(true)
    try {
      // Convert headers array to object format for the config
      const headersObject: Record<string, string> = {};
      headers.forEach(header => {
        if (header.param.trim()) {
          headersObject[header.param.trim()] = header.value;
        }
      });

      // Convert body params array to object format for the config
      const bodyArray: Record<string, any>[] = [];
      bodyParams.forEach(param => {
        if (param.param.trim()) {
          if (param.formInput === 'website_credentials') {
            // For website_credentials, only include input and input_label
            const bodyParam: Record<string, any> = {
              input: 'website_credentials'
            };

            if (param.input_label) {
              bodyParam.input_label = param.input_label;
            }

            bodyArray.push(bodyParam);
          } else {
            // For all other param types
            const bodyParam: Record<string, any> = {
              [param.param.trim()]: param.value,
              input: param.formInput
            };

            // Add input label if it exists and form input is not 'none'
            if (param.formInput !== 'none' && param.input_label) {
              bodyParam.input_label = param.input_label;
            }

            // If it's a dropdown, add the options mapping
            if (param.formInput === 'dropdown' && param.dropdownOptions) {
              const dropdownOptions: Record<string, string> = {};
              param.dropdownOptions.forEach(option => {
                if (option.value && option.label) {
                  dropdownOptions[option.value] = option.label;
                }
              });
              bodyParam.dropdown_options = dropdownOptions;
            }

            bodyArray.push(bodyParam);
          }
        }
      });

      // Format config according to the required structure
      data.config = {
        headers: headersObject,
        body: bodyArray,
        options: {
          placeholder: data.placeholder || "",
          max_tokens: data.max_tokens || "",
          temperature: data.temperature || "",
          top_p: data.top_p || "",
          icon: data.icon || "Bot"
        }
      };

      if (onSubmit) {
        await onSubmit(data)
        return
      }
      
      // Default submit behavior if no onSubmit provided
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('You must be logged in to create or edit an agent', {
          position: 'top-center',
          duration: 3000,
          style: {
            background: '#EF4444',
            color: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
          },
        })
        window.location.href = '/auth'
        return
      }

      if (mode === 'create') {
        // Create new agent
        const { data: agent, error } = await supabase
          .from('agents')
          .insert({
            name: data.name,
            description: data.description,
            api_url: data.api_url,
            prompt: data.prompt,
            agent_role: data.agent_role,
            is_public: data.is_public,
            config: data.config || {},
            UID: user.id
          })
          .select()
          .single()

        if (error) {
          toast.error(`Failed to create agent: ${error.message}`, {
            position: 'top-center',
            duration: 3000,
            style: {
              background: '#EF4444',
              color: '#FFFFFF',
              padding: '16px',
              borderRadius: '8px',
            },
          })
          console.error('Error creating agent:', error)
          return
        }

        toast.success('Agent created successfully', {
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

        // Redirect to my-agents page after successful creation
        window.location.href = '/my-agents'
      } else {
        // Update existing agent
        const { error } = await supabase
          .from('agents')
          .update({
            name: data.name,
            description: data.description,
            api_url: data.api_url,
            prompt: data.prompt,
            agent_role: data.agent_role,
            is_public: data.is_public,
            config: data.config || {},
            updated_at: new Date().toISOString()
          })
          .eq('id', initialData?.id)

        if (error) {
          toast.error(`Failed to update agent: ${error.message}`, {
            position: 'top-center',
            duration: 3000,
            style: {
              background: '#EF4444',
              color: '#FFFFFF',
              padding: '16px',
              borderRadius: '8px',
            },
          })
          console.error('Error updating agent:', error)
          return
        }

        toast.success('Agent updated successfully', {
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
      toast.error(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        position: 'top-center',
        duration: 3000,
        style: {
          background: '#EF4444',
          color: '#FFFFFF',
          padding: '16px',
          borderRadius: '8px',
        },
      })
      console.error('Error in handleSubmit:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex justify-center w-full">
      <div style={{ width: '1600px' }} className="px-4 py-6">
        {/* Navigation buttons - horizontally aligned */}
        <div className="flex justify-between items-center mb-4">
          <LinkComponent href="/my-agents">
            <ButtonComponent 
              variant="outline"
            >
              Back to My Agents
            </ButtonComponent>
          </LinkComponent>
          
          {mode === 'edit' && initialData?.id && (
            <LinkComponent href={`/agent?agent_id=${initialData.id}`} target="_blank" rel="noopener noreferrer">
              <ButtonComponent
                style={{ 
                  backgroundColor: colors.dark,
                  color: 'white',
                  border: 'none'
                }}
                className="font-medium"
              >
                View Agent
              </ButtonComponent>
            </LinkComponent>
          )}
        </div>

        <CardComponent>
          <CardHeaderComponent>
            <CardTitleComponent>{mode === 'create' ? 'Create New Agent' : 'Edit Agent'}</CardTitleComponent>
          </CardHeaderComponent>
          <CardContentComponent>
              {/* Toast Container */}
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
              
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                
                <div>
                  <LabelComponent htmlFor="name">Name</LabelComponent>
                  <InputComponent
                    id="name"
                    {...form.register('name')}
                    placeholder="Enter agent name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <IconPicker
                    value={form.watch('icon') || 'Bot'}
                    onChange={(icon) => form.setValue('icon', icon)}
                  />
                  <p className="text-gray-500 text-sm mt-1">
                    Choose an icon to represent your agent.
                  </p>
                </div>
                
                <div>
                  <LabelComponent htmlFor="description">Description</LabelComponent>
                  <TextareaComponent
                    id="description"
                    {...form.register('description')}
                    placeholder="Enter agent description"
                    className="min-h-[100px]"
                  />
                  {form.formState.errors.description && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <SwitchComponent
                      id="is_public"
                      checked={form.watch('is_public')}
                      onCheckedChange={(checked: boolean) => form.setValue('is_public', checked)}
                    />
                    <LabelComponent htmlFor="is_public">Is Public</LabelComponent>
                  </div>
                </div>
              </div>

              {/* Model Configuration */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Model Configuration</h3>
                
                <div>
                  <LabelComponent htmlFor="api_url">API URL</LabelComponent>
                  <InputComponent
                    id="api_url"
                    {...form.register('api_url')}
                    placeholder="Enter API URL"
                  />
                  {form.formState.errors.api_url && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.api_url.message}</p>
                  )}
                </div>
              </div>

              {/* Advanced Configuration */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Advanced Configuration</h3>
                
                <div>
                  <LabelComponent htmlFor="agent_role">Agent Role</LabelComponent>
                  <TextareaComponent
                    id="agent_role"
                    {...form.register('agent_role')}
                    placeholder="Enter agent role (optional)"
                    className="min-h-[100px] font-mono text-sm"
                  />
                  {form.formState.errors.agent_role && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.agent_role.message}</p>
                  )}
                </div>
                
                <div>
                  <LabelComponent htmlFor="prompt">Prompt</LabelComponent>
                  <TextareaComponent
                    id="prompt"
                    {...form.register('prompt')}
                    placeholder="Enter agent prompt (optional)"
                    className="min-h-[150px] font-mono text-sm"
                  />
                  <p className="text-gray-500 text-sm mt-1">
                    This prompt will be used to guide the agent&apos;s responses and submitted with the request. You can use the short code [user_message] and the message from the user will be dynamically inserted into the prompt.
                  </p>
                  <p className="text-gray-500 text-sm mt-1 italic">
                    Example: Give me a business idea for [user_message]
                  </p>
                  {form.formState.errors.prompt && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.prompt.message}</p>
                  )}
                </div>

                {/* New 2x2 grid of fields */}
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <LabelComponent>Model Options</LabelComponent>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <LabelComponent htmlFor="max_tokens">Max Tokens</LabelComponent>
                        <InputComponent
                          id="max_tokens"
                          {...form.register('max_tokens')}
                          placeholder="Enter max tokens"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <LabelComponent htmlFor="temperature">Temperature</LabelComponent>
                        <InputComponent
                          id="temperature"
                          {...form.register('temperature')}
                          placeholder="Enter temperature"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <LabelComponent htmlFor="top_p">Top P</LabelComponent>
                        <InputComponent
                          id="top_p"
                          {...form.register('top_p')}
                          placeholder="Enter top p"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <LabelComponent htmlFor="placeholder">Placeholder Text</LabelComponent>
                        <InputComponent
                          id="placeholder"
                          {...form.register('placeholder')}
                          placeholder="Enter placeholder text"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Headers Repeater Field */}
                  <div className="space-y-4 pt-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Headers</h3>
                      <ButtonComponent
                        type="button"
                        size="sm"
                        onClick={addHeader}
                        className="flex items-center gap-1"
                      >
                        <PlusIconComponent className="h-4 w-4" />
                        Add Header
                      </ButtonComponent>
                    </div>
                    
                    {headers.length === 0 ? (
                      <div></div>
                    ) : (
                      <div className="space-y-3">
                        {headers.map(header => (
                          <div key={header.id} className="flex gap-2 items-start">
                            <div className="flex-1">
                              <LabelComponent htmlFor={`param-${header.id}`} className="text-sm">
                                Parameter
                              </LabelComponent>
                              <InputComponent
                                id={`param-${header.id}`}
                                value={header.param}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateHeader(header.id, 'param', e.target.value)}
                                placeholder="Content-Type"
                                className="mt-1"
                              />
                            </div>
                            <div className="flex-1">
                              <LabelComponent htmlFor={`value-${header.id}`} className="text-sm">
                                Value
                              </LabelComponent>
                              <InputComponent
                                id={`value-${header.id}`}
                                value={header.value}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateHeader(header.id, 'value', e.target.value)}
                                placeholder="application/json"
                                className="mt-1"
                              />
                            </div>
                            <div className="pt-6">
                              <ButtonComponent
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeHeader(header.id)}
                                className="h-8 w-8"
                              >
                                <XIconComponent className="h-4 w-4" />
                              </ButtonComponent>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-gray-500 text-sm mt-1">
                      Add headers that will be sent with each request to the API endpoint. This may include API Authentication Keys.
                    </p>
                  </div>

                  {/* Body Parameters */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Body Parameters</h3>
                      <ButtonComponent
                        type="button"
                        onClick={addBodyParam}
                        className="flex items-center gap-2"
                      >
                        <PlusIconComponent className="h-4 w-4" />
                        Add Parameter
                      </ButtonComponent>
                    </div>
                    
                    {bodyParams.map((param) => (
                      <div key={param.id} className="space-y-4">
                        <div className="flex gap-4 items-start">
                          <div className="flex-1">
                            <LabelComponent>Parameter</LabelComponent>
                            <InputComponent
                              value={param.param}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateBodyParam(param.id, 'param', e.target.value)
                              }
                              placeholder="Parameter name"
                              disabled={param.formInput === 'website_credentials'}
                            />
                          </div>
                          {param.formInput !== 'website_credentials' && (
                            <div className="flex-1">
                              <LabelComponent>Value (default)</LabelComponent>
                              <InputComponent
                                value={param.value}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateBodyParam(param.id, 'value', e.target.value)
                                }
                                placeholder="Parameter value"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <LabelComponent>Form Input</LabelComponent>
                            <SelectComponent
                              value={param.formInput}
                              onValueChange={(value: 'none' | 'text' | 'textarea' | 'dropdown' | 'website_credentials') => {
                                // If website_credentials is selected, set param to "website_credentials" automatically
                                if (value === 'website_credentials') {
                                  updateBodyParam(param.id, 'param', 'website_credentials');
                                }
                                updateBodyParam(param.id, 'formInput', value);
                              }}
                            >
                              <SelectTriggerComponent>
                                <SelectValueComponent />
                              </SelectTriggerComponent>
                              <SelectContentComponent>
                                <SelectItemComponent value="none">None</SelectItemComponent>
                                <SelectItemComponent value="text">Text Field</SelectItemComponent>
                                <SelectItemComponent value="textarea">Text Area</SelectItemComponent>
                                <SelectItemComponent value="dropdown">Dropdown</SelectItemComponent>
                                <SelectItemComponent value="website_credentials">Website Credentials</SelectItemComponent>
                              </SelectContentComponent>
                            </SelectComponent>
                          </div>
                          <ButtonComponent
                            type="button"
                            variant="ghost"
                            onClick={() => removeBodyParam(param.id)}
                            className="mt-8"
                          >
                            <XIconComponent className="h-4 w-4" />
                          </ButtonComponent>
                        </div>

                        {param.formInput !== 'none' && (
                          <div className="flex gap-4 items-start pl-0">
                            <div className="flex-1">
                              <LabelComponent>Input Label</LabelComponent>
                              <InputComponent
                                value={param.input_label || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateBodyParam(param.id, 'input_label', e.target.value)
                                }
                                placeholder="Label for the input field"
                              />
                            </div>
                            <div className="flex-1">
                              {param.formInput === 'dropdown' && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <LabelComponent>Dropdown Options</LabelComponent>
                                    <ButtonComponent
                                      type="button"
                                      onClick={() => addDropdownOption(param.id)}
                                      className="flex items-center gap-2"
                                    >
                                      <PlusIconComponent className="h-4 w-4" />
                                      Add Option
                                    </ButtonComponent>
                                  </div>
                                  <div className="space-y-2">
                                    {param.dropdownOptions?.map((option) => (
                                      <div key={option.id} className="flex gap-4 items-start">
                                        <div className="flex-1">
                                          <LabelComponent className="text-sm">Value</LabelComponent>
                                          <InputComponent
                                            value={option.value}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                              updateDropdownOption(param.id, option.id, 'value', e.target.value)
                                            }
                                            placeholder="Option value"
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <LabelComponent className="text-sm">Label</LabelComponent>
                                          <InputComponent
                                            value={option.label}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                              updateDropdownOption(param.id, option.id, 'label', e.target.value)
                                            }
                                            placeholder="Option label"
                                          />
                                        </div>
                                        <ButtonComponent
                                          type="button"
                                          variant="ghost"
                                          onClick={() => removeDropdownOption(param.id, option.id)}
                                          className="mt-6"
                                        >
                                          <XIconComponent className="h-4 w-4" />
                                        </ButtonComponent>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              {/* Empty div to maintain grid alignment */}
                            </div>
                            <div className="w-10">
                              {/* Empty div to maintain alignment with remove button above */}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <ButtonComponent 
                  type="submit" 
                  disabled={isSubmitting || !form.formState.isValid}
                    className="px-6"
                >
                  {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Agent' : 'Update Agent'}
                </ButtonComponent>
              </div>
            </form>
          </CardContentComponent>
        </CardComponent>
      </div>
    </div>
  )
}

export default AgentForm 