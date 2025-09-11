"use client"

import * as React from "react"
import { Check as CheckIcon, X as XIcon, Info as InfoIcon } from "lucide-react"

// Create wrapper components for Lucide icons to fix type issues with Next.js 15.2.1
export const Check = (props: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span {...props}>
      <CheckIcon />
    </span>
  )
}

export const X = (props: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span {...props}>
      <XIcon />
    </span>
  )
}

export const Info = (props: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span {...props}>
      <InfoIcon />
    </span>
  )
} 