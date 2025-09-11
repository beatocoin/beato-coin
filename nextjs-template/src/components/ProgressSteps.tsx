import React, { useState, useEffect } from 'react'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

export type StepStatus = 'pending' | 'processing' | 'completed' | 'error'

export interface Step {
  id: string
  title: string
  description: string
  status: StepStatus
}

export interface ProgressStepsProps {
  isOpen: boolean
  onClose: () => void
  title: string
  steps: Step[]
  currentStepIndex: number
  isCompleted: boolean
  error?: string
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  isOpen,
  onClose,
  title,
  steps,
  currentStepIndex,
  isCompleted,
  error
}) => {
  const [progress, setProgress] = useState(0)

  // Calculate progress percentage based on completed steps and current step
  useEffect(() => {
    if (steps.length === 0) return
    
    const completedSteps = steps.filter(step => step.status === 'completed').length
    
    // If all steps are completed, set to 100%
    if (isCompleted && !error) {
      setProgress(100)
      return
    }
    
    // Calculate base progress from completed steps
    const baseProgress = (completedSteps / steps.length) * 100
    
    // Add partial progress for the current processing step
    const processingStep = steps.findIndex(step => step.status === 'processing')
    let stepProgress = 0
    
    if (processingStep !== -1) {
      // For a processing step, show progress from 0% to 75% of that step's allocation
      const stepAllocation = 100 / steps.length
      stepProgress = (stepAllocation * 0.75)
    }
    
    setProgress(Math.min(baseProgress + stepProgress, 99)) // Cap at 99% until completed
  }, [steps, currentStepIndex, isCompleted, error])

  // Prevent closing the modal if the process is still running
  const handleClose = () => {
    if (isCompleted || error) {
      onClose()
    }
  }

  return (
    <Modal open={isOpen} onOpenChange={handleClose}>
      <ModalContent className="sm:max-w-md">
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>
        
        <div className="mt-4 mb-6">
          <Progress 
            value={progress} 
            max={100} 
            className="h-2"
            indicatorColor={error ? "bg-red-500" : undefined}
          />
        </div>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className={`flex items-start p-3 rounded-lg ${
                step.status === 'processing'
                  ? 'bg-blue-50 border border-blue-100'
                  : ''
              }`}
            >
              <div className="flex-shrink-0 mr-3 mt-0.5">
                {step.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : step.status === 'processing' ? (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                ) : step.status === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-medium ${
                  step.status === 'completed' 
                    ? 'text-green-700' 
                    : step.status === 'processing'
                    ? 'text-blue-700'
                    : step.status === 'error'
                    ? 'text-red-700'
                    : 'text-gray-700'
                }`}>
                  {step.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-700">Error</h4>
                <p className="text-xs text-red-500 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {isCompleted && !error && (
          <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg">
            <div className="flex items-start">
              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-green-700">Completed</h4>
                <p className="text-xs text-green-500 mt-1">All steps have been completed successfully.</p>
              </div>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>
  )
} 