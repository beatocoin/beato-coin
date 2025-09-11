declare module 'next/image' {
  import { ComponentType, ImgHTMLAttributes } from 'react';
  
  export interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    layout?: 'fixed' | 'intrinsic' | 'responsive' | 'fill';
    priority?: boolean;
    loading?: 'lazy' | 'eager';
    objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
    objectPosition?: string;
    quality?: number;
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
  }
  
  const Image: ComponentType<ImageProps>;
  export default Image;
} 