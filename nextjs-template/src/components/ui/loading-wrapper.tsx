"use client"

import * as React from "react"
import Loading from "./loading"

// Create a wrapper component for Loading to fix type issues with Next.js 15.2.1
const LoadingWrapper = (props: React.ComponentProps<typeof Loading>) => {
  return (
    <div>
      <Loading {...props} />
    </div>
  )
}

export default LoadingWrapper 