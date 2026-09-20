/**
 * server/services/acf/ai-patch-engine.js
 * AI Architecture generation and structured surgical patch operations.
 */

const { sanitizeFieldName, generateKey, DEFAULT_LOCATION_RULES } = require('./acf-architect-engine');

/**
 * Generate full architecture from prompt/description
 */
async function generateArchitectureFromPrompt(prompt, context = {}) {
  const cleanPrompt = (prompt || '').trim();
  const lower = cleanPrompt.toLowerCase();

  const title = context.title || extractTitle(cleanPrompt) || 'Custom Content Architecture';
  const groupKey = generateKey('group', title);

  const fields = [];

  // 1. Hero Section detection
  if (lower.includes('hero') || lower.includes('landing') || lower.includes('homepage') || lower.includes('banner')) {
    fields.push({
      key: generateKey('field', 'hero_group'),
      name: 'hero_section',
      label: 'Hero Section',
      type: 'group',
      instructions: 'Primary hero banner content and media.',
      required: false,
      sub_fields: [
        {
          key: generateKey('field', 'hero_eyebrow'),
          name: 'hero_eyebrow',
          label: 'Eyebrow',
          type: 'text',
          instructions: 'Small tag or subtitle above the main headline.',
          required: false
        },
        {
          key: generateKey('field', 'hero_title'),
          name: 'hero_title',
          label: 'Hero Title',
          type: 'text',
          instructions: 'Primary heading (H1) for the page.',
          required: true
        },
        {
          key: generateKey('field', 'hero_description'),
          name: 'hero_description',
          label: 'Hero Description',
          type: 'textarea',
          instructions: 'Supporting introductory paragraph.',
          required: false
        },
        {
          key: generateKey('field', 'hero_image'),
          name: 'hero_image',
          label: 'Hero Image',
          type: 'image',
          return_format: 'array',
          instructions: 'High resolution visual asset.',
          required: false
        },
        {
          key: generateKey('field', 'hero_cta'),
          name: 'hero_button',
          label: 'CTA Button',
          type: 'link',
          return_format: 'array',
          instructions: 'Primary navigation action.',
          required: false
        }
      ]
    });
  }

  // 2. Features / Services detection
  if (lower.includes('feature') || lower.includes('service') || lower.includes('benefit') || lower.includes('card')) {
    fields.push({
      key: generateKey('field', 'features_repeater'),
      name: 'features',
      label: 'Features List',
      type: 'repeater',
      button_label: 'Add Feature Card',
      instructions: 'Repeatable feature highlights.',
      required: false,
      sub_fields: [
        {
          key: generateKey('field', 'feat_icon'),
          name: 'feature_icon',
          label: 'Icon / Graphic',
          type: 'image',
          return_format: 'array',
          instructions: 'Feature icon or illustration.'
        },
        {
          key: generateKey('field', 'feat_title'),
          name: 'feature_title',
          label: 'Feature Title',
          type: 'text',
          required: true
        },
        {
          key: generateKey('field', 'feat_desc'),
          name: 'feature_description',
          label: 'Feature Description',
          type: 'textarea'
        },
        {
          key: generateKey('field', 'feat_link'),
          name: 'feature_link',
          label: 'Detail Link',
          type: 'url'
        }
      ]
    });
  }

  // 3. Testimonials detection
  if (lower.includes('testimonial') || lower.includes('review') || lower.includes('quote')) {
    fields.push({
      key: generateKey('field', 'testimonials_repeater'),
      name: 'testimonials',
      label: 'Client Testimonials',
      type: 'repeater',
      button_label: 'Add Testimonial',
      instructions: 'Customer feedback, social proof, and ratings.',
      required: false,
      sub_fields: [
        {
          key: generateKey('field', 'test_name'),
          name: 'author_name',
          label: 'Author Name',
          type: 'text',
          required: true
        },
        {
          key: generateKey('field', 'test_role'),
          name: 'author_role',
          label: 'Role / Company',
          type: 'text'
        },
        {
          key: generateKey('field', 'test_photo'),
          name: 'author_photo',
          label: 'Author Photo',
          type: 'image',
          return_format: 'array'
        },
        {
          key: generateKey('field', 'test_quote'),
          name: 'testimonial_quote',
          label: 'Testimonial Quote',
          type: 'textarea',
          required: true
        },
        {
          key: generateKey('field', 'test_rating'),
          name: 'rating',
          label: 'Rating (1-5)',
          type: 'number',
          default_value: 5
        }
      ]
    });
  }

  // 4. FAQ detection
  if (lower.includes('faq') || lower.includes('question') || lower.includes('accordion')) {
    fields.push({
      key: generateKey('field', 'faq_repeater'),
      name: 'faq_items',
      label: 'Frequently Asked Questions',
      type: 'repeater',
      button_label: 'Add Question',
      instructions: 'Accordion list of user questions and answers.',
      required: false,
      sub_fields: [
        {
          key: generateKey('field', 'faq_question'),
          name: 'question',
          label: 'Question',
          type: 'text',
          required: true
        },
        {
          key: generateKey('field', 'faq_answer'),
          name: 'answer',
          label: 'Answer',
          type: 'wysiwyg',
          required: true
        }
      ]
    });
  }

  // 5. CTA (Call to Action) detection
  if (lower.includes('cta') || lower.includes('call to action') || lower.includes('footer banner')) {
    fields.push({
      key: generateKey('field', 'cta_group'),
      name: 'call_to_action',
      label: 'Call to Action',
      type: 'group',
      instructions: 'Bottom conversion section.',
      required: false,
      sub_fields: [
        {
          key: generateKey('field', 'cta_title'),
          name: 'cta_title',
          label: 'Headline',
          type: 'text',
          required: true
        },
        {
          key: generateKey('field', 'cta_desc'),
          name: 'cta_description',
          label: 'Description',
          type: 'textarea'
        },
        {
          key: generateKey('field', 'cta_btn'),
          name: 'cta_button',
          label: 'Button',
          type: 'link',
          return_format: 'array'
        }
      ]
    });
  }

  // Fallback: If nothing specifically matched, provide clean default structure
  if (fields.length === 0) {
    fields.push(
      {
        key: generateKey('field', 'section_title'),
        name: 'section_title',
        label: 'Section Title',
        type: 'text',
        required: true
      },
      {
        key: generateKey('field', 'section_body'),
        name: 'section_content',
        label: 'Section Content',
        type: 'wysiwyg',
        required: false
      },
      {
        key: generateKey('field', 'featured_media'),
        name: 'featured_media',
        label: 'Featured Media',
        type: 'image',
        return_format: 'array'
      }
    );
  }

  const architecture = {
    key: groupKey,
    title: title,
    description: `Structured content architecture generated for: "${cleanPrompt}"`,
    fields: fields,
    location: DEFAULT_LOCATION_RULES,
    active: true
  };

  return {
    architecture,
    explanation: `Constructed ${fields.length} content modules (${fields.map(f => f.label || f.name).join(', ')}) with production-ready field definitions.`
  };
}

/**
 * Extract a clean human-readable title from prompt
 */
function extractTitle(prompt) {
  if (!prompt) return 'Homepage';
  const clean = prompt.replace(/^(create|build|generate|make|add)\s+(a|an|the)?/i, '').trim();
  const words = clean.split(/\s+/).slice(0, 4).join(' ');
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Homepage';
}

/**
 * Apply structured AI patch command to an existing architecture
 */
async function applyAiCommand(currentArch, commandText) {
  if (!currentArch || !currentArch.fields) {
    throw new Error('Current architecture is missing or invalid.');
  }

  const cmd = (commandText || '').trim();
  const lower = cmd.toLowerCase();

  // Clone architecture
  const updated = JSON.parse(JSON.stringify(currentArch));
  const operations = [];
  let explanation = '';
  let requiresConfirmation = false;
  let affectedFields = [];

  // 1. DELETE / REMOVE COMMAND
  if (lower.startsWith('remove') || lower.startsWith('delete')) {
    const targetMatch = cmd.match(/(?:remove|delete)\s+(?:the\s+)?([a-zA-Z0-9_\-\s]+)/i);
    const targetStr = targetMatch ? targetMatch[1].trim().toLowerCase() : '';

    let removedIndex = -1;
    let removedField = null;

    updated.fields.forEach((f, idx) => {
      if (f.name.toLowerCase().includes(targetStr) || f.label.toLowerCase().includes(targetStr)) {
        removedIndex = idx;
        removedField = f;
      }
    });

    if (removedIndex !== -1 && removedField) {
      requiresConfirmation = true;
      affectedFields = [removedField.name];
      if (removedField.sub_fields) {
        affectedFields = affectedFields.concat(removedField.sub_fields.map(sf => sf.name));
      }

      updated.fields.splice(removedIndex, 1);
      operations.push({
        type: 'DELETE_FIELD',
        target: removedField.name,
        label: removedField.label
      });
      explanation = `Removed field "${removedField.label}" (${removedField.name}) and any nested sub-fields.`;
    } else {
      explanation = `Could not find a field matching "${targetStr}" to remove.`;
    }
  }
  // 2. ADD CONDITIONAL LOGIC / FIELD
  else if (lower.includes('conditional') || (lower.includes('appear') && lower.includes('when')) || lower.includes('enable_')) {
    const toggleField = {
      key: generateKey('field', 'enable_video'),
      name: 'enable_video',
      label: 'Enable Video',
      type: 'true_false',
      message: 'Show video block instead of static image',
      default_value: 0
    };

    const targetField = {
      key: generateKey('field', 'video_url'),
      name: 'video_url',
      label: 'Video URL',
      type: 'url',
      instructions: 'Direct MP4 link or YouTube/Vimeo embed URL.',
      required: false,
      conditional_logic: [
        [
          {
            field: toggleField.key,
            operator: '==',
            value: '1'
          }
        ]
      ]
    };

    updated.fields.push(toggleField, targetField);
    operations.push(
      { type: 'ADD_FIELD', field: toggleField },
      { type: 'ADD_FIELD', field: targetField },
      { type: 'UPDATE_CONDITIONAL_LOGIC', target: 'video_url', dependsOn: 'enable_video' }
    );
    explanation = `Added toggle "Enable Video" and dependent "Video URL" field with active conditional logic.`;
  }
  // 3. ADD TESTIMONIALS
  else if (lower.includes('testimonial')) {
    const testimonialRepeater = {
      key: generateKey('field', 'testimonials'),
      name: 'testimonials',
      label: 'Testimonials',
      type: 'repeater',
      button_label: 'Add Testimonial',
      instructions: 'Client feedback and reviews.',
      sub_fields: [
        { key: generateKey('field', 'test_name'), name: 'author_name', label: 'Author Name', type: 'text', required: true },
        { key: generateKey('field', 'test_photo'), name: 'author_photo', label: 'Photo', type: 'image', return_format: 'array' },
        { key: generateKey('field', 'test_quote'), name: 'quote', label: 'Quote', type: 'textarea', required: true },
        { key: generateKey('field', 'test_rating'), name: 'rating', label: 'Rating', type: 'number', default_value: 5 }
      ]
    };
    updated.fields.push(testimonialRepeater);
    operations.push({ type: 'ADD_FIELD', field: testimonialRepeater });
    explanation = `Added Testimonials repeater with author name, photo, quote, and 5-star rating.`;
  }
  // 4. ADD CTA GROUP
  else if (lower.includes('cta') || lower.includes('call to action')) {
    const ctaGroup = {
      key: generateKey('field', 'cta'),
      name: 'call_to_action',
      label: 'Call to Action',
      type: 'group',
      instructions: 'Primary conversion block.',
      sub_fields: [
        { key: generateKey('field', 'cta_title'), name: 'cta_headline', label: 'Headline', type: 'text', required: true },
        { key: generateKey('field', 'cta_desc'), name: 'cta_description', label: 'Description', type: 'textarea' },
        { key: generateKey('field', 'cta_link'), name: 'cta_button', label: 'Button Link', type: 'link', return_format: 'array' }
      ]
    };
    updated.fields.push(ctaGroup);
    operations.push({ type: 'ADD_FIELD', field: ctaGroup });
    explanation = `Added Call to Action group with headline, description, and link button.`;
  }
  // 5. MAKE FIELD OPTIONAL / REQUIRED
  else if (lower.includes('optional') || lower.includes('required')) {
    const isRequired = lower.includes('required') && !lower.includes('optional');
    let matchedField = null;

    const findAndToggle = (fields) => {
      for (const f of fields) {
        if (lower.includes(f.name.toLowerCase()) || lower.includes((f.label || '').toLowerCase())) {
          f.required = isRequired ? 1 : 0;
          matchedField = f;
          return;
        }
        if (f.sub_fields) findAndToggle(f.sub_fields);
      }
    };
    findAndToggle(updated.fields);

    if (matchedField) {
      operations.push({
        type: 'UPDATE_FIELD',
        target: matchedField.name,
        property: 'required',
        value: isRequired
      });
      explanation = `Updated "${matchedField.label}" to be ${isRequired ? 'required' : 'optional'}.`;
    } else {
      explanation = `Could not find the target field to change requirement status.`;
    }
  }
  // 6. RENAME FIELD
  else if (lower.includes('rename')) {
    const renameMatch = cmd.match(/rename\s+([a-zA-Z0-9_]+)\s+to\s+([a-zA-Z0-9_]+)/i);
    if (renameMatch) {
      const oldName = renameMatch[1].trim();
      const newName = sanitizeFieldName(renameMatch[2].trim());

      let found = false;
      const renameInList = (fields) => {
        for (const f of fields) {
          if (f.name === oldName) {
            f.name = newName;
            f.label = newName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            found = true;
            return;
          }
          if (f.sub_fields) renameInList(f.sub_fields);
        }
      };
      renameInList(updated.fields);

      if (found) {
        operations.push({ type: 'UPDATE_FIELD', target: oldName, newName });
        explanation = `Renamed field "${oldName}" to "${newName}".`;
      } else {
        explanation = `Field "${oldName}" was not found in current architecture.`;
      }
    } else {
      explanation = `Please specify rename as: "Rename <old_name> to <new_name>".`;
    }
  }
  // 7. GENERIC ADD FIELD
  else {
    const nameMatch = cmd.match(/named?\s+([a-zA-Z0-9_]+)/i);
    const labelMatch = cmd.match(/label(?:led)?\s+["']?([^"']+)["']?/i);
    
    let detectedType = 'text';
    const typeCandidates = ['number', 'textarea', 'image', 'gallery', 'file', 'wysiwyg', 'select', 'checkbox', 'radio', 'true_false', 'url', 'email', 'date_picker', 'color_picker', 'repeater', 'group', 'flexible_content'];
    for (const t of typeCandidates) {
      if (lower.includes(t)) {
        detectedType = t;
        break;
      }
    }

    const fieldName = nameMatch ? sanitizeFieldName(nameMatch[1]) : (sanitizeFieldName(cmd.split(' ').slice(1, 4).join('_')) || 'new_field');
    const fieldLabel = labelMatch ? labelMatch[1].trim() : fieldName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const newField = {
      key: generateKey('field', fieldName),
      name: fieldName,
      label: fieldLabel,
      type: detectedType,
      required: lower.includes('required'),
      instructions: `Custom field.`
    };
    updated.fields.push(newField);
    operations.push({ type: 'ADD_FIELD', field: newField });
    explanation = `Added new field "${newField.label}" (${newField.name} - ${newField.type}).`;
  }

  return {
    updatedArchitecture: updated,
    operations,
    explanation,
    requiresConfirmation,
    affectedFields
  };
}

module.exports = {
  generateArchitectureFromPrompt,
  applyAiCommand
};
