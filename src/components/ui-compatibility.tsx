// ui-compatibility.tsx
// This file provides compatibility exports for UI components to work with Next.js 15.2.1 and React 18.3.x
// Instead of using 'as any' type assertions throughout the codebase, we centralize them here

import React from 'react';
import Image from 'next/image';
import { Trash2, GripVertical, Loader2, Info, LucideProps } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProgressSteps } from '@/components/ProgressSteps';
import { DndContext, DndContextProps } from '@dnd-kit/core';
import { SortableContext, SortableContextProps } from '@dnd-kit/sortable';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalTitle,
  ModalFooter,
  ModalDescription,
  ModalTrigger,
  ModalClose
} from "@/components/ui/modal";

// Basic textarea component since it might be missing
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={className}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

// Create properly typed wrapper components for Lucide icons
interface IconProps extends LucideProps {
  className?: string;
}

const GripVerticalWrapper = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => <GripVertical ref={ref} className={className} {...props} />
);
GripVerticalWrapper.displayName = 'GripVerticalWrapper';

const Trash2Wrapper = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => <Trash2 ref={ref} className={className} {...props} />
);
Trash2Wrapper.displayName = 'Trash2Wrapper';

const Loader2Wrapper = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => <Loader2 ref={ref} className={className} {...props} />
);
Loader2Wrapper.displayName = 'Loader2Wrapper';

const InfoWrapper = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => <Info ref={ref} className={className} {...props} />
);
InfoWrapper.displayName = 'InfoWrapper';

// Define the ImageProps interface
interface ImageProps {
  src: string;
  alt: string;  // Required prop
  width?: number;
  height?: number;
  className?: string;
  [key: string]: any;
}

const ImageWrapper = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ src, alt, width, height, className, ...props }, ref) => {
    // Check if the image is from Supabase storage
    const isSupabaseImage = typeof src === 'string' && src.includes('supabase');
    
    // Spread props but explicitly set unoptimized for Supabase images
    const imageProps = {
      src,
      width,
      height,
      className,
      ...props,
      ...(isSupabaseImage ? { unoptimized: true } : {})
    };
    
    return <Image alt={alt || 'Image'} {...imageProps} />;
  }
);
ImageWrapper.displayName = 'ImageWrapper';

// Define a common interface for UI components that can have children
interface UIComponentProps {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

// Define a proper type for the Button component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: string;
  size?: string;
  children?: React.ReactNode;
  className?: string;
  asChild?: boolean;
  [key: string]: any;
}

// Create properly typed wrapper components for all UI components
const ButtonWrapper = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const { ref: _, ...restProps } = props as any;
    return <Button {...restProps} />;
  }
);
ButtonWrapper.displayName = 'ButtonWrapper';

const InputWrapper: React.FC<React.ComponentProps<typeof Input>> = (props) => <Input {...props} />;

// Card components with proper children handling
const CardWrapper = React.forwardRef<HTMLDivElement, UIComponentProps>(
  (props, ref) => {
    const { ref: _, ...restProps } = props as any;
    return <Card {...restProps} />;
  }
);
CardWrapper.displayName = 'CardWrapper';

const CardContentWrapper = React.forwardRef<HTMLDivElement, UIComponentProps>(
  (props, ref) => {
    const { ref: _, ...restProps } = props as any;
    return <CardContent {...restProps} />;
  }
);
CardContentWrapper.displayName = 'CardContentWrapper';

const CardHeaderWrapper = React.forwardRef<HTMLDivElement, UIComponentProps>(
  (props, ref) => {
    const { ref: _, ...restProps } = props as any;
    return <CardHeader {...restProps} />;
  }
);
CardHeaderWrapper.displayName = 'CardHeaderWrapper';

const CardTitleWrapper = React.forwardRef<HTMLHeadingElement, UIComponentProps>(
  (props, ref) => {
    const { ref: _, ...restProps } = props as any;
    return <CardTitle {...restProps} />;
  }
);
CardTitleWrapper.displayName = 'CardTitleWrapper';

const LabelWrapper: React.FC<React.ComponentProps<typeof Label>> = (props) => <Label {...props} />;

const RadioGroupWrapper = React.forwardRef<HTMLDivElement, UIComponentProps>(
  (props, ref) => <RadioGroup ref={ref} {...props} />
);
RadioGroupWrapper.displayName = 'RadioGroupWrapper';

const RadioGroupItemWrapper = React.forwardRef<HTMLButtonElement, UIComponentProps & { value: string }>(
  (props, ref) => {
    const { ref: _, ...restProps } = props as any;
    return <RadioGroupItem {...restProps} />;
  }
);
RadioGroupItemWrapper.displayName = 'RadioGroupItemWrapper';

const SelectWrapper = React.forwardRef<HTMLDivElement, UIComponentProps>(
  (props, ref) => <Select {...props} />
);
SelectWrapper.displayName = 'SelectWrapper';

const SelectContentWrapper = React.forwardRef<HTMLDivElement, UIComponentProps>(
  (props, ref) => <SelectContent ref={ref} {...props} />
);
SelectContentWrapper.displayName = 'SelectContentWrapper';

const SelectItemWrapper = React.forwardRef<HTMLDivElement, UIComponentProps & { value: string }>(
  (props, ref) => {
    const { ref: _, ...restProps } = props as any;
    return <SelectItem {...restProps} />;
  }
);
SelectItemWrapper.displayName = 'SelectItemWrapper';

const SelectTriggerWrapper = React.forwardRef<HTMLButtonElement, UIComponentProps>(
  (props, ref) => <SelectTrigger ref={ref} {...props} />
);
SelectTriggerWrapper.displayName = 'SelectTriggerWrapper';

const SelectValueWrapper = React.forwardRef<HTMLSpanElement, UIComponentProps>(
  (props, ref) => <SelectValue ref={ref} {...props} />
);
SelectValueWrapper.displayName = 'SelectValueWrapper';

const SwitchWrapper = React.forwardRef<HTMLButtonElement, UIComponentProps>(
  (props, ref) => <Switch ref={ref} {...props} />
);
SwitchWrapper.displayName = 'SwitchWrapper';

const TooltipWrapper = React.forwardRef<HTMLDivElement, UIComponentProps>(
  (props, ref) => <Tooltip {...props} />
);
TooltipWrapper.displayName = 'TooltipWrapper';

const TooltipContentWrapper = React.forwardRef<HTMLDivElement, UIComponentProps>(
  (props, ref) => <TooltipContent ref={ref} {...props} />
);
TooltipContentWrapper.displayName = 'TooltipContentWrapper';

const TooltipProviderWrapper = React.forwardRef<HTMLDivElement, UIComponentProps & { children: React.ReactNode }>(
  (props, ref) => {
    const { ref: _, ...restProps } = props as any;
    return <TooltipProvider {...restProps} />;
  }
);
TooltipProviderWrapper.displayName = 'TooltipProviderWrapper';

const TooltipTriggerWrapper = React.forwardRef<HTMLButtonElement, UIComponentProps>(
  (props, ref) => <TooltipTrigger ref={ref} {...props} />
);
TooltipTriggerWrapper.displayName = 'TooltipTriggerWrapper';

const ProgressStepsWrapper = React.forwardRef<HTMLDivElement, any>(
  (props, ref) => {
    const { ref: _, ...restProps } = props as any;
    return <ProgressSteps {...restProps} />;
  }
);
ProgressStepsWrapper.displayName = 'ProgressStepsWrapper';

// Modal compatibility wrappers - use type assertions to bypass TypeScript checks
const ModalWrapper = (props: any) => {
  // Use type assertion to bypass TypeScript checks
  const ModalComponent = Modal as any;
  return <ModalComponent {...props} />;
};
ModalWrapper.displayName = 'ModalWrapper';

const ModalContentWrapper = (props: any) => {
  // Use type assertion to bypass TypeScript checks
  const ModalContentComponent = ModalContent as any;
  return <ModalContentComponent {...props} />;
};
ModalContentWrapper.displayName = 'ModalContentWrapper';

const ModalHeaderWrapper = (props: any) => {
  // Use type assertion to bypass TypeScript checks
  const ModalHeaderComponent = ModalHeader as any;
  return <ModalHeaderComponent {...props} />;
};
ModalHeaderWrapper.displayName = 'ModalHeaderWrapper';

const ModalTitleWrapper = (props: any) => {
  // Use type assertion to bypass TypeScript checks
  const ModalTitleComponent = ModalTitle as any;
  return <ModalTitleComponent {...props} />;
};
ModalTitleWrapper.displayName = 'ModalTitleWrapper';

const ModalFooterWrapper = (props: any) => {
  // Use type assertion to bypass TypeScript checks
  const ModalFooterComponent = ModalFooter as any;
  return <ModalFooterComponent {...props} />;
};
ModalFooterWrapper.displayName = 'ModalFooterWrapper';

const ModalDescriptionWrapper = (props: any) => {
  // Use type assertion to bypass TypeScript checks
  const ModalDescriptionComponent = ModalDescription as any;
  return <ModalDescriptionComponent {...props} />;
};
ModalDescriptionWrapper.displayName = 'ModalDescriptionWrapper';

const ModalTriggerWrapper = (props: any) => {
  // Use type assertion to bypass TypeScript checks
  const ModalTriggerComponent = ModalTrigger as any;
  return <ModalTriggerComponent {...props} />;
};
ModalTriggerWrapper.displayName = 'ModalTriggerWrapper';

const ModalCloseWrapper = (props: any) => {
  // Use type assertion to bypass TypeScript checks
  const ModalCloseComponent = ModalClose as any;
  return <ModalCloseComponent {...props} />;
};
ModalCloseWrapper.displayName = 'ModalCloseWrapper';

// DnD compatibility wrappers with proper typing
const DndContextWrapper = (props: DndContextProps) => <DndContext {...props} />;
DndContextWrapper.displayName = 'DndContextWrapper';

const SortableContextWrapper = (props: SortableContextProps) => <SortableContext {...props} />;
SortableContextWrapper.displayName = 'SortableContextWrapper';

// Re-export all components with proper typing
export {
  Trash2Wrapper as CompatTrash2,
  GripVerticalWrapper as CompatGripVertical,
  Loader2Wrapper as CompatLoader2,
  InfoWrapper as CompatInfo,
  ImageWrapper as CompatImage,
  ButtonWrapper as CompatButton,
  InputWrapper as CompatInput,
  LabelWrapper as CompatLabel,
  RadioGroupWrapper as CompatRadioGroup,
  RadioGroupItemWrapper as CompatRadioGroupItem,
  CardWrapper as CompatCard,
  CardContentWrapper as CompatCardContent,
  CardHeaderWrapper as CompatCardHeader,
  CardTitleWrapper as CompatCardTitle,
  SelectWrapper as CompatSelect,
  SelectContentWrapper as CompatSelectContent,
  SelectItemWrapper as CompatSelectItem,
  SelectTriggerWrapper as CompatSelectTrigger,
  SelectValueWrapper as CompatSelectValue,
  SwitchWrapper as CompatSwitch,
  TooltipWrapper as CompatTooltip,
  TooltipContentWrapper as CompatTooltipContent,
  TooltipProviderWrapper as CompatTooltipProvider,
  TooltipTriggerWrapper as CompatTooltipTrigger,
  ProgressStepsWrapper as CompatProgressSteps,
  Textarea as CompatTextarea,
  ModalWrapper as CompatModal,
  ModalContentWrapper as CompatModalContent,
  ModalHeaderWrapper as CompatModalHeader,
  ModalTitleWrapper as CompatModalTitle,
  ModalFooterWrapper as CompatModalFooter,
  ModalDescriptionWrapper as CompatModalDescription,
  ModalTriggerWrapper as CompatModalTrigger,
  ModalCloseWrapper as CompatModalClose,
  DndContextWrapper as CompatDndContext,
  SortableContextWrapper as CompatSortableContext
}; 