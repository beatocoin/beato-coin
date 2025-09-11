'use client'

import { useAppKit } from "@reown/appkit/react"
import { useAppKitAccount } from "@reown/appkit/react"
import { useState, useEffect } from "react"

interface WalletConnectButtonProps {
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  label?: string;
}

export default function WalletConnectButton({ size = 'default', className = '', label }: WalletConnectButtonProps) {
  // Use AppKit hooks
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const [displayAddress, setDisplayAddress] = useState<string>("")

  // Format address for display (truncate middle)
  useEffect(() => {
    if (address) {
      const formatted = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
      setDisplayAddress(formatted)
    }
  }, [address])

  // Different styles for desktop and mobile
  const desktopStyles = "bg-[var(--color-primary)] text-white hover:bg-white hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] border transition-colors w-40 rounded-[5px] text-sm flex items-center justify-center text-center"
  const mobileStyles = "bg-[var(--color-primary)] text-white hover:bg-white hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] border transition-colors rounded-[5px] text-xs flex items-center justify-center text-center px-2 py-1.5"
  
  // Size styles
  const sizeStyles = size === 'lg' ? 'h-11 text-md py-2.5' : '';
  
  // Apply different styles based on viewport
  const buttonStyles = `md:${desktopStyles} ${mobileStyles} ${sizeStyles} ${className}`

  if (isConnected && address) {
    return (
      <button 
        onClick={() => open()}
        className={`${buttonStyles}`}
      >
        <span className="flex items-center justify-center w-full text-md font-medium">
          <span className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-green-300 mr-1 md:mr-2"></span>
          {displayAddress}
        </span>
      </button>
    )
  }

  return (
    <button 
      onClick={() => open()}
      className={`${buttonStyles} text-md font-medium`}
    >
      {label || 'Connect'}
    </button>
  )
} 