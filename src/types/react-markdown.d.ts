declare module 'react-markdown' {
  import { ComponentType, ReactNode } from 'react';
  
  interface ReactMarkdownProps {
    children: string;
    components?: Record<string, ComponentType<any>>;
    remarkPlugins?: any[];
    rehypePlugins?: any[];
    className?: string;
  }
  
  const ReactMarkdown: ComponentType<ReactMarkdownProps>;
  export default ReactMarkdown;
}

// Add declaration for missing module
declare module 'react-markdown/lib/ast-to-react' {
  import { ComponentType } from 'react';
  
  export interface ReactMarkdownProps {
    children: string;
    components?: Record<string, ComponentType<any>>;
    remarkPlugins?: any[];
    rehypePlugins?: any[];
    className?: string;
  }
} 