/**
 * server/services/design-to-code/generator/wordpress-generator.js
 * Generates WordPress PHP theme templates, SCSS styles, and optional ACF field structures.
 */

const { generateScssVariables } = require('./framework-mapper');

function generateWordPress(ir, options = {}) {
  const isAcf = !!options.acfMode || !!options.wordpressAcf;
  const tokens = ir.tokens || {};
  const c = tokens.colors || {};

  const phpContent = `<?php
/**
 * Template Name: Design to Code Hero Section
 * Description: Generated WordPress template with semantic markup${isAcf ? ' and ACF fields integration' : ''}.
 *
 * @package WebDev_AI_Studio
 */

${isAcf ? `// ACF Fields Data Binding
$hero_badge       = function_exists('get_field') ? get_field('hero_badge') : '';
$hero_title       = function_exists('get_field') ? get_field('hero_title') : '';
$hero_subtitle    = function_exists('get_field') ? get_field('hero_subtitle') : '';
$hero_button_text = function_exists('get_field') ? get_field('hero_button_text') : '';
$hero_button_url  = function_exists('get_field') ? get_field('hero_button_url') : '';
$hero_media       = function_exists('get_field') ? get_field('hero_media') : null;

if (empty($hero_badge))       $hero_badge = 'Design-to-Code 2.0 • Zero Vendor Lock-in';
if (empty($hero_title))       $hero_title = 'Build Modern Web Apps with Speed';
if (empty($hero_subtitle))    $hero_subtitle = 'Transform screenshots and Figma designs into production-ready, clean, maintainable code for your preferred tech stack.';
if (empty($hero_button_text)) $hero_button_text = 'Start Free Trial';
if (empty($hero_button_url))  $hero_button_url = '#';
` : `// Static Fallback Defaults
$hero_badge       = 'Design-to-Code 2.0 • Zero Vendor Lock-in';
$hero_title       = 'Build Modern Web Apps with Speed';
$hero_subtitle    = 'Transform screenshots and Figma designs into production-ready, clean, maintainable code for your preferred tech stack.';
$hero_button_text = 'Start Free Trial';
$hero_button_url  = '#';
`}
?>

<section class="c-hero" aria-labelledby="hero-title">
  <div class="c-hero__container container">
    <?php if (!empty($hero_badge)) : ?>
      <span class="c-hero__badge"><?php echo esc_html($hero_badge); ?></span>
    <?php endif; ?>

    <h1 id="hero-title" class="c-hero__title">
      <?php echo esc_html($hero_title); ?>
    </h1>

    <p class="c-hero__subtitle">
      <?php echo esc_html($hero_subtitle); ?>
    </p>

    <div class="c-hero__actions">
      <a href="<?php echo esc_url($hero_button_url); ?>" class="c-btn c-btn--primary">
        <?php echo esc_html($hero_button_text); ?>
      </a>
      <a href="#docs" class="c-btn c-btn--outline">
        <?php esc_html_e('View Documentation', 'webdev'); ?>
      </a>
    </div>

    <div class="c-hero__media">
      <?php ${isAcf ? `if (!empty($hero_media) && isset($hero_media['url'])) : ?>
        <img src="<?php echo esc_url($hero_media['url']); ?>" alt="<?php echo esc_attr($hero_media['alt'] ?? 'Preview'); ?>" class="c-hero__image" />
      <?php else : ?>` : ''}
        <div class="c-hero__placeholder" role="img" aria-label="<?php esc_attr_e('Application preview mockup', 'webdev'); ?>">
          <span class="c-hero__placeholder-title"><?php esc_html_e('Application Interface Preview', 'webdev'); ?></span>
          <span class="c-hero__placeholder-note"><?php esc_html_e('Source asset detected — upload source asset for exact output.', 'webdev'); ?></span>
        </div>
      <?php ${isAcf ? `endif;` : ''} ?>
    </div>
  </div>
</section>

<!-- Features Grid -->
<section class="c-features" aria-labelledby="features-title">
  <div class="container">
    <div class="c-features__header">
      <span class="c-features__eyebrow"><?php esc_html_e('CAPABILITIES', 'webdev'); ?></span>
      <h2 id="features-title" class="c-features__title"><?php esc_html_e('Engineered for Real Developer Workflows', 'webdev'); ?></h2>
      <p class="c-features__description"><?php esc_html_e('Production-ready output designed for maintainability, strict responsiveness, and accessibility.', 'webdev'); ?></p>
    </div>

    <div class="c-features__grid">
      <?php ${isAcf ? `if (function_exists('have_rows') && (have_rows('hero_features') || have_rows('feature_items'))) :
        while (have_rows('hero_features')) : the_row(); ?>
          <article class="c-feature-card">
            <h3 class="c-feature-card__title"><?php echo esc_html(get_sub_field('title')); ?></h3>
            <p class="c-feature-card__text"><?php echo esc_html(get_sub_field('description')); ?></p>
          </article>
        <?php endwhile;
      else : ?>` : ''}
        <article class="c-feature-card">
          <h3 class="c-feature-card__title"><?php esc_html_e('Semantic Architecture', 'webdev'); ?></h3>
          <p class="c-feature-card__text"><?php esc_html_e('Uses genuine semantic HTML tags instead of nested div soup. Easily integrates into existing theme systems.', 'webdev'); ?></p>
        </article>

        <article class="c-feature-card">
          <h3 class="c-feature-card__title"><?php esc_html_e('Fluid Responsiveness', 'webdev'); ?></h3>
          <p class="c-feature-card__text"><?php esc_html_e('Built with CSS Grid and Flexbox with adaptive mobile, tablet, and desktop breakpoints.', 'webdev'); ?></p>
        </article>

        <article class="c-feature-card">
          <h3 class="c-feature-card__title"><?php esc_html_e('axe-core Verified', 'webdev'); ?></h3>
          <p class="c-feature-card__text"><?php esc_html_e('Automatically validated against WCAG 2.1 AA accessibility standards with zero synthetic scores.', 'webdev'); ?></p>
        </article>
      <?php ${isAcf ? `endif;` : ''} ?>
    </div>
  </div>
</section>
`;

  const scssContent = `${generateScssVariables(tokens)}

// BEM Styled Component Theme Styles
.c-hero {
  padding: 80px 0 64px;
  text-align: center;

  &__container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__badge {
    display: inline-block;
    padding: 6px 14px;
    border-radius: $radius-full;
    background: $color-surface;
    border: 1px solid $color-border;
    font-size: 0.8125rem;
    font-weight: 600;
    color: $color-primary;
    margin-bottom: 24px;
  }

  &__title {
    font-size: 3rem;
    font-weight: 800;
    line-height: 1.15;
    margin-bottom: 20px;
    letter-spacing: -0.03em;
  }

  &__subtitle {
    font-size: 1.25rem;
    color: $color-text-muted;
    max-width: 640px;
    margin-bottom: 36px;
  }

  &__actions {
    display: flex;
    gap: 16px;
    margin-bottom: 56px;
  }

  &__media {
    width: 100%;
    max-width: 960px;
  }

  &__placeholder {
    width: 100%;
    height: 420px;
    background: $color-surface;
    border: 1px dashed $color-border;
    border-radius: $radius-lg;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px;
  }

  &__placeholder-title {
    font-weight: 600;
    color: $color-text;
  }

  &__placeholder-note {
    font-size: 0.8125rem;
    color: $color-text-muted;
  }
}

.c-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  font-size: 0.9375rem;
  font-weight: 600;
  border-radius: $radius-md;
  text-decoration: none;
  transition: all 0.15s ease;

  &--primary {
    background-color: $color-primary;
    color: #FFFFFF;
    &:hover { background-color: $color-primary-hover; }
  }

  &--outline {
    background-color: transparent;
    border: 1px solid $color-border;
    color: $color-text;
    &:hover { background-color: $color-surface; }
  }
}

.c-features {
  padding: 80px 0;
  background-color: $color-surface;

  &__header {
    text-align: center;
    margin-bottom: 56px;
  }

  &__eyebrow {
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: $color-primary;
    margin-bottom: 10px;
    display: block;
  }

  &__title {
    font-size: 2.25rem;
    font-weight: 700;
    margin-bottom: 12px;
  }

  &__description {
    font-size: 1.125rem;
    color: $color-text-muted;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
}

.c-feature-card {
  background: #FFFFFF;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  padding: 32px;

  &__title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 10px;
  }

  &__text {
    font-size: 0.9375rem;
    color: $color-text-muted;
    line-height: 1.6;
  }
}

@media (max-width: 1024px) {
  .c-features__grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .c-hero__title { font-size: 2.25rem; }
  .c-hero__actions { flex-direction: column; width: 100%; }
  .c-features__grid { grid-template-columns: 1fr; }
}
`;

  const files = [
    { filePath: 'template-hero.php', fileContent: phpContent, fileType: 'markup' },
    { filePath: 'scss/style.scss', fileContent: scssContent, fileType: 'style' }
  ];

  if (isAcf) {
    const acfFieldJson = JSON.stringify({
      key: 'group_webdev_hero_section',
      title: 'Hero Section & Features',
      fields: [
        { key: 'field_hero_badge', label: 'Hero Badge', name: 'hero_badge', type: 'text' },
        { key: 'field_hero_title', label: 'Hero Title', name: 'hero_title', type: 'text' },
        { key: 'field_hero_subtitle', label: 'Hero Subtitle', name: 'hero_subtitle', type: 'textarea' },
        { key: 'field_hero_button_text', label: 'Hero Button Text', name: 'hero_button_text', type: 'text' },
        { key: 'field_hero_button_url', label: 'Hero Button URL', name: 'hero_button_url', type: 'url' },
        { key: 'field_hero_media', label: 'Hero Media Image', name: 'hero_media', type: 'image' },
        {
          key: 'field_feature_items',
          label: 'Feature Items',
          name: 'feature_items',
          type: 'repeater',
          sub_fields: [
            { key: 'field_feature_title', label: 'Title', name: 'title', type: 'text' },
            { key: 'field_feature_desc', label: 'Description', name: 'description', type: 'textarea' }
          ]
        }
      ],
      location: [
        [{ param: 'page_template', operator: '==', value: 'template-hero.php' }]
      ]
    }, null, 2);

    files.push({
      filePath: 'acf-json/group_webdev_hero_section.json',
      fileContent: acfFieldJson,
      fileType: 'config'
    });
  }

  return files;
}

module.exports = {
  generateWordPress
};
