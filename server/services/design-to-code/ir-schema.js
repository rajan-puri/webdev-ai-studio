/**
 * server/services/design-to-code/ir-schema.js
 * Design Intermediate Representation (DIR) schema definition, validation, and defaults.
 * Framework-independent intermediate design representation.
 */

function createDefaultTokens() {
  return {
    colors: {
      primary: '#2563EB',
      primaryHover: '#1D4ED8',
      secondary: '#475569',
      background: '#FFFFFF',
      surface: '#F8FAFC',
      text: '#0F172A',
      textMuted: '#64748B',
      border: '#E2E8F0',
      accent: '#38BDF8',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444'
    },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      headingFont: 'Inter, system-ui, -apple-system, sans-serif',
      baseFontSize: '16px',
      lineHeight: '1.6',
      headingSizes: {
        h1: '44px',
        h2: '32px',
        h3: '24px',
        h4: '20px',
        h5: '16px',
        h6: '14px'
      }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      xxl: '48px',
      section: '80px'
    },
    radii: {
      none: '0px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
    }
  };
}

function validateIntermediateRepresentation(ir, throwOnError = false) {
  const errors = [];
  if (!ir || typeof ir !== 'object') {
    errors.push('Design Intermediate Representation must be a valid JSON object.');
  } else {
    const sourceType = typeof ir.source === 'string' ? ir.source : ir.source?.type;
    if (!sourceType || !['screenshot', 'figma'].includes(sourceType)) {
      errors.push('IR source must be either "screenshot" or "figma".');
    }

    const width = ir.viewport?.width ?? ir.canvas?.width;
    const height = ir.viewport?.height ?? ir.canvas?.height;
    if (typeof width !== 'number' || typeof height !== 'number') {
      errors.push('IR must declare numeric viewport or canvas dimensions.');
    }

    if (!Array.isArray(ir.sections)) {
      errors.push('IR must declare an array of sections.');
    }
  }

  if (errors.length > 0) {
    if (throwOnError) {
      throw new Error(errors[0]);
    }
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

module.exports = {
  createDefaultTokens,
  validateIntermediateRepresentation
};
