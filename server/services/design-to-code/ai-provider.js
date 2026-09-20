/**
 * server/services/design-to-code/ai-provider.js
 * Pluggable AI Provider Abstraction: DesignAnalysisProvider, CodeGenerationProvider, CodeRefinementProvider.
 */

class DesignAnalysisProvider {
  async analyze(inputData, options = {}) {
    throw new Error('analyze() must be implemented by DesignAnalysisProvider.');
  }
}

class CodeGenerationProvider {
  async generateCode(ir, options = {}) {
    throw new Error('generateCode() must be implemented by CodeGenerationProvider.');
  }
}

class CodeRefinementProvider {
  async refineCode(files, prompt, options = {}) {
    throw new Error('refineCode() must be implemented by CodeRefinementProvider.');
  }
}

/**
 * Default First-Party Deterministic Engine Implementation
 */
const { analyzeDesign } = require('./analyzer');
const { generateCodeForStack } = require('./generator/generator-engine');
const { applyRefinementPatch } = require('./refinement-engine');

class HeuristicVisionAnalysisProvider extends DesignAnalysisProvider {
  constructor() {
    super();
    this.name = 'heuristic-vision';
    this.model = 'v1.2-deterministic';
  }

  async analyze(inputData, options = {}) {
    const ir = await analyzeDesign({
      sourceType: inputData.sourceType || 'screenshot',
      imageInput: inputData.imageInput,
      imageName: inputData.imageName,
      figmaData: inputData.figmaData,
      projectRules: inputData.projectRules,
      options
    });

    return {
      ir,
      provider: this.name,
      model: this.model,
      timestamp: new Date().toISOString()
    };
  }
}

class DeterministicCodeGenerationProvider extends CodeGenerationProvider {
  constructor() {
    super();
    this.name = 'design-code-engine';
    this.model = 'v1.2-deterministic';
  }

  async generateCode(ir, options = {}) {
    const res = generateCodeForStack(ir, options);
    return {
      ...res,
      provider: this.name,
      model: this.model,
      timestamp: new Date().toISOString(),
      generationSettings: {
        framework: options.framework || 'html',
        styling: options.styling || 'scss',
        language: options.language || 'javascript',
        preset: options.preset || null
      }
    };
  }
}

class SurgicalRefinementProvider extends CodeRefinementProvider {
  constructor() {
    super();
    this.name = 'surgical-refinement-engine';
    this.model = 'v1.2-deterministic';
  }

  async refineCode(files, prompt, options = {}) {
    const res = applyRefinementPatch(files, prompt);
    return {
      ...res,
      provider: this.name,
      model: this.model,
      timestamp: new Date().toISOString()
    };
  }
}

// Global Registry
const registry = {
  analysis: new HeuristicVisionAnalysisProvider(),
  generation: new DeterministicCodeGenerationProvider(),
  refinement: new SurgicalRefinementProvider()
};

module.exports = {
  DesignAnalysisProvider,
  CodeGenerationProvider,
  CodeRefinementProvider,
  registry
};
