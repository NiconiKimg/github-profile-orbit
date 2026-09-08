import { ActionConfig, EcosystemData, VisualizationTemplate } from '../types.js';
import { TemplateRegistry, TemplateRenderer } from './base.js';
import { SpaceTemplate } from './space.js';
import { LandscapeTemplate } from './landscape.js';
import { NetworkTemplate } from './network.js';
import { MinimalTemplate } from './minimal.js';

export const TEMPLATES: TemplateRegistry = {
  space: new SpaceTemplate(),
  landscape: new LandscapeTemplate(),
  network: new NetworkTemplate(),
  minimal: new MinimalTemplate()
};

export function getTemplateRenderer(name: VisualizationTemplate): TemplateRenderer {
  const normalized = (name || 'space').toLowerCase().trim() as VisualizationTemplate;
  const renderer = TEMPLATES[normalized];
  if (!renderer) {
    console.warn(`Template "${name}" not recognized. Falling back to "space" template.`);
    return TEMPLATES.space;
  }
  return renderer;
}

export function renderVisualization(data: EcosystemData, config: ActionConfig): string {
  const renderer = getTemplateRenderer(config.template);
  return renderer.render(data, config);
}

export * from './base.js';
export * from './space.js';
export * from './landscape.js';
export * from './network.js';
export * from './minimal.js';
