/**
 * server/services/schema/schema-engine.js
 * Production-grade Schema.org & JSON-LD generation and validation engine.
 * Deterministic generation, strict syntax checks, and Google Rich Result technical guidance.
 */

// Catalog of supported Schema types with comprehensive metadata
const SCHEMA_TYPE_CATALOG = {
  LocalBusiness: {
    type: 'LocalBusiness',
    label: 'Local Business',
    category: 'Business & Organization',
    description: 'Physical business or branch with an address, opening hours, and contact information.',
    googleRichResult: {
      supported: true,
      featureName: 'Local Business Rich Card & Knowledge Panel',
      docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/local-business',
      disclaimer: 'Schema.org defines the structural taxonomy. Google Rich Results eligibility requires meeting Google Search Central guidelines and site quality policies.'
    },
    requiredProps: ['name', 'address'],
    recommendedProps: ['image', 'telephone', 'priceRange', 'openingHoursSpecification', 'geo', 'url'],
    subtypes: ['Restaurant', 'Store', 'MedicalBusiness', 'ProfessionalService', 'AutoRepair', 'Hotel', 'FinancialService']
  },
  Organization: {
    type: 'Organization',
    label: 'Organization / Company',
    category: 'Business & Organization',
    description: 'Corporate entities, non-profits, institutions, or associations.',
    googleRichResult: {
      supported: true,
      featureName: 'Organization Rich Result & Logo',
      docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/organization',
      disclaimer: 'Google supports Organization structured data for logos and brand knowledge cards.'
    },
    requiredProps: ['name', 'url'],
    recommendedProps: ['logo', 'description', 'sameAs', 'contactPoint', 'email', 'telephone']
  },
  Product: {
    type: 'Product',
    label: 'Product',
    category: 'Commerce & Products',
    description: 'Tangible product, digital goods, or merchandise with pricing, availability, and reviews.',
    googleRichResult: {
      supported: true,
      featureName: 'Product Snippets & Merchant Listings',
      docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/product',
      disclaimer: 'Google displays price, availability, and review stars if guidelines are met.'
    },
    requiredProps: ['name', 'image', 'offers'],
    recommendedProps: ['description', 'brand', 'sku', 'aggregateRating', 'review']
  },
  Service: {
    type: 'Service',
    label: 'Service',
    category: 'Commerce & Products',
    description: 'Intangible service provided by a business or professional.',
    googleRichResult: {
      supported: false,
      featureName: 'Standard Schema.org Service Definition',
      docUrl: 'https://schema.org/Service',
      disclaimer: 'Google does not currently offer a dedicated Rich Result badge for Service, but structured data informs the Knowledge Graph.'
    },
    requiredProps: ['name', 'provider'],
    recommendedProps: ['serviceType', 'areaServed', 'description', 'offers']
  },
  Article: {
    type: 'Article',
    label: 'Article / News / Blog',
    category: 'Editorial & Content',
    description: 'News stories, blog posts, investigative articles, or analytical publications.',
    googleRichResult: {
      supported: true,
      featureName: 'Article Rich Snippet & Top Stories',
      docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/article',
      disclaimer: 'Article markup can enhance headline display, carousel inclusion, and date badges.'
    },
    requiredProps: ['headline', 'image', 'datePublished', 'author'],
    recommendedProps: ['dateModified', 'publisher', 'description', 'mainEntityOfPage']
  },
  BlogPosting: {
    type: 'BlogPosting',
    label: 'Blog Posting',
    category: 'Editorial & Content',
    description: 'A blog post published on a website or weblog.',
    googleRichResult: {
      supported: true,
      featureName: 'Article Rich Snippet & Carousels',
      docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/article',
      disclaimer: 'Treated by Google as a subtype of Article with identical rich result opportunities.'
    },
    requiredProps: ['headline', 'image', 'datePublished', 'author'],
    recommendedProps: ['dateModified', 'publisher', 'description']
  },
  FAQPage: {
    type: 'FAQPage',
    label: 'FAQ Page',
    category: 'Structure & Navigation',
    description: 'Frequently Asked Questions page with accordion question and answer items.',
    googleRichResult: {
      supported: true,
      featureName: 'FAQ Accordion Rich Snippet (Government/Health Sites)',
      docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/faqpage',
      disclaimer: 'Note: As of August 2023, Google restricts FAQ rich results primarily to well-known government and health sites, but valid markup is still recommended for search clarity.'
    },
    requiredProps: ['mainEntity'],
    recommendedProps: []
  },
  BreadcrumbList: {
    type: 'BreadcrumbList',
    label: 'Breadcrumbs',
    category: 'Structure & Navigation',
    description: 'Hierarchy of pages indicating the user’s position on a website.',
    googleRichResult: {
      supported: true,
      featureName: 'Breadcrumb Navigation Path',
      docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/breadcrumb',
      disclaimer: 'Google displays the navigational hierarchy path in standard search snippets.'
    },
    requiredProps: ['itemListElement'],
    recommendedProps: []
  },
  Event: {
    type: 'Event',
    label: 'Event',
    category: 'Events & Experiences',
    description: 'Scheduled public or private event, conference, concert, or festival.',
    googleRichResult: {
      supported: true,
      featureName: 'Event Rich Listing & Map Integration',
      docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/event',
      disclaimer: 'Google displays date, location, and ticket options for upcoming events.'
    },
    requiredProps: ['name', 'startDate', 'location'],
    recommendedProps: ['endDate', 'description', 'offers', 'eventStatus', 'eventAttendanceMode', 'image']
  },
  JobPosting: {
    type: 'JobPosting',
    label: 'Job Posting',
    category: 'Career & Employment',
    description: 'A job opening or employment vacancy.',
    googleRichResult: {
      supported: true,
      featureName: 'Google for Jobs Dedicated Experience',
      docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/job-posting',
      disclaimer: 'Google surfaces jobs in the dedicated Google for Jobs search interface.'
    },
    requiredProps: ['title', 'description', 'datePosted', 'hiringOrganization', 'jobLocation'],
    recommendedProps: ['validThrough', 'employmentType', 'baseSalary']
  },
  Recipe: {
    type: 'Recipe',
    label: 'Recipe',
    category: 'Food & Cooking',
    description: 'Culinary directions, cooking times, ingredients, and nutritional information.',
    googleRichResult: {
      supported: true,
      featureName: 'Recipe Rich Card & Visual Carousel',
      docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/recipe',
      disclaimer: 'Displays prep time, calories, ratings, and step-by-step guidance.'
    },
    requiredProps: ['name', 'image', 'recipeIngredient', 'recipeInstructions'],
    recommendedProps: ['description', 'prepTime', 'cookTime', 'totalTime', 'recipeYield', 'aggregateRating', 'author']
  },
  VideoObject: {
    type: 'VideoObject',
    label: 'Video',
    category: 'Media & Video',
    description: 'Web video content with duration, thumbnail, and stream or embed URLs.',
    googleRichResult: {
      supported: true,
      featureName: 'Video Badges & Key Moments',
      docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/video',
      disclaimer: 'Google surfaces video duration, thumbnail preview, and seekable key moments.'
    },
    requiredProps: ['name', 'description', 'thumbnailUrl', 'uploadDate'],
    recommendedProps: ['duration', 'contentUrl', 'embedUrl']
  },
  WebPage: {
    type: 'WebPage',
    label: 'Web Page',
    category: 'Structure & Navigation',
    description: 'General webpage metadata representing an individual document on the web.',
    googleRichResult: {
      supported: false,
      featureName: 'Standard Schema.org WebPage Definition',
      docUrl: 'https://schema.org/WebPage',
      disclaimer: 'Provides semantic hierarchy context for crawlers and knowledge engines.'
    },
    requiredProps: ['name', 'url'],
    recommendedProps: ['description', 'isPartOf', 'inLanguage']
  }
};

/**
 * Remove empty strings, nulls, undefined, and empty objects/arrays from output
 */
function cleanSchemaObject(obj) {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  if (Array.isArray(obj)) {
    const cleaned = obj.map(cleanSchemaObject).filter(v => v !== undefined && v !== null);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  if (typeof obj === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleaned = cleanSchemaObject(v);
      if (cleaned !== undefined && cleaned !== null) {
        res[k] = cleaned;
      }
    }
    return Object.keys(res).length > 0 ? res : undefined;
  }
  return obj;
}

/**
 * Deterministically generates JSON-LD data structure from facts based on schema type
 */
function generateJsonLd(schemaType, facts = {}) {
  const meta = SCHEMA_TYPE_CATALOG[schemaType] || {
    type: schemaType,
    label: schemaType,
    requiredProps: ['name'],
    recommendedProps: []
  };

  const base = {
    '@context': 'https://schema.org',
    '@type': facts['@type'] || meta.type
  };

  switch (schemaType) {
    case 'LocalBusiness': {
      base['@type'] = facts.subtype || 'LocalBusiness';
      if (facts.name) base.name = facts.name;
      if (facts.legalName) base.legalName = facts.legalName;
      if (facts.description) base.description = facts.description;
      if (facts.url) base.url = facts.url;
      if (facts.logo) base.logo = facts.logo;
      if (facts.image) base.image = facts.image;
      if (facts.telephone) base.telephone = facts.telephone;
      if (facts.email) base.email = facts.email;
      if (facts.priceRange) base.priceRange = facts.priceRange;

      if (facts.streetAddress || facts.addressLocality || facts.postalCode || facts.addressCountry) {
        base.address = {
          '@type': 'PostalAddress',
          streetAddress: facts.streetAddress || '',
          addressLocality: facts.addressLocality || '',
          addressRegion: facts.addressRegion || '',
          postalCode: facts.postalCode || '',
          addressCountry: facts.addressCountry || ''
        };
      }

      if (facts.latitude && facts.longitude) {
        base.geo = {
          '@type': 'GeoCoordinates',
          latitude: parseFloat(facts.latitude) || facts.latitude,
          longitude: parseFloat(facts.longitude) || facts.longitude
        };
      }

      if (Array.isArray(facts.openingHours) && facts.openingHours.length > 0) {
        base.openingHoursSpecification = facts.openingHours.map(spec => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: spec.dayOfWeek || spec.days || 'Monday',
          opens: spec.opens || '09:00',
          closes: spec.closes || '18:00'
        }));
      }

      if (facts.sameAs) {
        const links = typeof facts.sameAs === 'string' ? facts.sameAs.split('\n').map(s => s.trim()).filter(Boolean) : facts.sameAs;
        if (links.length > 0) base.sameAs = links;
      }
      break;
    }

    case 'Organization': {
      if (facts.name) base.name = facts.name;
      if (facts.legalName) base.legalName = facts.legalName;
      if (facts.url) base.url = facts.url;
      if (facts.logo) base.logo = facts.logo;
      if (facts.description) base.description = facts.description;
      if (facts.email) base.email = facts.email;
      if (facts.telephone) base.telephone = facts.telephone;
      if (facts.sameAs) {
        const links = typeof facts.sameAs === 'string' ? facts.sameAs.split('\n').map(s => s.trim()).filter(Boolean) : facts.sameAs;
        if (links.length > 0) base.sameAs = links;
      }
      if (facts.contactPoint) {
        base.contactPoint = {
          '@type': 'ContactPoint',
          telephone: facts.telephone || facts.contactPoint.telephone || '',
          contactType: facts.contactPoint.contactType || 'customer service'
        };
      }
      break;
    }

    case 'Product': {
      if (facts.name) base.name = facts.name;
      if (facts.image) base.image = facts.image;
      if (facts.description) base.description = facts.description;
      if (facts.sku) base.sku = facts.sku;
      if (facts.mpn) base.mpn = facts.mpn;
      if (facts.brand) {
        base.brand = {
          '@type': 'Brand',
          name: facts.brand
        };
      }

      // Offers
      if (facts.price || facts.offers) {
        const priceVal = facts.price ? String(facts.price).replace(/[^0-9.]/g, '') : '0.00';
        base.offers = {
          '@type': 'Offer',
          url: facts.url || facts.offerUrl || '',
          priceCurrency: facts.priceCurrency || 'USD',
          price: priceVal,
          availability: facts.availability ? `https://schema.org/${facts.availability.replace(/^https?:\/\/schema\.org\//, '')}` : 'https://schema.org/InStock',
          itemCondition: facts.itemCondition ? `https://schema.org/${facts.itemCondition.replace(/^https?:\/\/schema\.org\//, '')}` : 'https://schema.org/NewCondition'
        };
      }

      // AggregateRating
      if (facts.ratingValue && (facts.reviewCount || facts.ratingCount)) {
        base.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: parseFloat(facts.ratingValue) || facts.ratingValue,
          reviewCount: parseInt(facts.reviewCount || facts.ratingCount, 10) || 1,
          bestRating: facts.bestRating || '5',
          worstRating: facts.worstRating || '1'
        };
      }
      break;
    }

    case 'Service': {
      if (facts.name) base.name = facts.name;
      if (facts.serviceType) base.serviceType = facts.serviceType;
      if (facts.description) base.description = facts.description;
      if (facts.url) base.url = facts.url;
      if (facts.provider) {
        base.provider = {
          '@type': 'LocalBusiness',
          name: facts.provider
        };
      }
      if (facts.areaServed) base.areaServed = facts.areaServed;
      if (facts.price) {
        base.offers = {
          '@type': 'Offer',
          priceCurrency: facts.priceCurrency || 'USD',
          price: String(facts.price)
        };
      }
      break;
    }

    case 'Article':
    case 'BlogPosting': {
      base['@type'] = schemaType;
      if (facts.headline) base.headline = facts.headline;
      if (facts.description) base.description = facts.description;
      if (facts.image) base.image = facts.image;
      if (facts.datePublished) base.datePublished = facts.datePublished;
      if (facts.dateModified) base.dateModified = facts.dateModified || facts.datePublished;
      if (facts.url) {
        base.mainEntityOfPage = {
          '@type': 'WebPage',
          '@id': facts.url
        };
      }

      if (facts.authorName || facts.author) {
        base.author = {
          '@type': facts.authorType || 'Person',
          name: facts.authorName || facts.author,
          url: facts.authorUrl || undefined
        };
      }

      if (facts.publisherName || facts.publisher) {
        base.publisher = {
          '@type': 'Organization',
          name: facts.publisherName || facts.publisher,
          logo: facts.publisherLogo ? {
            '@type': 'ImageObject',
            url: facts.publisherLogo
          } : undefined
        };
      }
      break;
    }

    case 'FAQPage': {
      base['@type'] = 'FAQPage';
      const rawFaqs = Array.isArray(facts.faqs) ? facts.faqs : (Array.isArray(facts.mainEntity) ? facts.mainEntity : []);
      base.mainEntity = rawFaqs.map(item => ({
        '@type': 'Question',
        name: item.question || item.name || '',
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer || item.acceptedAnswer?.text || ''
        }
      }));
      break;
    }

    case 'BreadcrumbList': {
      base['@type'] = 'BreadcrumbList';
      const items = Array.isArray(facts.breadcrumbs) ? facts.breadcrumbs : (Array.isArray(facts.itemListElement) ? facts.itemListElement : []);
      base.itemListElement = items.map((bc, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: bc.name || '',
        item: bc.url || bc.item || ''
      }));
      break;
    }

    case 'Event': {
      if (facts.name) base.name = facts.name;
      if (facts.startDate) base.startDate = facts.startDate;
      if (facts.endDate) base.endDate = facts.endDate;
      if (facts.description) base.description = facts.description;
      if (facts.image) base.image = facts.image;
      if (facts.eventStatus) base.eventStatus = `https://schema.org/${facts.eventStatus.replace(/^https?:\/\/schema\.org\//, '')}`;
      if (facts.eventAttendanceMode) base.eventAttendanceMode = `https://schema.org/${facts.eventAttendanceMode.replace(/^https?:\/\/schema\.org\//, '')}`;

      if (facts.locationName || facts.locationAddress) {
        base.location = {
          '@type': 'Place',
          name: facts.locationName || '',
          address: facts.locationAddress || facts.streetAddress || ''
        };
      } else if (facts.virtualLocationUrl) {
        base.location = {
          '@type': 'VirtualLocation',
          url: facts.virtualLocationUrl
        };
      }

      if (facts.price || facts.ticketUrl) {
        base.offers = {
          '@type': 'Offer',
          url: facts.ticketUrl || facts.url || '',
          price: facts.price || '0',
          priceCurrency: facts.priceCurrency || 'USD',
          availability: 'https://schema.org/InStock'
        };
      }
      break;
    }

    case 'JobPosting': {
      if (facts.title) base.title = facts.title;
      if (facts.description) base.description = facts.description;
      if (facts.datePosted) base.datePosted = facts.datePosted;
      if (facts.validThrough) base.validThrough = facts.validThrough;
      if (facts.employmentType) base.employmentType = facts.employmentType;

      if (facts.hiringOrganization || facts.company) {
        base.hiringOrganization = {
          '@type': 'Organization',
          name: facts.hiringOrganization || facts.company,
          sameAs: facts.companyUrl || undefined,
          logo: facts.companyLogo || undefined
        };
      }

      if (facts.jobLocation || facts.addressLocality) {
        base.jobLocation = {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: facts.addressLocality || facts.jobLocation || '',
            addressRegion: facts.addressRegion || '',
            addressCountry: facts.addressCountry || ''
          }
        };
      }

      if (facts.baseSalary || facts.salary) {
        base.baseSalary = {
          '@type': 'MonetaryAmount',
          currency: facts.currency || 'USD',
          value: {
            '@type': 'QuantitativeValue',
            value: facts.baseSalary || facts.salary,
            unitText: facts.salaryUnit || 'YEAR'
          }
        };
      }
      break;
    }

    case 'Recipe': {
      if (facts.name) base.name = facts.name;
      if (facts.image) base.image = facts.image;
      if (facts.description) base.description = facts.description;
      if (facts.prepTime) base.prepTime = facts.prepTime;
      if (facts.cookTime) base.cookTime = facts.cookTime;
      if (facts.totalTime) base.totalTime = facts.totalTime;
      if (facts.recipeYield) base.recipeYield = facts.recipeYield;
      if (facts.recipeCategory) base.recipeCategory = facts.recipeCategory;
      if (facts.recipeCuisine) base.recipeCuisine = facts.recipeCuisine;

      if (Array.isArray(facts.recipeIngredient)) {
        base.recipeIngredient = facts.recipeIngredient;
      } else if (typeof facts.recipeIngredient === 'string') {
        base.recipeIngredient = facts.recipeIngredient.split('\n').map(s => s.trim()).filter(Boolean);
      }

      if (Array.isArray(facts.recipeInstructions)) {
        base.recipeInstructions = facts.recipeInstructions.map(step => (
          typeof step === 'string' ? { '@type': 'HowToStep', text: step } : step
        ));
      }
      break;
    }

    case 'VideoObject': {
      if (facts.name) base.name = facts.name;
      if (facts.description) base.description = facts.description;
      if (facts.thumbnailUrl) base.thumbnailUrl = facts.thumbnailUrl;
      if (facts.uploadDate) base.uploadDate = facts.uploadDate;
      if (facts.duration) base.duration = facts.duration;
      if (facts.contentUrl) base.contentUrl = facts.contentUrl;
      if (facts.embedUrl) base.embedUrl = facts.embedUrl;
      break;
    }

    case 'WebPage': {
      if (facts.name) base.name = facts.name;
      if (facts.description) base.description = facts.description;
      if (facts.url) base.url = facts.url;
      if (facts.inLanguage) base.inLanguage = facts.inLanguage;
      break;
    }

    default: {
      // General fallback
      for (const [k, v] of Object.entries(facts)) {
        if (!k.startsWith('@') && v !== undefined && v !== null && v !== '') {
          base[k] = v;
        }
      }
      break;
    }
  }

  // Merge custom developer properties if provided
  if (facts.customProperties && typeof facts.customProperties === 'object') {
    for (const [k, v] of Object.entries(facts.customProperties)) {
      if (v !== undefined && v !== null && v !== '') {
        base[k] = v;
      }
    }
  }

  const cleaned = cleanSchemaObject(base) || {
    '@context': 'https://schema.org',
    '@type': schemaType
  };

  return cleaned;
}

/**
 * Validates a schema JSON string or parsed object
 */
function validateSchema(input, selectedType) {
  const result = {
    isValid: false,
    syntaxValid: false,
    schemaOrgValid: false,
    googleEligible: false, // Technical adherence only
    googleStatusText: 'Not verified by Google Search',
    googleDisclaimer: 'Eligibility status: Not verified by Google. Google determines rich snippets dynamically based on site authority, search intent, and Search Central policies.',
    errors: [],
    warnings: [],
    notices: [],
    stats: {
      totalProperties: 0,
      requiredPresent: 0,
      requiredTotal: 0,
      recommendedPresent: 0,
      recommendedTotal: 0
    },
    parsedData: null
  };

  // 1. JSON Syntax Check
  let parsed = null;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
      result.syntaxValid = true;
    } catch (e) {
      result.syntaxValid = false;
      result.errors.push({
        type: 'syntax',
        property: null,
        message: `JSON Syntax Error: ${e.message}`,
        severity: 'error'
      });
      return result;
    }
  } else if (typeof input === 'object' && input !== null) {
    parsed = input;
    result.syntaxValid = true;
  } else {
    result.errors.push({
      type: 'syntax',
      property: null,
      message: 'Invalid input: expected JSON string or object.',
      severity: 'error'
    });
    return result;
  }

  result.parsedData = parsed;

  // 2. Schema.org Context & Type Check
  const context = parsed['@context'];
  if (!context) {
    result.errors.push({
      type: 'schema.org',
      property: '@context',
      message: 'Missing "@context". Must specify "https://schema.org".',
      severity: 'error'
    });
  } else if (
    context !== 'https://schema.org' && 
    context !== 'http://schema.org' && 
    context !== 'https://schema.org/'
  ) {
    result.warnings.push({
      type: 'schema.org',
      property: '@context',
      message: `Non-standard context "${context}". "https://schema.org" is strongly recommended.`,
      severity: 'warning'
    });
  }

  const type = parsed['@type'];
  if (!type) {
    result.errors.push({
      type: 'schema.org',
      property: '@type',
      message: 'Missing "@type". A valid Schema.org type must be specified.',
      severity: 'error'
    });
  }

  const activeType = selectedType || type;
  const catalogMeta = SCHEMA_TYPE_CATALOG[activeType] || SCHEMA_TYPE_CATALOG[type];

  // 3. Properties Count & Validation
  const keys = Object.keys(parsed).filter(k => !k.startsWith('@'));
  result.stats.totalProperties = keys.length;

  if (catalogMeta) {
    const req = catalogMeta.requiredProps || [];
    const rec = catalogMeta.recommendedProps || [];
    result.stats.requiredTotal = req.length;
    result.stats.recommendedTotal = rec.length;

    // Check required properties
    for (const prop of req) {
      const val = parsed[prop];
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        result.errors.push({
          type: 'required_field',
          property: prop,
          message: `Missing required property "${prop}" for Schema type ${activeType}.`,
          severity: 'error'
        });
      } else {
        result.stats.requiredPresent++;
      }
    }

    // Check recommended properties
    for (const prop of rec) {
      const val = parsed[prop];
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        result.warnings.push({
          type: 'recommended_field',
          property: prop,
          message: `Recommended property "${prop}" is missing. Adding this enhances snippet quality.`,
          severity: 'warning'
        });
      } else {
        result.stats.recommendedPresent++;
      }
    }

    // Specific structural checks for complex types
    if (activeType === 'Product') {
      if (parsed.offers && (!parsed.offers.price || !parsed.offers.priceCurrency)) {
        result.warnings.push({
          type: 'structural',
          property: 'offers',
          message: 'Product "offers" should include both "price" and "priceCurrency" for Google rich snippets.',
          severity: 'warning'
        });
      }
    } else if (activeType === 'BreadcrumbList') {
      if (Array.isArray(parsed.itemListElement)) {
        parsed.itemListElement.forEach((item, idx) => {
          if (!item.name) {
            result.errors.push({
              type: 'structural',
              property: `itemListElement[${idx}].name`,
              message: `Breadcrumb item at index ${idx} is missing "name".`,
              severity: 'error'
            });
          }
          if (!item.position) {
            result.warnings.push({
              type: 'structural',
              property: `itemListElement[${idx}].position`,
              message: `Breadcrumb item at index ${idx} should have a 1-indexed "position".`,
              severity: 'warning'
            });
          }
        });
      }
    } else if (activeType === 'FAQPage') {
      if (Array.isArray(parsed.mainEntity)) {
        if (parsed.mainEntity.length === 0) {
          result.errors.push({
            type: 'structural',
            property: 'mainEntity',
            message: 'FAQPage requires at least one Question in "mainEntity".',
            severity: 'error'
          });
        }
        parsed.mainEntity.forEach((q, idx) => {
          if (!q.name) {
            result.errors.push({
              type: 'structural',
              property: `mainEntity[${idx}].name`,
              message: `Question at index ${idx} is missing question text (name).`,
              severity: 'error'
            });
          }
          if (!q.acceptedAnswer || !q.acceptedAnswer.text) {
            result.errors.push({
              type: 'structural',
              property: `mainEntity[${idx}].acceptedAnswer`,
              message: `Question at index ${idx} is missing accepted answer text.`,
              severity: 'error'
            });
          }
        });
      }
    } else if (activeType === 'Article' || activeType === 'BlogPosting') {
      if (!parsed.image) {
        result.warnings.push({
          type: 'google_guideline',
          property: 'image',
          message: 'Google requires an image URL of at least 1200px width for Article rich results & Top Stories.',
          severity: 'warning'
        });
      }
    }
  }

  result.schemaOrgValid = result.errors.length === 0;
  result.isValid = result.syntaxValid && result.schemaOrgValid;

  // Technical Google eligibility assessment
  if (result.isValid) {
    if (catalogMeta && catalogMeta.googleRichResult.supported) {
      if (result.warnings.filter(w => w.type === 'google_guideline').length === 0) {
        result.googleEligible = true;
        result.googleStatusText = 'Meets technical Google structured data syntax (Unverified in live search)';
      } else {
        result.googleEligible = false;
        result.googleStatusText = 'Syntactically valid Schema.org, but missing specific Google Rich Result guidelines';
      }
    } else {
      result.googleEligible = false;
      result.googleStatusText = 'Valid Schema.org markup (No dedicated Google Rich Snippet available for this type)';
    }
  } else {
    result.googleEligible = false;
    result.googleStatusText = 'Not eligible due to validation errors';
  }

  return result;
}

/**
 * Maps extracted web page facts (from html-parser) into initial pre-fill suggestions
 */
function mapPageFactsToSchema(pageData, targetType = 'LocalBusiness') {
  const pageTitle = (typeof pageData.title === 'object' && pageData.title !== null)
    ? (pageData.title.text || '')
    : (pageData.title || '');

  const facts = {
    name: pageTitle || pageData.openGraph?.title || pageData.headings?.h1?.[0] || '',
    headline: pageData.headings?.h1?.[0] || pageTitle || '',
    description: pageData.metaDescription?.text || pageData.openGraph?.description || '',
    url: pageData.canonical?.resolved || pageData.url || '',
    image: pageData.openGraph?.image || pageData.images?.items?.[0]?.src || '',
    author: pageData.author || '',
    publisher: pageData.openGraph?.site_name || '',
    datePublished: new Date().toISOString().split('T')[0]
  };

  // Breadcrumbs detection from page navigation if available
  if (targetType === 'BreadcrumbList') {
    facts.breadcrumbs = [
      { name: 'Home', url: pageData.url ? new URL(pageData.url).origin : 'https://example.com' },
      { name: facts.name || 'Page', url: pageData.url || 'https://example.com/page' }
    ];
  }

  // FAQ detection if multiple question headings found
  if (targetType === 'FAQPage') {
    const questionHeadings = (pageData.headings?.h2 || []).filter(h => h.includes('?') || h.toLowerCase().startsWith('how') || h.toLowerCase().startsWith('what'));
    if (questionHeadings.length > 0) {
      facts.faqs = questionHeadings.map(q => ({ question: q, answer: 'Answer content extracted or to be provided.' }));
    } else {
      facts.faqs = [
        { question: 'What services do you offer?', answer: 'Detailed description of services offered.' }
      ];
    }
  }

  return facts;
}

module.exports = {
  SCHEMA_TYPE_CATALOG,
  generateJsonLd,
  validateSchema,
  mapPageFactsToSchema,
  cleanSchemaObject
};
