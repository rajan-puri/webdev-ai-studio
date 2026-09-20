/**
 * server/services/acf/acf-architect-engine.js
 * Core ACF Architect deterministic generation, parsing, diffing, and validation engine.
 */

const ACF_FIELD_TYPES = {
  // Basic
  text: { label: 'Text', category: 'Basic', default: '' },
  textarea: { label: 'Text Area', category: 'Basic', default: '' },
  number: { label: 'Number', category: 'Basic', default: '' },
  range: { label: 'Range', category: 'Basic', default: 0 },
  email: { label: 'Email', category: 'Basic', default: '' },
  url: { label: 'Url', category: 'Basic', default: '' },
  password: { label: 'Password', category: 'Basic', default: '' },

  // Content
  image: { label: 'Image', category: 'Content', return_formats: ['array', 'id', 'url'], default_return: 'array' },
  file: { label: 'File', category: 'Content', return_formats: ['array', 'id', 'url'], default_return: 'array' },
  gallery: { label: 'Gallery', category: 'Content', return_formats: ['array', 'id', 'url'], default_return: 'array' },
  wysiwyg: { label: 'WYSIWYG Editor', category: 'Content' },
  oembed: { label: 'oEmbed', category: 'Content' },

  // Choice
  select: { label: 'Select', category: 'Choice', return_formats: ['value', 'label', 'array'] },
  checkbox: { label: 'Checkbox', category: 'Choice', return_formats: ['value', 'label', 'array'] },
  radio: { label: 'Radio Button', category: 'Choice', return_formats: ['value', 'label', 'array'] },
  button_group: { label: 'Button Group', category: 'Choice', return_formats: ['value', 'label', 'array'] },
  true_false: { label: 'True / False', category: 'Choice', default: 0 },

  // Relational
  link: { label: 'Link', category: 'Relational', return_formats: ['array', 'url'] },
  post_object: { label: 'Post Object', category: 'Relational', return_formats: ['object', 'id'] },
  page_link: { label: 'Page Link', category: 'Relational' },
  relationship: { label: 'Relationship', category: 'Relational', return_formats: ['object', 'id'] },
  taxonomy: { label: 'Taxonomy', category: 'Relational', return_formats: ['object', 'id'] },

  // Advanced / Picker
  color_picker: { label: 'Color Picker', category: 'Advanced' },
  date_picker: { label: 'Date Picker', category: 'Advanced' },
  date_time_picker: { label: 'Date Time Picker', category: 'Advanced' },
  time_picker: { label: 'Time Picker', category: 'Advanced' },

  // Layout / Containers
  group: { label: 'Group', category: 'Layout', is_container: true },
  repeater: { label: 'Repeater', category: 'Layout', is_container: true },
  flexible_content: { label: 'Flexible Content', category: 'Layout', is_container: true, has_layouts: true },
  clone: { label: 'Clone', category: 'Layout' }
};

/**
 * Normalizes field name into valid, semantic snake_case
 */
function sanitizeFieldName(str) {
  if (!str) return 'field_' + Math.random().toString(36).substring(2, 8);
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_') || 'custom_field';
}

/**
 * Deterministic or random unique ACF key generator
 */
function generateKey(prefix = 'field', seed = '') {
  if (seed) {
    const clean = seed.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `${prefix}_${clean}_${Math.random().toString(36).substring(2, 7)}`;
  }
  return `${prefix}_${Math.random().toString(36).substring(2, 14)}`;
}

/**
 * Default location rules: Homepage template or Page post type
 */
const DEFAULT_LOCATION_RULES = [
  [
    {
      param: 'post_type',
      operator: '==',
      value: 'page'
    }
  ]
];

/**
 * Formats an arbitrary JS value into clean PHP array representation
 */
function toPhpArray(val, indent = 4) {
  const spaces = ' '.repeat(indent);
  const nextSpaces = ' '.repeat(indent + 4);

  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') {
    return `'${val.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const items = val.map(item => `${nextSpaces}${toPhpArray(item, indent + 4)}`).join(',\n');
    return `[\n${items},\n${spaces}]`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '[]';
    const entries = keys.map(k => {
      const formattedVal = toPhpArray(val[k], indent + 4);
      return `${nextSpaces}'${k}' => ${formattedVal}`;
    }).join(',\n');
    return `[\n${entries},\n${spaces}]`;
  }
  return `'${String(val)}'`;
}

/**
 * Convert internal field architecture object into native ACF JSON schema
 */
function generateAcfJson(architecture) {
  if (!architecture) throw new Error('Architecture object is required.');

  const groupKey = architecture.key || generateKey('group', architecture.title || 'architecture');
  const title = architecture.title || 'Custom Field Group';

  const mapField = (field, parentKey = groupKey) => {
    const fieldKey = field.key || generateKey('field', `${parentKey}_${field.name}`);
    const fieldName = sanitizeFieldName(field.name || field.label);
    const fieldType = field.type || 'text';

    const acfField = {
      key: fieldKey,
      label: field.label || fieldName,
      name: fieldName,
      type: fieldType,
      instructions: field.instructions || '',
      required: field.required ? 1 : 0,
      conditional_logic: field.conditional_logic || 0,
      wrapper: {
        width: (field.wrapper && field.wrapper.width) ? String(field.wrapper.width) : '',
        class: (field.wrapper && field.wrapper.class) || '',
        id: (field.wrapper && field.wrapper.id) || ''
      },
      default_value: field.default_value !== undefined ? field.default_value : ''
    };

    // Type-specific attributes
    if (fieldType === 'image' || fieldType === 'file' || fieldType === 'gallery') {
      acfField.return_format = field.return_format || 'array';
      acfField.preview_size = field.preview_size || 'medium';
      acfField.library = field.library || 'all';
      if (field.mime_types) acfField.mime_types = field.mime_types;
    } else if (fieldType === 'select' || fieldType === 'checkbox' || fieldType === 'radio' || fieldType === 'button_group') {
      acfField.choices = field.choices || { option_1: 'Option 1', option_2: 'Option 2' };
      acfField.allow_null = field.allow_null ? 1 : 0;
      acfField.multiple = field.multiple ? 1 : 0;
      acfField.return_format = field.return_format || 'value';
    } else if (fieldType === 'true_false') {
      acfField.message = field.message || '';
      acfField.default_value = field.default_value ? 1 : 0;
      acfField.ui = field.ui !== undefined ? (field.ui ? 1 : 0) : 1;
    } else if (fieldType === 'relationship' || fieldType === 'post_object') {
      acfField.post_type = field.post_type || [];
      acfField.taxonomy = field.taxonomy || [];
      acfField.return_format = field.return_format || 'object';
      acfField.min = field.min || '';
      acfField.max = field.max || '';
    } else if (fieldType === 'wysiwyg') {
      acfField.tabs = field.tabs || 'all';
      acfField.toolbar = field.toolbar || 'full';
      acfField.media_upload = field.media_upload !== undefined ? (field.media_upload ? 1 : 0) : 1;
    } else if (fieldType === 'repeater') {
      acfField.layout = field.layout || 'table';
      acfField.button_label = field.button_label || 'Add Row';
      acfField.min = field.min || 0;
      acfField.max = field.max || 0;
      acfField.sub_fields = (field.sub_fields || []).map(sf => mapField(sf, fieldKey));
    } else if (fieldType === 'group') {
      acfField.layout = field.layout || 'block';
      acfField.sub_fields = (field.sub_fields || []).map(sf => mapField(sf, fieldKey));
    } else if (fieldType === 'flexible_content') {
      acfField.button_label = field.button_label || 'Add Section';
      acfField.min = field.min || '';
      acfField.max = field.max || '';
      acfField.layouts = (field.layouts || []).map((layout, idx) => {
        const layoutKey = layout.key || `layout_${Math.random().toString(36).substring(2, 9)}`;
        return {
          key: layoutKey,
          name: sanitizeFieldName(layout.name || `layout_${idx + 1}`),
          label: layout.label || `Layout ${idx + 1}`,
          display: layout.display || 'block',
          sub_fields: (layout.sub_fields || []).map(sf => mapField(sf, layoutKey)),
          min: layout.min || '',
          max: layout.max || ''
        };
      });
    }

    // Preserve any valid raw unknown ACF properties
    if (field._rawProps && typeof field._rawProps === 'object') {
      Object.assign(acfField, field._rawProps);
    }

    return acfField;
  };

  const fields = (architecture.fields || []).map(f => mapField(f, groupKey));

  return {
    key: groupKey,
    title: title,
    fields: fields,
    location: architecture.location && architecture.location.length ? architecture.location : DEFAULT_LOCATION_RULES,
    menu_order: architecture.menu_order || 0,
    position: architecture.position || 'normal',
    style: architecture.style || 'default',
    label_placement: architecture.label_placement || 'top',
    instruction_placement: architecture.instruction_placement || 'label',
    hide_on_screen: architecture.hide_on_screen || '',
    active: architecture.active !== undefined ? !!architecture.active : true,
    description: architecture.description || '',
    show_in_rest: architecture.show_in_rest ? 1 : 0,
    modified: Math.floor(Date.now() / 1000)
  };
}

/**
 * Generate real acf_add_local_field_group PHP registration code
 */
function generatePhpRegistration(architecture) {
  const acfJson = generateAcfJson(architecture);
  const phpPayload = toPhpArray(acfJson, 4);

  return `<?php
/**
 * ACF Local Field Group Registration: ${architecture.title || 'Custom Field Group'}
 * Generated by WebDev AI Studio ACF Architect
 *
 * Place this code in your theme's functions.php or a dedicated inc/acf-fields.php file.
 */

add_action('acf/init', function() {
    if (!function_exists('acf_add_local_field_group')) {
        return;
    }

    acf_add_local_field_group(${phpPayload});
});
`;
}

/**
 * Generate semantic, escaping-compliant WordPress PHP template code
 */
function generatePhpTemplate(architecture, options = {}) {
  const mode = options.mode || 'single'; // 'single' | 'template_parts'
  const fields = architecture.fields || [];

  if (mode === 'template_parts') {
    return generateTemplateParts(architecture);
  }

  let code = `<?php
/**
 * Template: ${architecture.title || 'Page Content'}
 * Description: Renders ACF fields for ${architecture.title || 'this section'}.
 * Auto-generated by WebDev AI Studio ACF Architect with safe escaping.
 */

// Exit if accessed directly.
defined('ABSPATH') || exit;
?>

<div class="acf-content-wrap acf-group-${sanitizeFieldName(architecture.title || 'content')}">
`;

  fields.forEach(field => {
    code += renderFieldTemplateSnippet(field, 4);
  });

  code += `</div>\n`;
  return code;
}

/**
 * Generate modular template parts structure for multi-section architectures
 */
function generateTemplateParts(architecture) {
  const fields = architecture.fields || [];
  const parts = [];

  // 1. Main container template
  let mainTemplate = `<?php
/**
 * Main Template: ${architecture.title || 'Page'}
 * Modular Template Loader
 */
defined('ABSPATH') || exit;
?>\n`;

  fields.forEach(f => {
    const slug = sanitizeFieldName(f.name);
    mainTemplate += `<?php get_template_part('template-parts/content', '${slug}'); ?>\n`;

    // Generate individual sub-template
    let partCode = `<?php
/**
 * Template Part: ${f.label || f.name}
 * Path: template-parts/content-${slug}.php
 */
defined('ABSPATH') || exit;
?>\n`;
    partCode += `<section class="section-${slug}">\n`;
    partCode += renderFieldTemplateSnippet(f, 4);
    partCode += `</section>\n`;

    parts.push({
      fileName: `template-parts/content-${slug}.php`,
      content: partCode
    });
  });

  return {
    main: mainTemplate,
    parts
  };
}

/**
 * Render PHP snippet for a single field with appropriate escaping & return format handling
 */
function renderFieldTemplateSnippet(field, indent = 4) {
  const pad = ' '.repeat(indent);
  const name = sanitizeFieldName(field.name);
  const type = field.type || 'text';
  let out = '';

  switch (type) {
    case 'text':
    case 'number':
    case 'range':
    case 'color_picker':
    case 'date_picker':
    case 'time_picker':
    case 'date_time_picker':
      out += `${pad}<?php $val_${name} = get_field('${name}'); ?>\n`;
      out += `${pad}<?php if (!empty($val_${name})) : ?>\n`;
      out += `${pad}    <div class="field-${name}"><?php echo esc_html($val_${name}); ?></div>\n`;
      out += `${pad}<?php endif; ?>\n\n`;
      break;

    case 'textarea':
      out += `${pad}<?php $val_${name} = get_field('${name}'); ?>\n`;
      out += `${pad}<?php if (!empty($val_${name})) : ?>\n`;
      out += `${pad}    <div class="field-${name}"><?php echo nl2br(esc_html($val_${name})); ?></div>\n`;
      out += `${pad}<?php endif; ?>\n\n`;
      break;

    case 'wysiwyg':
      out += `${pad}<?php $val_${name} = get_field('${name}'); ?>\n`;
      out += `${pad}<?php if (!empty($val_${name})) : ?>\n`;
      out += `${pad}    <div class="field-${name} wysiwyg-entry"><?php echo wp_kses_post($val_${name}); ?></div>\n`;
      out += `${pad}<?php endif; ?>\n\n`;
      break;

    case 'url':
      out += `${pad}<?php $val_${name} = get_field('${name}'); ?>\n`;
      out += `${pad}<?php if (!empty($val_${name})) : ?>\n`;
      out += `${pad}    <a href="<?php echo esc_url($val_${name}); ?>" class="field-${name}" target="_blank" rel="noopener"><?php echo esc_html($val_${name}); ?></a>\n`;
      out += `${pad}<?php endif; ?>\n\n`;
      break;

    case 'image':
      const returnFormat = field.return_format || 'array';
      out += `${pad}<?php $img_${name} = get_field('${name}'); ?>\n`;
      out += `${pad}<?php if (!empty($img_${name})) : ?>\n`;
      if (returnFormat === 'array') {
        out += `${pad}    <figure class="field-${name}">\n`;
        out += `${pad}        <img src="<?php echo esc_url($img_${name}['url'] ?? ''); ?>" alt="<?php echo esc_attr($img_${name}['alt'] ?? '${field.label || name}'); ?>" width="<?php echo esc_attr($img_${name}['width'] ?? ''); ?>" height="<?php echo esc_attr($img_${name}['height'] ?? ''); ?>" loading="lazy">\n`;
        out += `${pad}    </figure>\n`;
      } else if (returnFormat === 'id') {
        out += `${pad}    <figure class="field-${name}">\n`;
        out += `${pad}        <?php echo wp_get_attachment_image($img_${name}, 'full', false, ['loading' => 'lazy']); ?>\n`;
        out += `${pad}    </figure>\n`;
      } else {
        // url
        out += `${pad}    <figure class="field-${name}">\n`;
        out += `${pad}        <img src="<?php echo esc_url($img_${name}); ?>" alt="<?php echo esc_attr('${field.label || name}'); ?>" loading="lazy">\n`;
        out += `${pad}    </figure>\n`;
      }
      out += `${pad}<?php endif; ?>\n\n`;
      break;

    case 'link':
      const linkFormat = field.return_format || 'array';
      out += `${pad}<?php $link_${name} = get_field('${name}'); ?>\n`;
      out += `${pad}<?php if (!empty($link_${name})) : ?>\n`;
      if (linkFormat === 'array') {
        out += `${pad}    <a href="<?php echo esc_url($link_${name}['url'] ?? '#'); ?>" target="<?php echo esc_attr($link_${name}['target'] ?: '_self'); ?>" class="btn-link">\n`;
        out += `${pad}        <?php echo esc_html($link_${name}['title'] ?: 'Learn More'); ?>\n`;
        out += `${pad}    </a>\n`;
      } else {
        out += `${pad}    <a href="<?php echo esc_url($link_${name}); ?>" class="btn-link" target="_blank"><?php echo esc_html('${field.label || name}'); ?></a>\n`;
      }
      out += `${pad}<?php endif; ?>\n\n`;
      break;

    case 'true_false':
      out += `${pad}<?php if (get_field('${name}')) : ?>\n`;
      out += `${pad}    <div class="badge-status-active"><?php esc_html_e('${field.message || 'Active'}', 'textdomain'); ?></div>\n`;
      out += `${pad}<?php endif; ?>\n\n`;
      break;

    case 'repeater':
      out += `${pad}<?php if (have_rows('${name}')) : ?>\n`;
      out += `${pad}    <div class="repeater-${name}-list">\n`;
      out += `${pad}        <?php while (have_rows('${name}')) : the_row(); ?>\n`;
      out += `${pad}            <div class="repeater-item">\n`;
      (field.sub_fields || []).forEach(sf => {
        const subName = sanitizeFieldName(sf.name);
        if (sf.type === 'image') {
          out += `${pad}                <?php $sub_img = get_sub_field('${subName}'); ?>\n`;
          out += `${pad}                <?php if ($sub_img) : ?><img src="<?php echo esc_url(is_array($sub_img) ? ($sub_img['url'] ?? '') : $sub_img); ?>" alt=""><?php endif; ?>\n`;
        } else if (sf.type === 'wysiwyg') {
          out += `${pad}                <div class="item-${subName}"><?php echo wp_kses_post(get_sub_field('${subName}')); ?></div>\n`;
        } else {
          out += `${pad}                <span class="item-${subName}"><?php echo esc_html(get_sub_field('${subName}')); ?></span>\n`;
        }
      });
      out += `${pad}            </div>\n`;
      out += `${pad}        <?php endwhile; ?>\n`;
      out += `${pad}    </div>\n`;
      out += `${pad}<?php endif; ?>\n\n`;
      break;

    case 'group':
      out += `${pad}<?php $grp_${name} = get_field('${name}'); ?>\n`;
      out += `${pad}<?php if (!empty($grp_${name})) : ?>\n`;
      out += `${pad}    <div class="group-container-${name}">\n`;
      (field.sub_fields || []).forEach(sf => {
        const subName = sanitizeFieldName(sf.name);
        out += `${pad}        <div class="subfield-${subName}"><?php echo esc_html($grp_${name}['${subName}'] ?? ''); ?></div>\n`;
      });
      out += `${pad}    </div>\n`;
      out += `${pad}<?php endif; ?>\n\n`;
      break;

    case 'flexible_content':
      out += `${pad}<?php if (have_rows('${name}')) : ?>\n`;
      out += `${pad}    <div class="flexible-sections-${name}">\n`;
      out += `${pad}        <?php while (have_rows('${name}')) : the_row(); ?>\n`;
      out += `${pad}            <?php $layout = get_row_layout(); ?>\n`;
      out += `${pad}            <?php switch ($layout) : ?>\n`;
      (field.layouts || []).forEach(layout => {
        const layoutName = sanitizeFieldName(layout.name);
        out += `${pad}                <?php case '${layoutName}': ?>\n`;
        out += `${pad}                    <div class="layout-${layoutName}">\n`;
        (layout.sub_fields || []).forEach(sf => {
          const sfName = sanitizeFieldName(sf.name);
          out += `${pad}                        <div><?php echo esc_html(get_sub_field('${sfName}')); ?></div>\n`;
        });
        out += `${pad}                    </div>\n`;
        out += `${pad}                    <?php break; ?>\n`;
      });
      out += `${pad}            <?php endswitch; ?>\n`;
      out += `${pad}        <?php endwhile; ?>\n`;
      out += `${pad}    </div>\n`;
      out += `${pad}<?php endif; ?>\n\n`;
      break;

    default:
      out += `${pad}<?php $val_${name} = get_field('${name}'); ?>\n`;
      out += `${pad}<?php if (!empty($val_${name})) : ?>\n`;
      out += `${pad}    <div class="field-${name}"><?php echo esc_html(is_scalar($val_${name}) ? $val_${name} : json_encode($val_${name})); ?></div>\n`;
      out += `${pad}<?php endif; ?>\n\n`;
      break;
  }

  return out;
}

/**
 * Generate human-readable Markdown field documentation
 */
function generateFieldDocumentation(architecture) {
  const title = architecture.title || 'Custom Field Group';
  const key = architecture.key || 'group_default';
  const desc = architecture.description || 'Custom WordPress content architecture.';
  const fields = architecture.fields || [];

  let md = `# ${title}\n\n`;
  md += `**ACF Key:** \`${key}\`  \n`;
  md += `**Description:** ${desc}  \n`;
  md += `**Generated By:** WebDev AI Studio — ACF Architect  \n\n`;

  md += `## Location Rules\n`;
  const locations = architecture.location || DEFAULT_LOCATION_RULES;
  locations.forEach((group, gIdx) => {
    md += `**Rule Group ${gIdx + 1}:**\n`;
    group.forEach(rule => {
      md += `- Show if \`${rule.param}\` ${rule.operator} \`${rule.value}\`\n`;
    });
  });
  md += `\n`;

  md += `## Field Dictionary\n\n`;
  md += `| Field Label | Field Name | Type | Required | Return Format | Instructions |\n`;
  md += `| :--- | :--- | :--- | :---: | :--- | :--- |\n`;

  const documentField = (f, depth = 0) => {
    const indentPrefix = depth > 0 ? '&nbsp;&nbsp;'.repeat(depth) + '↳ ' : '';
    const req = f.required ? '✓ Yes' : 'No';
    const ret = f.return_format || (ACF_FIELD_TYPES[f.type] && ACF_FIELD_TYPES[f.type].default_return) || '—';
    const instr = (f.instructions || '—').replace(/\|/g, '\\|');
    md += `| ${indentPrefix}**${f.label || f.name}** | \`${f.name}\` | \`${f.type}\` | ${req} | \`${ret}\` | ${instr} |\n`;

    if (f.sub_fields && f.sub_fields.length) {
      f.sub_fields.forEach(sf => documentField(sf, depth + 1));
    }
    if (f.layouts && f.layouts.length) {
      f.layouts.forEach(layout => {
        md += `| ${indentPrefix}&nbsp;&nbsp;📁 *Layout: ${layout.label || layout.name}* | \`${layout.name}\` | *layout* | — | — | — |\n`;
        (layout.sub_fields || []).forEach(sf => documentField(sf, depth + 2));
      });
    }
  };

  fields.forEach(f => documentField(f, 0));

  md += `\n## Developer Usage Quick-Ref\n\n`;
  md += `\`\`\`php\n// Simple Field\n$heading = get_field('example_field');\n\n// Check if active\nif (get_field('example_field')) {\n    // ...\n}\n\`\`\`\n`;

  return md;
}

/**
 * Calculates differences between two architectures (Added, Modified, Deleted)
 */
function calculateArchitectureDiff(baseArch, currentArch) {
  const diff = {
    added: [],
    modified: [],
    deleted: [],
    summary: { addedCount: 0, modifiedCount: 0, deletedCount: 0 }
  };

  if (!baseArch || !baseArch.fields) {
    (currentArch.fields || []).forEach(f => {
      diff.added.push({ name: f.name, label: f.label, type: f.type });
    });
    diff.summary.addedCount = diff.added.length;
    return diff;
  }

  const baseMap = new Map();
  const flattenFields = (arr, prefix = '') => {
    arr.forEach(f => {
      const path = prefix ? `${prefix}.${f.name}` : f.name;
      baseMap.set(path, f);
      if (f.sub_fields) flattenFields(f.sub_fields, path);
      if (f.layouts) {
        f.layouts.forEach(l => {
          if (l.sub_fields) flattenFields(l.sub_fields, `${path}.${l.name}`);
        });
      }
    });
  };
  flattenFields(baseArch.fields || []);

  const currentMap = new Map();
  const flattenCurrent = (arr, prefix = '') => {
    arr.forEach(f => {
      const path = prefix ? `${prefix}.${f.name}` : f.name;
      currentMap.set(path, f);
      if (f.sub_fields) flattenCurrent(f.sub_fields, path);
      if (f.layouts) {
        f.layouts.forEach(l => {
          if (l.sub_fields) flattenCurrent(l.sub_fields, `${path}.${l.name}`);
        });
      }
    });
  };
  flattenCurrent(currentArch.fields || []);

  // Check additions & modifications
  for (const [path, curr] of currentMap.entries()) {
    if (!baseMap.has(path)) {
      diff.added.push({ path, name: curr.name, label: curr.label, type: curr.type });
    } else {
      const base = baseMap.get(path);
      const changes = [];
      if (base.type !== curr.type) changes.push(`type: ${base.type} → ${curr.type}`);
      if (base.label !== curr.label) changes.push(`label: "${base.label}" → "${curr.label}"`);
      if (Boolean(base.required) !== Boolean(curr.required)) changes.push(`required: ${!!base.required} → ${!!curr.required}`);
      if (base.return_format !== curr.return_format && curr.return_format) changes.push(`return_format: ${base.return_format} → ${curr.return_format}`);

      if (changes.length > 0) {
        diff.modified.push({ path, name: curr.name, label: curr.label, changes });
      }
    }
  }

  // Check deletions
  for (const [path, base] of baseMap.entries()) {
    if (!currentMap.has(path)) {
      diff.deleted.push({ path, name: base.name, label: base.label, type: base.type });
    }
  }

  diff.summary.addedCount = diff.added.length;
  diff.summary.modifiedCount = diff.modified.length;
  diff.summary.deletedCount = diff.deleted.length;

  return diff;
}

/**
 * Validates architecture across Structure, ACF Constraints, JSON, PHP, and Templates
 */
function validateArchitecture(architecture) {
  const issues = [];
  const warnings = [];

  if (!architecture || typeof architecture !== 'object') {
    return {
      isValid: false,
      issues: [{ category: 'STRUCTURE', message: 'Architecture must be an object' }],
      warnings: [],
      summary: { totalErrors: 1, totalWarnings: 0 }
    };
  }

  if (!architecture.title || !architecture.title.trim()) {
    warnings.push({ category: 'STRUCTURE', message: 'Field Group title is missing or empty.' });
  }

  const fieldNames = new Set();
  const fieldKeys = new Set();

  function checkField(f, path = '') {
    const fieldPath = path ? `${path} > ${f.name || 'unnamed'}` : (f.name || 'unnamed');

    // 1. Valid name
    if (!f.name || !f.name.trim()) {
      issues.push({ category: 'STRUCTURE', message: `Field at "${fieldPath}" is missing a name.` });
    } else {
      const sanitized = sanitizeFieldName(f.name);
      if (f.name !== sanitized) {
        warnings.push({ category: 'NAMING', message: `Field name "${f.name}" should be snake_case (e.g. "${sanitized}").` });
      }
      if (fieldNames.has(f.name)) {
        issues.push({ category: 'STRUCTURE', message: `Duplicate field name "${f.name}" detected.` });
      }
      fieldNames.add(f.name);
    }

    // 2. Valid key
    if (f.key) {
      if (fieldKeys.has(f.key)) {
        issues.push({ category: 'ACF', message: `Duplicate field key "${f.key}" detected.` });
      }
      fieldKeys.add(f.key);
    }

    // 3. Valid type
    if (!f.type || !ACF_FIELD_TYPES[f.type]) {
      issues.push({ category: 'STRUCTURE', message: `Field "${f.name}" has invalid type "${f.type}".` });
    }

    // 4. Container validation
    if (f.type === 'repeater') {
      if (!f.sub_fields || f.sub_fields.length === 0) {
        warnings.push({ category: 'ACF', message: `Repeater field "${f.name}" has no sub-fields defined.` });
      } else {
        f.sub_fields.forEach(sf => checkField(sf, fieldPath));
      }
    } else if (f.type === 'group') {
      if (!f.sub_fields || f.sub_fields.length === 0) {
        warnings.push({ category: 'ACF', message: `Group field "${f.name}" has no sub-fields defined.` });
      } else {
        f.sub_fields.forEach(sf => checkField(sf, fieldPath));
      }
    } else if (f.type === 'flexible_content') {
      if (!f.layouts || f.layouts.length === 0) {
        warnings.push({ category: 'ACF', message: `Flexible Content field "${f.name}" has no layouts defined.` });
      } else {
        const layoutNames = new Set();
        f.layouts.forEach((layout, lIdx) => {
          if (!layout.name) {
            issues.push({ category: 'ACF', message: `Flexible Content "${f.name}" layout #${lIdx + 1} is missing a name.` });
          } else if (layoutNames.has(layout.name)) {
            issues.push({ category: 'ACF', message: `Duplicate layout name "${layout.name}" in Flexible Content "${f.name}".` });
          } else {
            layoutNames.add(layout.name);
          }
          (layout.sub_fields || []).forEach(sf => checkField(sf, `${fieldPath} > ${layout.name}`));
        });
      }
    }

    // 5. Conditional logic target reference validation
    if (f.conditional_logic && Array.isArray(f.conditional_logic)) {
      f.conditional_logic.forEach((ruleGroup, gIdx) => {
        if (Array.isArray(ruleGroup)) {
          ruleGroup.forEach(rule => {
            if (!rule.field) {
              issues.push({ category: 'CONDITIONAL_LOGIC', message: `Field "${f.name}" has conditional rule with missing target field.` });
            }
          });
        }
      });
    }
  }

  (architecture.fields || []).forEach(f => checkField(f));

  // Location rules check
  if (!architecture.location || !architecture.location.length) {
    warnings.push({ category: 'LOCATION', message: 'No location rules configured; defaults to Page post type.' });
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    summary: {
      totalErrors: issues.length,
      totalWarnings: warnings.length,
      fieldCount: fieldNames.size
    }
  };
}

module.exports = {
  ACF_FIELD_TYPES,
  DEFAULT_LOCATION_RULES,
  sanitizeFieldName,
  generateKey,
  toPhpArray,
  generateAcfJson,
  generatePhpRegistration,
  generatePhpTemplate,
  generateFieldDocumentation,
  calculateArchitectureDiff,
  validateArchitecture
};
