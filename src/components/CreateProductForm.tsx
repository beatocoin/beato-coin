"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "@/utils/toast"
import {
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from "@/utils/supabase/client"
import { v4 as uuidv4 } from 'uuid'
import { useProductCreation } from '@/hooks/useProductCreation'
import { ProgressSteps, Step, StepStatus } from '@/components/ProgressSteps'
import React from 'react'

// Import compatibility components instead of using 'as any'
import {
  CompatTrash2,
  CompatGripVertical,
  CompatLoader2,
  CompatInfo,
  CompatImage,
  CompatButton,
  CompatInput,
  CompatLabel,
  CompatRadioGroup,
  CompatRadioGroupItem,
  CompatCard,
  CompatCardContent,
  CompatCardHeader,
  CompatCardTitle,
  CompatSelect,
  CompatSelectContent,
  CompatSelectItem,
  CompatSelectTrigger,
  CompatSelectValue,
  CompatSwitch,
  CompatTooltip,
  CompatTooltipContent,
  CompatTooltipProvider,
  CompatTooltipTrigger,
  CompatTextarea,
  CompatProgressSteps,
  CompatDndContext,
  CompatSortableContext
} from '@/components/ui-compatibility'

// Helper function to wait for a specified time
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Form schema
const priceSchema = z.object({
  id: z.string().optional(),
  amount: z.number().positive("Amount must be greater than 0"),
  payment_type: z.enum(["recurring", "one-off"]),
  // Make billing_period truly optional
  billing_period: z.union([
    z.enum(["monthly", "yearly"]),
    z.undefined(),
    z.null()
  ]).optional(),
  is_default: z.boolean().default(false),
  has_trial: z.boolean().default(false),
  trial_period_days: z.number().min(1, "Trial period must be at least 1 day").optional(),
  trial_requires_payment_method: z.boolean().default(true),
  trial_end_behavior: z.enum(["cancel", "pause"]).default("cancel").optional(),
  active: z.boolean().default(true)
}).refine(data => {
  // If payment_type is recurring, billing_period is required
  if (data.payment_type === "recurring") {
    return !!data.billing_period;
  }
  // For one-off payments, billing_period is not required
  return true;
}, {
  message: "Billing period is required for recurring payments",
  path: ["billing_period"]
});

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().optional(),
  active: z.boolean().default(true),
  product_tax_code: z.string().default("txcd_10000000"), // "General - Electronically Supplied Service"
  statement_descriptor: z.string().max(22, "Statement descriptor must be 22 characters or less"),
  marketing_features: z.array(
    z.object({
      feature: z.string()
    })
  ).default([]),
  prices: z.array(priceSchema).min(1, "At least one price is required"),
  include_tax: z.enum(["auto", "yes", "no"]),
  credits: z.number().min(0, "Credits must be 0 or greater").optional(),
  credits_rollover: z.boolean().default(false),
  pricesToReactivate: z.array(z.string()).optional()
})

type ProductFormValues = z.infer<typeof productSchema>

export interface ProductFormProps {
  mode: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    description: string
    images?: string[]
    statement_descriptor?: string
    marketing_features?: { feature: string }[]
    metadata?: {
      credits?: string
      credits_rollover?: string
    }
    active?: boolean
    product_tax_code?: string
    default_price?: {
      id: string
      unit_amount: number
      type: 'recurring' | 'one-time'
      recurring?: {
        interval: 'month' | 'year'
        trial_period_days?: number
      }
    }
    all_prices?: Array<{
      id: string
      unit_amount: number
      active?: boolean
      type?: 'recurring' | 'one_time'
      recurring?: {
        interval: 'month' | 'year'
        trial_period_days?: number
      } | null
    }>
  }
  onSubmit: (data: ProductFormValues) => Promise<void>
  showProgressSteps?: boolean
}

interface SortableFeatureItemProps {
  id: string
  index: number
  feature: string
  register: any
  onRemove: () => void
}

function SortableFeatureItem({ id, index, feature, register, onRemove }: SortableFeatureItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        className="cursor-move p-2 text-gray-500 hover:text-gray-700"
        {...attributes}
        {...listeners}
      >
        <CompatGripVertical className="h-4 w-4" />
      </button>
      <CompatInput
        {...register(`marketing_features.${index}.feature`)}
        placeholder="Enter a feature"
        defaultValue={feature}
      />
      <CompatButton
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
      >
        <CompatTrash2 className="h-4 w-4" />
      </CompatButton>
    </div>
  )
}

interface SortablePriceItemProps {
  id: string
  index: number
  register: any
  watch: any
  setValue: any
  onRemove: () => void
  isDefault: boolean
  onSetDefault: () => void
  onToggleActive?: (active: boolean) => void
  active?: boolean
}

function SortablePriceItem({ 
  id, 
  index, 
  register, 
  watch,
  setValue,
  onRemove,
  isDefault,
  onSetDefault,
  onToggleActive,
  active = true
}: SortablePriceItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const paymentType = watch(`prices.${index}.payment_type`)
  const hasTrial = watch(`prices.${index}.has_trial`) || false

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="cursor-move p-2 text-gray-500 hover:text-gray-700"
          {...attributes}
          {...listeners}
        >
          <CompatGripVertical className="h-4 w-4" />
        </button>
        
        <div className="flex-1 grid grid-cols-3 gap-4">
          <div>
            <CompatLabel>Price</CompatLabel>
            <CompatInput
              type="number"
              step="0.01"
              min="0"
              {...register(`prices.${index}.amount`, { 
                valueAsNumber: true,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  // Convert to number and ensure it's a valid decimal
                  const value = e.target.value ? Number(e.target.value) : 0;
                  if (!isNaN(value)) {
                    // Format to 2 decimal places
                    const formattedValue = Number(value.toFixed(2));
                    setValue(`prices.${index}.amount`, formattedValue);
                  }
                }
              })}
              placeholder="0.00"
              defaultValue="0.00"
              title={watch(`prices.${index}.id`) ? `Changing this price will archive the existing price and create a new one. ID: ${watch(`prices.${index}.id`)}` : ""}
            />
          </div>

          <div>
            <CompatLabel>Payment Type</CompatLabel>
            <CompatSelect
              value={watch(`prices.${index}.payment_type`)}
              onValueChange={(value: string) => {
                setValue(`prices.${index}.payment_type`, value);
                // Reset billing period if switching from recurring to one-off
                if (value !== 'recurring') {
                  setValue(`prices.${index}.billing_period`, undefined);
                } else {
                  // Set default billing period when switching to recurring
                  setValue(`prices.${index}.billing_period`, 'yearly');
                }
              }}
            >
              <CompatSelectTrigger>
                <CompatSelectValue placeholder="Select payment type" />
              </CompatSelectTrigger>
              <CompatSelectContent>
                <CompatSelectItem value="one-off">Lifetime</CompatSelectItem>
                <CompatSelectItem value="recurring">Recurring</CompatSelectItem>
              </CompatSelectContent>
            </CompatSelect>
          </div>

          {paymentType === "recurring" && (
            <div>
              <CompatLabel>Billing Period</CompatLabel>
              <CompatSelect
                value={watch(`prices.${index}.billing_period`)}
                onValueChange={(value: string) => setValue(`prices.${index}.billing_period`, value)}
              >
                <CompatSelectTrigger>
                  <CompatSelectValue placeholder="Select billing period" />
                </CompatSelectTrigger>
                <CompatSelectContent>
                  <CompatSelectItem value="monthly">Monthly</CompatSelectItem>
                  <CompatSelectItem value="yearly">Yearly</CompatSelectItem>
                </CompatSelectContent>
              </CompatSelect>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <CompatButton
            type="button"
            variant={isDefault ? "default" : "outline"}
            onClick={onSetDefault}
            className="whitespace-nowrap"
          >
            {isDefault ? "Default Price" : "Set as Default"}
          </CompatButton>
          
          {isDefault ? (
            <CompatTooltipProvider>
              <CompatTooltip>
                <CompatTooltipTrigger>
                  <div className="flex items-center ml-2 cursor-help">
                    <CompatInfo className="h-5 w-5 text-blue-500" />
                  </div>
                </CompatTooltipTrigger>
                <CompatTooltipContent className="max-w-xs p-3 bg-blue-50 border border-blue-200 text-blue-800">
                  <p className="text-sm font-medium">You need to set a different price as the default price to make this price inactive.</p>
                </CompatTooltipContent>
              </CompatTooltip>
            </CompatTooltipProvider>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <CompatLabel htmlFor={`active-${id}`} className={active ? "text-green-600" : "text-red-600"}>
                {active ? "Active" : "Make Inactive"}
              </CompatLabel>
              <CompatSwitch
                id={`active-${id}`}
                checked={active}
                onCheckedChange={(checked: boolean) => {
                  if (onToggleActive) onToggleActive(checked);
                }}
              />
            </div>
          )}
          
          <CompatButton
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={isDefault}
          >
            <CompatTrash2 className="h-4 w-4" />
          </CompatButton>
        </div>
      </div>

      {/* Free Trial Options */}
      <div className="mt-4 ml-10 border-t pt-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CompatSwitch
              id={`has-trial-${id}`}
              checked={hasTrial}
              onCheckedChange={(checked: boolean) => {
                setValue(`prices.${index}.has_trial`, checked);
                if (checked && !watch(`prices.${index}.trial_period_days`)) {
                  setValue(`prices.${index}.trial_period_days`, 14); // Default to 14 days
                }
              }}
            />
            <CompatLabel htmlFor={`has-trial-${id}`} className="font-medium">
              Offer Free Trial
            </CompatLabel>
          </div>

          {hasTrial && (
            <>
              <div>
                <CompatLabel htmlFor={`trial-days-${id}`}>Trial Period (Days)</CompatLabel>
                <CompatInput
                  id={`trial-days-${id}`}
                  type="number"
                  min="1"
                  {...register(`prices.${index}.trial_period_days`, { 
                    valueAsNumber: true,
                    min: 1
                  })}
                  placeholder="14"
                  defaultValue="14"
                  className="w-24"
                />
              </div>
              
              <div>
                <CompatLabel>Require Payment Method</CompatLabel>
                <div className="flex items-center h-10">
                  <CompatSwitch
                    id={`require-payment-${id}`}
                    checked={watch(`prices.${index}.trial_requires_payment_method`) !== false}
                    onCheckedChange={(checked: boolean) => {
                      setValue(`prices.${index}.trial_requires_payment_method`, checked);
                    }}
                  />
                  <CompatLabel htmlFor={`require-payment-${id}`} className="ml-2">
                    {watch(`prices.${index}.trial_requires_payment_method`) !== false ? "Yes" : "No"}
                  </CompatLabel>
                </div>
              </div>
            </>
          )}
        </div>

        {hasTrial && watch(`prices.${index}.trial_requires_payment_method`) === false && (
          <div className="mt-3 ml-8 w-60">
            <CompatLabel>When Trial Ends Without Payment</CompatLabel>
            <CompatSelect
              value={watch(`prices.${index}.trial_end_behavior`) || "cancel"}
              onValueChange={(value: string) => setValue(`prices.${index}.trial_end_behavior`, value)}
            >
              <CompatSelectTrigger>
                <CompatSelectValue placeholder="Select behavior" />
              </CompatSelectTrigger>
              <CompatSelectContent>
                <CompatSelectItem value="cancel">Cancel Subscription</CompatSelectItem>
                <CompatSelectItem value="pause">Pause Subscription</CompatSelectItem>
              </CompatSelectContent>
            </CompatSelect>
          </div>
        )}
        
        {/* Display Price ID in lower right corner if it exists */}
        {watch(`prices.${index}.id`) && (
          <div className="flex justify-end mt-2">
            <span className="text-xs text-gray-500">ID: {watch(`prices.${index}.id`)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function ProductForm({ mode, initialData, onSubmit, showProgressSteps = true }: ProductFormProps) {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>(initialData?.images?.[0] || "")
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showInactivePrices, setShowInactivePrices] = useState(false)
  const [inactivePrices, setInactivePrices] = useState<Array<any>>([])
  const [pricesToReactivate, setPricesToReactivate] = useState<Set<string>>(new Set())
  const [pricesToDeactivate, setPricesToDeactivate] = useState<Set<string>>(new Set())
  const supabase = createClient()
  const prevInitialDataRef = React.useRef(initialData)
  
  // Initialize form with react-hook-form
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      image: "",
      active: true,
      product_tax_code: "txcd_10000000",
      statement_descriptor: "",
      marketing_features: [],
      prices: [
        {
          amount: 0,
          payment_type: "recurring",
          billing_period: "yearly",
          is_default: true,
          has_trial: false,
          trial_requires_payment_method: true,
          trial_end_behavior: "cancel",
          active: true // Ensure active is always set
        },
      ],
      include_tax: "auto",
      credits: undefined,
      credits_rollover: false,
    },
  })
  
  // Initialize the product creation progress steps
  const {
    isModalOpen,
    steps,
    currentStepIndex,
    isCompleted,
    error,
    startProductCreation,
    updateStepStatus,
    nextStep,
    handleError,
    closeModal
  } = useProductCreation({
    onSuccess: () => {
      // Success callback without toast messages
    }
  })

  // Initialize form with data if in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      // Initialize form with product data
      form.reset({
        name: initialData.name || '',
        description: initialData.description || '',
        image: initialData.images?.[0] || '',
        active: initialData.active !== false, // Default to true if not specified
        product_tax_code: initialData.product_tax_code || 'txcd_10000000',
        statement_descriptor: initialData.statement_descriptor || '',
        marketing_features: initialData.marketing_features || [],
        prices: [],
        include_tax: 'auto',
        credits: initialData.metadata?.credits ? parseInt(initialData.metadata.credits) : undefined,
        credits_rollover: initialData.metadata?.credits_rollover === 'true'
      });

      // Track inactive prices for the UI
      const inactivePricesArray: Array<any> = [];
      const deactivatedPriceIds = new Set<string>();

      // Initialize prices
      if (initialData.all_prices && initialData.all_prices.length > 0) {
        // First, identify inactive prices
        initialData.all_prices.forEach(price => {
          if (price.active === false) {
            deactivatedPriceIds.add(price.id);
            inactivePricesArray.push(price);
          }
        });

        // Set the state for inactive prices
        setInactivePrices(inactivePricesArray);
        setPricesToDeactivate(deactivatedPriceIds);
        
        // Only include active prices in the form's prices array
        const activePrices = initialData.all_prices.filter(price => price.active !== false);
        
        const prices = activePrices.map(price => {
          // Determine payment type based on the price type or recurring field
          let paymentType: 'recurring' | 'one-off';
          
          if (price.recurring === null) {
            // If recurring is explicitly null, it's a one-off payment
            paymentType = 'one-off';
          } else if (price.type === 'one_time') {
            // If type is one_time, it's a one-off payment
            paymentType = 'one-off';
          } else if (price.recurring) {
            // If recurring exists and is not null, it's a recurring payment
            paymentType = 'recurring';
          } else if (initialData.default_price?.type) {
            // Fallback to default price type if available
            paymentType = initialData.default_price.type === 'one-time' ? 'one-off' : 'recurring';
          } else {
            // Default fallback
            paymentType = 'one-off';
          }
          
          // Determine billing period based on recurring interval
          let billingPeriod: 'monthly' | 'yearly' | undefined = undefined;
          
          if (paymentType === 'recurring' && price.recurring?.interval) {
            // Set billing period based on the interval
            if (price.recurring.interval === 'year') {
              billingPeriod = 'yearly';
            } else if (price.recurring.interval === 'month') {
              billingPeriod = 'monthly';
            }
          }
          
          const priceObj = {
            id: price.id,
            amount: (price.unit_amount || 0) / 100, // Convert from cents to dollars
            payment_type: paymentType,
            billing_period: billingPeriod,
            is_default: initialData.default_price?.id === price.id,
            active: price.active !== false, // Ensure active is always a boolean
            has_trial: !!price.recurring?.trial_period_days,
            trial_period_days: price.recurring?.trial_period_days,
            trial_requires_payment_method: true, // Add missing required field
            trial_end_behavior: 'cancel' as const // Add missing field with default value
          };
          
          return priceObj;
        });
        
        form.setValue('prices', prices);
      }
    }
  }, [form, initialData, mode]);

  // Reset form when initialData changes
  useEffect(() => {
    if (mode === 'edit' && initialData && prevInitialDataRef.current !== initialData) {
      prevInitialDataRef.current = initialData;
    }
  }, [initialData, form, mode]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/webp']
      const maxSize = 5 * 1024 * 1024 // 5MB

      if (!validTypes.includes(file.type)) {
        // Remove toast message
        e.target.value = ''
        return
      }
      
      if (file.size > maxSize) {
        // Remove toast message
        e.target.value = ''
        return
      }
      
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    try {
      setIsUploading(true)
      
      // Create a unique file name with original extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload the file to Supabase storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  // Add price reactivation to the form submission
  const onSubmitForm = async (data: ProductFormValues) => {
    try {
      setIsSubmitting(true)
      
      // Start the product creation progress only if we're in create mode and progress steps are enabled
      if (mode === 'create' && showProgressSteps) {
        startProductCreation()
        
        // Wait a moment before proceeding with validation
        // This gives time for the modal to appear with the first step
        await wait(500)
        
        // Validate form data
        try {
          // Fix empty payment_type values before submission
          const fixedPrices = data.prices.map(price => {
            // Ensure payment_type is never empty
            const paymentType = price.payment_type || "one-off";
            
            // Handle billing_period based on payment type
            let billingPeriod = undefined;
            
            if (paymentType === "recurring") {
              // For recurring payments, ensure billing_period is set
              // If it's missing or invalid, default to "monthly"
              if (price.billing_period === "monthly" || price.billing_period === "yearly") {
                billingPeriod = price.billing_period;
              } else {
                billingPeriod = "monthly"; // Default to monthly for recurring payments
              }
            }
            
            // Create a new price object without trial_period_days if has_trial is false
            const priceObj: any = {
              ...price,
              payment_type: paymentType,
              active: price.active !== undefined ? price.active : true
            };
            
            // Only add billing_period for recurring payments
            if (paymentType === "recurring") {
              priceObj.billing_period = billingPeriod;
            }
            
            // Remove trial_period_days if has_trial is false
            if (!price.has_trial) {
              delete priceObj.trial_period_days;
            }
            
            return priceObj;
          });
          
          data.prices = fixedPrices;
          
          // Real validation happens through zod schema in form.handleSubmit
          
          // Move to next step after validation is complete
          // This will mark the current step (validation) as completed and show the green checkmark
          if (mode === 'create' && showProgressSteps) {
            await nextStep();
          }
        } catch (validationError) {
          if (mode === 'create' && showProgressSteps) {
            handleError(`Validation failed: ${validationError instanceof Error ? validationError.message : 'Invalid form data'}`)
          }
          throw validationError
        }
      }
      
      // If there's a new image file, upload it to Supabase storage
      if (imageFile) {
        setIsUploading(true)
        try {
          const imageUrl = await uploadImage(imageFile)
          // Update the form data with the image URL
          data.image = imageUrl
          
          if (mode === 'create' && showProgressSteps) {
            // Move to next step after image upload is complete
            await nextStep();
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError)
          setIsSubmitting(false)
          setIsUploading(false)
          
          if (mode === 'create' && showProgressSteps) {
            handleError(`Failed to upload image: ${uploadError instanceof Error ? uploadError.message : 'An error occurred'}`)
          }
          
          return
        } finally {
          setIsUploading(false)
        }
      } else if (mode === 'create' && showProgressSteps) {
        // Skip image upload step if no image
        await nextStep();
      }
      
      // Add the IDs of prices to reactivate
      if (pricesToReactivate.size > 0) {
        data.pricesToReactivate = Array.from(pricesToReactivate);
      }
      
      // Mark prices to deactivate
      if (pricesToDeactivate.size > 0) {
        // Filter out prices that should be deactivated
        data.prices = data.prices.map(price => {
          if (price.id && pricesToDeactivate.has(price.id)) {
            return {
              ...price,
              active: false
            };
          }
          return price;
        });
      }
      
      // Ensure price IDs are preserved in the submission
      if (initialData?.all_prices && mode === 'edit') {
        // Create a map of price amounts to their original IDs for quick lookup
        const priceMap = new Map();
        initialData.all_prices
          .filter(price => price.active === undefined || price.active === true)
          .forEach(price => {
            const key = `${price.unit_amount}_${price.recurring ? 'recurring' : 'one-off'}_${price.recurring?.interval || ''}`;
            priceMap.set(key, price.id);
          });
        
        // Ensure each price has its ID if it matches an existing price
        data.prices = data.prices.map(price => {
          const amount = Math.round(price.amount * 100); // Convert to cents for comparison
          const key = `${amount}_${price.payment_type}_${price.payment_type === 'recurring' ? price.billing_period : ''}`;
          
          // If this price already has an ID, keep it
          if (price.id) {
            return price;
          }
          
          // Otherwise, try to find a matching existing price ID
          const existingId = priceMap.get(key);
          if (existingId) {
            return {
              ...price,
              id: existingId
            };
          }
          
          return price;
        });
      }
      
      try {
        // Create or update the product - this is the actual API call
        const response = await onSubmit(data)
        
        if (mode === 'create' && showProgressSteps) {
          // Move to create-prices step after product creation is complete
          await nextStep();
          
          // Complete the process - this will automatically set isCompleted to true
          await nextStep();
        }
        
        // Reset the form after successful submission
        form.reset()
        
        // Set image preview to empty
        setImagePreview("")
        
        // Reset image file
        setImageFile(null)
        
        // Redirect to products page after successful submission
        window.location.href = '/products'
      } catch (submitError) {
        console.error("Error in onSubmit:", submitError)
        if (mode === 'create' && showProgressSteps) {
          handleError(`${submitError instanceof Error ? submitError.message : 'An error occurred during product creation'}`)
        }
        throw submitError
      }
    } catch (error) {
      console.error("Error in onSubmitForm:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render inactive price item
  const InactivePriceItem = ({ price, index }: { price: any, index: number }) => {
    const isRecurring = price.recurring !== null && price.recurring !== undefined;
    const shouldReactivate = pricesToReactivate.has(price.id);
    
    return (
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
        <div className="flex-1 grid grid-cols-3 gap-4">
          <div>
            <CompatLabel>Price</CompatLabel>
            <p className="mt-2 text-sm font-medium">${(price.unit_amount / 100).toFixed(2)}</p>
          </div>

          <div>
            <CompatLabel>Payment Type</CompatLabel>
            <p className="mt-2 text-sm font-medium">{isRecurring ? 'Recurring' : 'One-off'}</p>
          </div>

          {isRecurring && (
            <div>
              <CompatLabel>Billing Period</CompatLabel>
              <p className="mt-2 text-sm font-medium">
                {price.recurring?.interval === 'year' ? 'Yearly' : 'Monthly'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <CompatLabel htmlFor={`reactivate-${price.id}`} className={shouldReactivate ? "text-green-600" : "text-red-600"}>
              {shouldReactivate ? "Activate Price" : "Inactive"}
            </CompatLabel>
            <CompatSwitch
              id={`reactivate-${price.id}`}
              checked={shouldReactivate}
              onCheckedChange={(checked: boolean) => {
                const newPricesToReactivate = new Set(pricesToReactivate);
                if (checked) {
                  newPricesToReactivate.add(price.id);
                } else {
                  newPricesToReactivate.delete(price.id);
                }
                setPricesToReactivate(newPricesToReactivate);
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <form 
        onSubmit={async (e) => {
          e.preventDefault()
          
          const formData = form.getValues()
          
          // Fix empty payment_type values before submission
          const fixedPrices = formData.prices.map(price => {
            // Ensure payment_type is never empty
            const paymentType = price.payment_type || "one-off";
            
            // Handle billing_period based on payment type
            let billingPeriod = undefined;
            
            if (paymentType === "recurring") {
              // For recurring payments, ensure billing_period is set
              // If it's missing or invalid, default to "monthly"
              if (price.billing_period === "monthly" || price.billing_period === "yearly") {
                billingPeriod = price.billing_period;
              } else {
                billingPeriod = "monthly"; // Default to monthly for recurring payments
              }
            }
            
            // Create a new price object without trial_period_days if has_trial is false
            const priceObj: any = {
              ...price,
              payment_type: paymentType,
              active: price.active !== undefined ? price.active : true
            };
            
            // Only add billing_period for recurring payments
            if (paymentType === "recurring") {
              priceObj.billing_period = billingPeriod;
            }
            
            // Remove trial_period_days if has_trial is false
            if (!price.has_trial) {
              delete priceObj.trial_period_days;
            }
            
            return priceObj;
          });
          form.setValue("prices", fixedPrices);
          
          form.handleSubmit(
            async (validatedData) => {
              await onSubmitForm(validatedData)
            },
            (errors) => {
            }
          )(e)
        }} 
        className="space-y-8 max-w-[1000px] mx-auto"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{mode === 'create' ? 'Create Product' : 'Edit Product'}</h2>
          {mode === 'edit' && (
            <div className="flex items-center gap-2">
              <CompatLabel htmlFor="active" className={form.watch("active") ? "text-green-600" : "text-red-600"}>
                {form.watch("active") ? "Active" : "Inactive"}
              </CompatLabel>
              <CompatSwitch
                id="active"
                checked={form.watch("active")}
                onCheckedChange={(checked: boolean) => {
                  form.setValue("active", checked)
                }}
              />
            </div>
          )}
        </div>
        <CompatCard>
          <CompatCardHeader>
            <CompatCardTitle>Basic Information</CompatCardTitle>
          </CompatCardHeader>
          <CompatCardContent className="space-y-4">
            <div className="space-y-2">
              <CompatLabel htmlFor="name">Name</CompatLabel>
              <CompatInput
                id="name"
                {...form.register("name")}
                placeholder="Product name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <CompatLabel htmlFor="description">Description</CompatLabel>
              <CompatInput
                id="description"
                {...form.register("description")}
                placeholder="Product description"
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <CompatLabel htmlFor="image">Image</CompatLabel>
              <CompatInput
                id="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="min-h-[50px] file:h-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                disabled={isUploading}
              />
              {isUploading && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Uploading image...</p>
                </div>
              )}
              {imagePreview && (
                <div className="mt-2">
                  <CompatImage 
                    src={imagePreview} 
                    alt="Preview" 
                    width={128}
                    height={128}
                    className="object-cover rounded-lg border border-border"
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Accepted formats: JPEG, PNG, WebP. Maximum size: 5MB
              </p>
            </div>

            <div className="space-y-2">
              <CompatLabel htmlFor="statement_descriptor">Statement Descriptor</CompatLabel>
              <CompatInput
                id="statement_descriptor"
                {...form.register("statement_descriptor")}
                placeholder="How it appears on statements"
                maxLength={22}
              />
              {form.formState.errors.statement_descriptor && (
                <p className="text-sm text-red-500">{form.formState.errors.statement_descriptor.message}</p>
              )}
            </div>
          </CompatCardContent>
        </CompatCard>

        <CompatCard>
          <CompatCardHeader>
            <CompatCardTitle>Marketing Features</CompatCardTitle>
          </CompatCardHeader>
          <CompatCardContent className="space-y-4">
            <CompatDndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event
                if (active.id !== over?.id) {
                  const oldIndex = parseInt(active.id.toString())
                  const newIndex = parseInt(over!.id.toString())
                  const features = form.getValues("marketing_features")
                  form.setValue("marketing_features", arrayMove(features, oldIndex, newIndex))
                }
              }}
            >
              <CompatSortableContext
                items={form.watch("marketing_features")?.map((_, i) => i.toString())}
                strategy={verticalListSortingStrategy}
              >
                {form.watch("marketing_features")?.map((feature, index) => (
                  <SortableFeatureItem
                    key={index}
                    id={index.toString()}
                    index={index}
                    feature={feature.feature}
                    register={form.register}
                    onRemove={() => {
                      const features = form.getValues("marketing_features")
                      form.setValue(
                        "marketing_features",
                        features.filter((_, i) => i !== index)
                      )
                    }}
                  />
                ))}
              </CompatSortableContext>
            </CompatDndContext>
            <CompatButton
              type="button"
              variant="outline"
              onClick={() => {
                const features = form.getValues("marketing_features")
                form.setValue("marketing_features", [...features, { feature: "" }])
              }}
            >
              Add Feature
            </CompatButton>
            
            <p className="text-sm text-muted-foreground mt-2">
              Wrap any text in [tt][/tt] tags to display it as a tooltip on the pricing page.
            </p>
          </CompatCardContent>
        </CompatCard>

        <CompatCard>
          <CompatCardHeader className="flex flex-row items-center justify-between">
            <CompatCardTitle>Pricing</CompatCardTitle>
            {mode === 'edit' && (
              <div className="flex items-center gap-2">
                <CompatLabel htmlFor="show-inactive-prices" className={showInactivePrices ? "text-amber-600" : "text-green-600"}>
                  {showInactivePrices ? "Inactive Prices" : "Active Prices"}
                </CompatLabel>
                <CompatSwitch
                  id="show-inactive-prices"
                  checked={showInactivePrices}
                  onCheckedChange={(checked: boolean) => setShowInactivePrices(checked)}
                />
              </div>
            )}
          </CompatCardHeader>
          <CompatCardContent className="space-y-4">
            {mode === 'edit' && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> So that customers on the old prices are not affected, changing a price amount, payment type, or billing period will archive the existing price and create a new one.
                </p>
              </div>
            )}
            
            {!showInactivePrices ? (
              <>
                <CompatDndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event
                    if (active.id !== over?.id) {
                      const oldIndex = parseInt(active.id.toString())
                      const newIndex = parseInt(over!.id.toString())
                      const prices = form.getValues("prices")
                      form.setValue("prices", arrayMove(prices, oldIndex, newIndex))
                    }
                  }}
                >
                  <CompatSortableContext
                    items={form.watch("prices")?.map((_, i) => i.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    {form.watch("prices")?.filter(price => {
                      // For Active Prices view, show prices that are active
                      // If price has no ID yet, it's a new price and should be shown in Active Prices
                      return !price.id || (price.active !== false && !pricesToDeactivate.has(price.id));
                    }).map((price, index) => (
                      <SortablePriceItem
                        key={index}
                        id={index.toString()}
                        index={index}
                        register={form.register}
                        watch={form.watch}
                        setValue={form.setValue}
                        isDefault={price.is_default}
                        active={price.active !== false && !pricesToDeactivate.has(price.id || '')}
                        onToggleActive={(active) => {
                          if (price.id) {
                            const newPricesToDeactivate = new Set(pricesToDeactivate);
                            if (!active) {
                              newPricesToDeactivate.add(price.id);
                            } else {
                              newPricesToDeactivate.delete(price.id);
                            }
                            setPricesToDeactivate(newPricesToDeactivate);
                          }
                        }}
                        onSetDefault={() => {
                          const prices = form.getValues("prices")
                          form.setValue(
                            "prices",
                            prices.map((p, i) => ({
                              ...p,
                              is_default: i === index
                            }))
                          )
                        }}
                        onRemove={() => {
                          if (!price.is_default) {
                            const prices = form.getValues("prices")
                            form.setValue(
                              "prices",
                              prices.filter((_, i) => i !== index)
                            )
                          }
                        }}
                      />
                    ))}
                  </CompatSortableContext>
                </CompatDndContext>
                
                <CompatButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const prices = form.getValues("prices")
                    form.setValue("prices", [
                      ...prices,
                      {
                        amount: 0,
                        payment_type: "one-off",
                        billing_period: "monthly",
                        is_default: false,
                        has_trial: false,
                        trial_requires_payment_method: true,
                        active: true
                      }
                    ])
                  }}
                >
                  Add Price
                </CompatButton>
              </>
            ) : (
              <>
                {inactivePrices.length > 0 ? (
                  <div className="space-y-4">
                    {inactivePrices.map((price, index) => (
                      <InactivePriceItem key={price.id} price={price} index={index} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">No inactive prices found</p>
                )}
              </>
            )}

            <div className="space-y-2">
              <CompatLabel>Include Tax in Price</CompatLabel>
              <CompatRadioGroup
                value={form.watch("include_tax")}
                onValueChange={(value: string) => form.setValue("include_tax", value as "auto" | "yes" | "no")}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <CompatRadioGroupItem value="auto" id="tax-auto" />
                  <CompatLabel htmlFor="tax-auto">Automatic</CompatLabel>
                </div>
                <div className="flex items-center space-x-2">
                  <CompatRadioGroupItem value="yes" id="tax-yes" />
                  <CompatLabel htmlFor="tax-yes">Yes</CompatLabel>
                </div>
                <div className="flex items-center space-x-2">
                  <CompatRadioGroupItem value="no" id="tax-no" />
                  <CompatLabel htmlFor="tax-no">No</CompatLabel>
                </div>
              </CompatRadioGroup>
            </div>

            <div className="space-y-2">
              <CompatLabel htmlFor="credits">Credits</CompatLabel>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <CompatInput
                    id="credits"
                    type="number"
                    {...form.register("credits", { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {form.formState.errors.credits && (
                    <p className="text-sm text-red-500">{form.formState.errors.credits.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <CompatLabel htmlFor="credits_rollover" className="whitespace-nowrap">Credits Rollover</CompatLabel>
                  <CompatSwitch
                    id="credits_rollover"
                    checked={form.watch("credits_rollover")}
                    onCheckedChange={(checked: boolean) => {
                      form.setValue("credits_rollover", checked)
                    }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Credits can be assigned to a product and used in conjunction with the API functionality of your application.
              </p>
            </div>
          </CompatCardContent>
        </CompatCard>

        <div className="flex justify-end">
          <CompatButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <CompatLoader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              mode === 'create' ? 'Create Product' : 'Update Product'
            )}
          </CompatButton>
        </div>
      </form>
      
      {/* Progress Steps Modal - only render if showProgressSteps is true */}
      {showProgressSteps && (
        <CompatProgressSteps
          isOpen={isModalOpen}
          onClose={closeModal}
          title="Creating Product"
          steps={steps}
          currentStepIndex={currentStepIndex}
          isCompleted={isCompleted}
          error={error}
        />
      )}
    </>
  )
} 