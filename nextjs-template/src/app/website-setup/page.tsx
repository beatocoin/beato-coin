"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink } from "lucide-react"
import { toast } from "@/utils/toast"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal"
import Loading from '@/components/ui/loading'
import { setupSQL } from './sql-templates'

// Simple type assertions to fix build issues with Next.js 15.2.1
const LoadingComponent = Loading as any
const ButtonComponent = Button as any
const ModalComponent = Modal as any
const ModalContentComponent = ModalContent as any
const ModalHeaderComponent = ModalHeader as any
const ModalTitleComponent = ModalTitle as any
const ModalTriggerComponent = ModalTrigger as any
const CopyComponent = Copy as any
const ExternalLinkComponent = ExternalLink as any

export default function WebsiteSetupPage() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [tableExists, setTableExists] = useState(false)

  // Use only setupSQL
  const fullSQL = setupSQL

  useEffect(() => {
    const checkDatabase = async () => {
      try {
        // Check if user_data table exists
        const { error } = await supabase
          .from('user_data')
          .select('count')
          .limit(1)
        
        if (error) {
          // If error is "relation does not exist", table doesn't exist
          if (error.code === '42P01') {
            setTableExists(false)
          } else {
            console.error('Database error:', error)
          }
        } else {
          setTableExists(true)
        }
      } catch (error) {
        console.error('Error checking database:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkDatabase()
  }, [supabase])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success('Copied to clipboard!')
      })
      .catch((error: unknown) => {
        console.error('Failed to copy:', error)
        toast.error('Failed to copy to clipboard')
      })
  }

  if (isLoading) {
    return <LoadingComponent />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 text-center">Website Setup</h1>
      <div className="space-y-8">
        {/* Step 1 */}
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Step 1: Create a Supabase account and Project</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">a) Create a Supabase Account</h3>
              <p className="mb-2 text-muted-foreground">
                Go to Supabase and create a free account if you haven&apos;t already.
              </p>
              <a 
                href="https://www.supabase.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                Visit Supabase <ExternalLinkComponent size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Step 2: Set up the Database</h2>
          <p className="mb-4 text-muted-foreground">
            Run the following SQL query in your Supabase SQL editor to set up the required tables and functions.
          </p>
          <div className="flex items-center gap-4 mb-4">
            <ButtonComponent
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => copyToClipboard(fullSQL)}
            >
              <CopyComponent size={16} />
              Copy SQL
            </ButtonComponent>
            <ModalComponent>
              <ModalTriggerComponent asChild>
                <ButtonComponent variant="default" className="w-[250px]">View SQL Query</ButtonComponent>
              </ModalTriggerComponent>
              <ModalContentComponent>
                <ModalHeaderComponent>
                  <ModalTitleComponent>SQL Setup Query</ModalTitleComponent>
                </ModalHeaderComponent>
                <div className="p-6">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <code>{fullSQL}</code>
                  </pre>
                </div>
              </ModalContentComponent>
            </ModalComponent>
          </div>
        </div>

        {/* Step 3 */}
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Step 3: Configure Environment Variables</h2>
          <p className="mb-4 text-muted-foreground">
            Create a <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file in the root of your project and add the following environment variables:
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">a) Database Configuration</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-2">
                <code>
                  NEXT_PUBLIC_SUPABASE_URL=your_project_url{"\n"}
                  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
                </code>
              </pre>
              <p className="text-muted-foreground">
                You can find these values in your Supabase project settings:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>Go to Project Settings (bottom of left sidebar)</li>
                <li>Click on API section</li>
                <li>Copy &quot;Project URL&quot; for NEXT_PUBLIC_SUPABASE_URL</li>
                <li>Copy &quot;anon public&quot; for NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              </ul>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> The <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file should never be committed to your repository. Make sure it&apos;s included in your <code className="bg-muted px-1 py-0.5 rounded">.gitignore</code> file.
              </p>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Step 4: Configure Your Stripe Account and Create Your Products</h2>
          <p className="mb-4 text-muted-foreground">
            Once you have completed Step 2, you will need to go to the <a href="/admin-settings" className="text-primary hover:underline">Website Settings</a> page in the application and enter your Stripe information.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">a) Stripe Publishable Key</h3>
              <h3 className="font-medium mb-2">b) Stripe Secret Key</h3>
              <p className="text-muted-foreground mb-2">
                You can get this by logging into your Stripe account or creating a free Stripe account and going to the <a 
                  href="https://dashboard.stripe.com/apikeys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Stripe Developer Dashboard
                </a>
                <span className="mx-1">→</span>
                <a 
                  href="https://dashboard.stripe.com/apikeys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  API Keys <ExternalLinkComponent className="h-4 w-4" />
                </a>.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">c) Stripe Webhook Secret</h3>
              <p className="text-muted-foreground mb-2">
                You can get this by logging into your Stripe account or creating a free Stripe account and going to the <a 
                  href="https://dashboard.stripe.com/webhooks" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Stripe Developer Dashboard
                </a>
                <span className="mx-1">→</span>
                <a 
                  href="https://dashboard.stripe.com/webhooks" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Webhooks <ExternalLinkComponent className="h-4 w-4" />
                </a>.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Click &quot;Add endpoint&quot;</li>
                <li>Enter your webhook URL: https:&#47;&#47;yourdomain.com&#47;api&#47;webhooks&#47;stripe</li>
                <li>Select all events</li>
                <li>Save and get your webhook signing secret</li>
                <li>Add the signing secret to your website settings in the Stripe Webhook Secret field.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Step 5: Create Your Products</h2>
          <div className="space-y-4">
            <p className="mb-6 text-muted-foreground">
              You can now create your subscription or lifetime products by going to the <a href="/create-product-stripe" target="_blank" className="text-primary hover:underline">Create Product</a> page. These products will be automatically created in your Stripe account and displayed on the Plans & Pricing page.
            </p>
            <div className="flex gap-4 justify-start">
              <ButtonComponent asChild>
                <a href="/create-product-stripe">Create Product</a>
              </ButtonComponent>
              <ButtonComponent variant="outline" asChild>
                <a href="/pricing">Plans &amp; Pricing</a>
              </ButtonComponent>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 