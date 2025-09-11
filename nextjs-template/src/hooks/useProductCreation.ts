import { useState, useCallback } from 'react'
import { Step, StepStatus } from '@/components/ProgressSteps'

// Define the product creation steps
const PRODUCT_CREATION_STEPS: Omit<Step, 'status'>[] = [
  {
    id: 'validate',
    title: 'Validating Form Data',
    description: 'Checking that all required fields are filled correctly.'
  },
  {
    id: 'upload-image',
    title: 'Uploading Image',
    description: 'Uploading product image to storage (if provided).'
  },
  {
    id: 'create-product',
    title: 'Creating Product',
    description: 'Creating the product in Stripe.'
  },
  {
    id: 'create-prices',
    title: 'Creating Prices',
    description: 'Creating price configurations for the product.'
  }
]

// Helper function to wait for a specified time
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export interface UseProductCreationOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export const useProductCreation = (options?: UseProductCreationOptions) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  
  // Initialize the steps
  const initializeSteps = useCallback(() => {
    setSteps(
      PRODUCT_CREATION_STEPS.map(step => ({
        ...step,
        status: 'pending' as StepStatus
      }))
    )
    setCurrentStepIndex(0)
    setIsCompleted(false)
    setError(undefined)
  }, [])
  
  // Start the product creation process
  const startProductCreation = useCallback(() => {
    initializeSteps()
    setIsModalOpen(true)
  }, [initializeSteps])
  
  // Update a step's status
  const updateStepStatus = useCallback(async (stepId: string, status: StepStatus) => {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId ? { ...step, status } : step
      )
    )
    
    // Add a minimum delay of 2 seconds when a step is completed
    if (status === 'completed') {
      await wait(2000)
    }
  }, [])
  
  // Move to the next step
  const nextStep = useCallback(async () => {
    // Mark current step as completed
    const currentStep = steps[currentStepIndex]
    if (currentStep) {
      // First update the status to completed
      setSteps(prevSteps => 
        prevSteps.map(step => 
          step.id === currentStep.id ? { ...step, status: 'completed' as StepStatus } : step
        )
      )
      
      // Wait for the UI to update and show the green checkmark
      await wait(2000)
    }
    
    // Move to next step
    if (currentStepIndex < steps.length - 1) {
      const newIndex = currentStepIndex + 1
      setCurrentStepIndex(newIndex)
      
      // Mark the next step as processing
      const nextStep = steps[newIndex]
      if (nextStep) {
        setSteps(prevSteps => 
          prevSteps.map(step => 
            step.id === nextStep.id ? { ...step, status: 'processing' as StepStatus } : step
          )
        )
        
        // Wait for the UI to update and show the processing state
        await wait(1000)
      }
    } else {
      // All steps completed
      // Add a final delay before marking as completed
      await wait(2000)
      setIsCompleted(true)
      if (options?.onSuccess) {
        options.onSuccess()
      }
    }
  }, [currentStepIndex, steps, options])
  
  // Handle error
  const handleError = useCallback((errorMessage: string) => {
    // Mark current step as error
    const currentStep = steps[currentStepIndex]
    if (currentStep) {
      setSteps(prevSteps => 
        prevSteps.map(step => 
          step.id === currentStep.id ? { ...step, status: 'error' as StepStatus } : step
        )
      )
    }
    
    setError(errorMessage)
    if (options?.onError) {
      options.onError(new Error(errorMessage))
    }
  }, [currentStepIndex, steps, options])
  
  // Close the modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])
  
  return {
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
  }
} 