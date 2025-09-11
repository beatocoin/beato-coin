"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function CreateAgentPage() {
  const [config, setConfig] = useState({ options: { max_tokens: '', temperature: '', top_p: '' } });

  const handleConfigChange = (path: string, value: string) => {
    const parts = path.split('.');
    setConfig(prevConfig => {
      const newConfig = { ...prevConfig };
      let current: any = newConfig;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return newConfig;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="max_tokens">Max Tokens</Label>
          <Input
            id="max_tokens"
            type="number"
            value={config.options.max_tokens || ''}
            onChange={(e) => handleConfigChange('options.max_tokens', e.target.value)}
            placeholder="e.g. 1000"
          />
        </div>
        <div>
          <Label htmlFor="temperature">Temperature</Label>
          <Input
            id="temperature"
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={config.options.temperature || ''}
            onChange={(e) => handleConfigChange('options.temperature', e.target.value)}
            placeholder="e.g. 0.7"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="top_p">Top P</Label>
        <Input
          id="top_p"
          type="number"
          step="0.1"
          min="0"
          max="1"
          value={config.options.top_p || ''}
          onChange={(e) => handleConfigChange('options.top_p', e.target.value)}
          placeholder="e.g. 0.9"
        />
      </div>
    </div>
  );
} 