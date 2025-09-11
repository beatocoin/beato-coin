import React from 'react';

interface FeatureProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
}

export default function Feature({ title, description, icon, className }: FeatureProps) {
  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-lg">
      <div className="text-green-600 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p 
        className={`text-gray-600 ${className || 'text-center'}`}
        dangerouslySetInnerHTML={{ __html: description }}
      />
    </div>
  );
} 