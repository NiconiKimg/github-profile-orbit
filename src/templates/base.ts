import { ActionConfig, EcosystemData } from '../types.js';

export interface TemplateRenderer {
  render(data: EcosystemData, config: ActionConfig): string;
}

export interface TemplateRegistry {
  [key: string]: TemplateRenderer;
}
