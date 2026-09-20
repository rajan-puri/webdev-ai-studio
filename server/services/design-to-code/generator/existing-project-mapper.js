/**
 * server/services/design-to-code/generator/existing-project-mapper.js
 * Inspects existing project setup and maps design components to existing project components
 * and conventions, avoiding duplicate components (e.g. Button2, CustomButton).
 */

class ExistingProjectMapper {
  constructor(projectRules = {}) {
    this.rules = {
      reuseButton: projectRules.reuseButton !== false,
      reuseCard: projectRules.reuseCard !== false,
      buttonImportPath: projectRules.buttonImportPath || '@/components/ui/button',
      cardImportPath: projectRules.cardImportPath || '@/components/ui/card',
      useBEM: !!projectRules.useBEM,
      useCssVariables: projectRules.useCssVariables !== false,
      useTypeScript: !!projectRules.useTypeScript,
      containerClass: projectRules.containerClass || 'container',
      ...projectRules
    };
  }

  /**
   * Resolves button component implementation.
   * If reuseButton is enabled, generates an import rather than declaring a new component file.
   */
  resolveButtonUsage(framework) {
    if (this.rules.reuseButton) {
      return {
        isReused: true,
        importStatement: `import { Button } from '${this.rules.buttonImportPath}';`,
        componentTag: 'Button',
        skipFileGeneration: true
      };
    }

    return {
      isReused: false,
      importStatement: `import { Button } from './components/Button';`,
      componentTag: 'Button',
      skipFileGeneration: false
    };
  }

  /**
   * Resolves card component implementation.
   */
  resolveCardUsage(framework) {
    if (this.rules.reuseCard) {
      return {
        isReused: true,
        importStatement: `import { Card } from '${this.rules.cardImportPath}';`,
        componentTag: 'Card',
        skipFileGeneration: true
      };
    }

    return {
      isReused: false,
      importStatement: `import { FeatureCard } from './components/FeatureCard';`,
      componentTag: 'FeatureCard',
      skipFileGeneration: false
    };
  }

  /**
   * Formats class names honoring BEM rule if enabled.
   */
  formatClassName(block, element = null, modifier = null) {
    if (!this.rules.useBEM) {
      if (element && modifier) return `${block}-${element} ${block}-${element}--${modifier}`;
      if (element) return `${block}-${element}`;
      if (modifier) return `${block} ${block}--${modifier}`;
      return block;
    }

    if (element && modifier) return `${block}__${element} ${block}__${element}--${modifier}`;
    if (element) return `${block}__${element}`;
    if (modifier) return `${block} ${block}--${modifier}`;
    return block;
  }
}

function applyExistingProjectRules(ir, projectRules = {}) {
  const mapper = new ExistingProjectMapper(projectRules);
  const modifications = [];
  if (mapper.rules.reuseButton) {
    modifications.push('Replaced Button component with existing project Button import');
  }
  if (mapper.rules.reuseCard) {
    modifications.push('Replaced FeatureCard component with existing project Card import');
  }
  return {
    applied: modifications.length > 0,
    modifications,
    rules: mapper.rules
  };
}

module.exports = {
  ExistingProjectMapper,
  applyExistingProjectRules
};
