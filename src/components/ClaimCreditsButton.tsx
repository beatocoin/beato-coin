import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'

interface ClaimCreditsButtonProps {
  className?: string
  trialCredits?: number | null | false
}

export default function ClaimCreditsButton({ className, trialCredits }: ClaimCreditsButtonProps) {
  const supabase = createClient()
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isClaimed, setIsClaimed] = useState(false)

  useEffect(() => {
    const checkEligibility = async () => {
      try {
        // First check if trial credits are enabled
        if (trialCredits === null || trialCredits === false) {
          setIsVisible(false)
          return
        }

        // Check if user is logged in
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (!user) {
          setIsVisible(false)
          return
        }

        // Check trial credits eligibility
        const { data: userData, error: userDataError } = await supabase
          .from('user_data')
          .select('trial_credits_claimed')
          .eq('UID', user.id)
          .single()

        if (userDataError) {
          console.error('Error fetching user data:', userDataError)
          setIsVisible(false)
          return
        }

        // Show button if trial_credits_claimed is null or false
        setIsVisible(userData?.trial_credits_claimed === null || userData?.trial_credits_claimed === false)
      } catch (error) {
        console.error('Error checking eligibility:', error)
        setIsVisible(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkEligibility()
  }, [trialCredits, supabase])

  const handleClaimCredits = async () => {
    try {
      setIsProcessing(true)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('User not found')
        return
      }

      // Get user's current credits
      const { data: userData, error: userDataError } = await supabase
        .from('user_data')
        .select('credits, trial_credits_claimed')
        .eq('UID', user.id)
        .single()

      if (userDataError) {
        toast.error('Error fetching user data')
        return
      }

      // Verify trial credits haven't been claimed
      if (userData.trial_credits_claimed) {
        toast.error('Trial credits have already been claimed')
        return
      }

      // Calculate new credits value
      const currentCredits = userData.credits || 0
      const newCredits = currentCredits + (trialCredits as number)

      // Update user data with new credits and mark trial credits as claimed
      const { error: updateError } = await supabase
        .from('user_data')
        .update({
          credits: newCredits,
          trial_credits_claimed: true
        })
        .eq('UID', user.id)

      if (updateError) {
        toast.error('Error updating credits')
        return
      }

      toast.success('Trial credits claimed successfully!')
      setIsClaimed(true)
    } catch (error) {
      console.error('Error claiming credits:', error)
      toast.error('Failed to claim credits')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading || (!isVisible && !isClaimed)) {
    return null
  }

  return (
    <Button 
      variant={isClaimed ? "default" : "outline"}
      className={`${className} gap-2`}
      onClick={handleClaimCredits}
      disabled={isProcessing || isClaimed}
      style={isClaimed ? { backgroundColor: '#22c55e', borderColor: '#22c55e' } : undefined}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Claiming Credits...
        </>
      ) : isClaimed ? (
        <>
          <Check className="h-4 w-4" />
          Credits Claimed
        </>
      ) : (
        'Claim Credits'
      )}
    </Button>
  )
} 