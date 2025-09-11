import React, { useState } from 'react'
import * as Icons from 'lucide-react'
import { Input } from './input'
import { ScrollArea } from './scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Button } from './button'
import { cn } from '@/lib/utils'

// Define commonly used icons first
const commonIcons = [
  'Bot', 'Brain', 'MessageSquare', 'Globe', 'Search', 'Settings', 'User', 'Users',
  'Code', 'Database', 'FileText', 'Folder', 'Home', 'Image', 'Mail', 'Phone',
  'Shield', 'Star', 'Tool', 'Zap'
]

interface IconPickerProps {
  value?: string
  onChange?: (icon: string) => void
  className?: string
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Get all available icons
  const allIcons = Object.keys(Icons).filter(key => 
    key !== 'createLucideIcon' && 
    key !== 'default' &&
    typeof Icons[key as keyof typeof Icons] === 'function'
  )

  // Filter icons based on search
  const filteredIcons = search
    ? allIcons.filter(icon => 
        icon.toLowerCase().includes(search.toLowerCase())
      )
    : commonIcons

  // Get the current icon component
  const SelectedIcon = value && Icons[value as keyof typeof Icons] as React.FC<any> || Icons.Smile

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          role="combobox" 
          aria-expanded={isOpen}
          className={cn("w-[150px] justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <SelectedIcon className="h-4 w-4" />
            <span>{value || "Select an icon..."}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <div className="p-2 border-b">
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-[300px]">
          <div className="grid grid-cols-4 gap-2 p-2">
            {filteredIcons.map((iconName) => {
              const IconComponent = Icons[iconName as keyof typeof Icons] as React.FC<any>
              if (!IconComponent) return null
              return (
                <Button
                  key={iconName}
                  variant="ghost"
                  className={cn(
                    "h-12 w-full flex flex-col items-center justify-center gap-1 hover:bg-accent",
                    value === iconName && "bg-accent"
                  )}
                  onClick={() => {
                    onChange?.(iconName)
                    setIsOpen(false)
                  }}
                >
                  <IconComponent className="h-5 w-5" />
                  <span className="text-xs truncate w-full text-center">
                    {iconName}
                  </span>
                </Button>
              )
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
} 