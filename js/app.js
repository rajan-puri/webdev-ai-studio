/**
 * WebDev AI Studio - Core Client Application
 * Handles Command Palette, Global Keyboard Shortcuts, Sidebar Toggling, and Tool Navigation.
 */

(function () {
  'use strict';

  // Tool Definitions aligned with Developer Control Center workflow
  const TOOLS = [
    { id: 'responsive-tester', name: 'Browser Lab', category: 'TEST', desc: 'Multi-viewport layout rendering, breakpoint runner, and browser matrix verification.', icon: 'responsive', shortcut: 'R' },
    { id: 'automated-qa', name: 'Automated QA', category: 'TEST', desc: 'Comprehensive automated test suite: UI, forms, a11y & visual regression.', icon: 'qa', shortcut: 'U' },
    { id: 'api-tester', name: 'API Tester', category: 'TEST', desc: 'Test REST endpoints, query parameters, auth headers, assertions, and latency.', icon: 'api', shortcut: 'E' },
    { id: 'seo-audit', name: 'SEO Intelligence', category: 'ANALYZE', desc: 'Deep technical audit, PageSpeed & CrUX field metrics, GSC, and crawl logs.', icon: 'seo', shortcut: 'S' },
    { id: 'website-qa', name: 'Website QA', category: 'ANALYZE', desc: 'Find broken links, missing metadata, heading structure, and image tags.', icon: 'qa', shortcut: 'Q' },
    { id: 'accessibility', name: 'Accessibility', category: 'ANALYZE', desc: 'Audit WCAG compliance, contrast ratios, and aria attributes.', icon: 'a11y', shortcut: 'A' },
    { id: 'performance', name: 'Performance', category: 'ANALYZE', desc: 'Core Web Vitals, runtime rendering, and resource load analysis.', icon: 'perf', shortcut: 'F' },
    { id: 'design-to-code', name: 'Design → Code', category: 'BUILD', desc: 'Turn screenshots and Figma designs into responsive, production-ready code for your stack.', icon: 'code', shortcut: 'D' },
    { id: 'visual-css-engineer', name: 'Visual CSS Engineer', category: 'BUILD', desc: 'Design directly on your code with live inspection, AI patching, and responsive verification.', icon: 'css', shortcut: 'C' },
    { id: 'acf-architect', name: 'ACF Architect', category: 'BUILD', desc: 'Design your WordPress content architecture. Generate the code to build it.', icon: 'acf', shortcut: 'W' },
    { id: 'acf-generator', name: 'ACF Generator', category: 'BUILD', desc: 'Design your WordPress content architecture. Generate the code to build it.', icon: 'acf', shortcut: 'W' },
    { id: 'architecture', name: 'Architecture Graph', category: 'BUILD', desc: 'Interactive project knowledge graph & AI context token optimization engine.', icon: 'code', shortcut: 'G' },
    { id: 'template-generator', name: 'Template Generator', category: 'BUILD', desc: 'Scaffold theme templates, block patterns, and components.', icon: 'template', shortcut: 'T' },
    { id: 'schema-generator', name: 'Schema Generator', category: 'BUILD', desc: 'Create structured JSON-LD data for verified rich snippets.', icon: 'schema', shortcut: 'J' },
    { id: 'code-assistant', name: 'Code Assistant', category: 'BUILD', desc: 'Context-aware helper functions, hooks, and boilerplate code.', icon: 'assistant', shortcut: 'H' },
    { id: 'image-optimizer', name: 'Image Optimizer', category: 'SYSTEM', desc: 'Compress assets and convert to WebP / AVIF formats.', icon: 'image', shortcut: 'I' }
  ];

  // DOM Elements
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const appSidebar = document.getElementById('appSidebar');
  const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
  const sidebarMobileCloseBtn = document.getElementById('sidebarMobileCloseBtn');
  const sidebarBrandLink = document.getElementById('sidebarBrandLink');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const sidebarFloatingTooltip = document.getElementById('sidebarFloatingTooltip');
  const searchTrigger = document.getElementById('searchTrigger');
  const cmdModal = document.getElementById('cmdModal');
  const cmdInput = document.getElementById('cmdInput');
  const cmdResults = document.getElementById('cmdResults');
  const toastContainer = document.getElementById('toastContainer');
  const globalProjectSwitcher = document.getElementById('globalProjectSwitcher');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const breadcrumbProject = document.getElementById('breadcrumbProject');
  const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');

  // Initialize Developer Control Center
  function init() {
    setupSidebar();
    setupCommandPalette();
    setupToolClicks();
    setupShortcuts();
    setupGlobalProjectSwitcher();
    setupThemeToggle();
    checkSystemStatus();
    if (window.location.pathname === '/profile' || window.location.hash === '#profile') {
      openProfile(true);
    } else if (window.location.pathname === '/seo-audit' || window.location.hash === '#seo-audit') {
      openSeoAudit();
    } else if (window.location.pathname === '/design-to-code' || window.location.hash === '#design-to-code') {
      openDesignToCode();
    } else if (window.location.pathname === '/schema-generator' || window.location.hash === '#schema-generator') {
      openSchemaGenerator();
    } else if (window.location.pathname === '/visual-css-engineer' || window.location.hash === '#visual-css-engineer' || window.location.pathname === '/ai-css' || window.location.hash === '#ai-css') {
      openVisualCssEngineer();
    } else if (window.location.pathname === '/acf-architect' || window.location.hash === '#acf-architect' || window.location.pathname === '/acf-generator' || window.location.hash === '#acf-generator') {
      openAcfArchitect();
    } else if (window.location.pathname === '/architecture' || window.location.hash === '#architecture') {
      openArchitectureGraph();
    }

    window.addEventListener('popstate', () => {
      const path = window.location.pathname;
      if (path === '/profile' || window.location.hash === '#profile') {
        openProfile(true);
      } else if (path === '/seo-audit' || window.location.hash === '#seo-audit') {
        openSeoAudit();
      } else if (path === '/design-to-code' || window.location.hash === '#design-to-code') {
        openDesignToCode();
      } else if (path === '/schema-generator' || window.location.hash === '#schema-generator') {
        openSchemaGenerator(true);
      } else if (path === '/visual-css-engineer' || window.location.hash === '#visual-css-engineer' || path === '/ai-css' || window.location.hash === '#ai-css') {
        openVisualCssEngineer(true);
      } else if (path === '/acf-architect' || window.location.hash === '#acf-architect' || path === '/acf-generator' || window.location.hash === '#acf-generator') {
        openAcfArchitect(true);
      } else if (path === '/architecture' || window.location.hash === '#architecture') {
        openArchitectureGraph(true);
      } else {
        openDashboard(true);
      }
    });
  }

  // Toast System
  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 180ms ease';
      setTimeout(() => toast.remove(), 200);
    }, 2400);
  }

  // ==========================================================================
  // Collapsible Sidebar & Navigation Drawer Logic
  // ==========================================================================
  const SIDEBAR_PREF_KEY = 'webdev_sidebar_collapsed';

  function isSidebarCollapsed() {
    return appSidebar ? appSidebar.classList.contains('collapsed') : false;
  }

  function setSidebarCollapsed(collapsed) {
    if (!appSidebar) return;
    if (collapsed) {
      appSidebar.classList.add('collapsed');
      document.documentElement.classList.add('sidebar-is-collapsed');
      try { localStorage.setItem(SIDEBAR_PREF_KEY, 'true'); } catch (e) {}
      if (sidebarCollapseBtn) {
        sidebarCollapseBtn.setAttribute('aria-label', 'Expand sidebar');
        sidebarCollapseBtn.setAttribute('data-tooltip', 'Expand sidebar (⌘B)');
      }
    } else {
      appSidebar.classList.remove('collapsed');
      document.documentElement.classList.remove('sidebar-is-collapsed');
      try { localStorage.setItem(SIDEBAR_PREF_KEY, 'false'); } catch (e) {}
      if (sidebarCollapseBtn) {
        sidebarCollapseBtn.setAttribute('aria-label', 'Collapse sidebar');
        sidebarCollapseBtn.setAttribute('data-tooltip', 'Collapse sidebar (⌘B)');
      }
    }
    hideSidebarTooltip();
  }

  function toggleSidebarCollapse() {
    setSidebarCollapsed(!isSidebarCollapsed());
  }

  function toggleMobileDrawer(forceOpen) {
    if (!appSidebar) return;
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !appSidebar.classList.contains('open');
    if (shouldOpen) {
      appSidebar.classList.add('open');
      if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
    } else {
      appSidebar.classList.remove('open');
      if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
    }
  }

  function toggleSidebar() {
    if (window.innerWidth <= 820) {
      toggleMobileDrawer();
    } else {
      toggleSidebarCollapse();
    }
  }

  function getSidebarFloatingTooltip() {
    let el = document.getElementById('sidebarFloatingTooltip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sidebarFloatingTooltip';
      el.className = 'sidebar-floating-tooltip';
      el.setAttribute('role', 'tooltip');
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    return el;
  }

  function showSidebarTooltip(target) {
    const tooltip = getSidebarFloatingTooltip();
    if (!tooltip || !target) return;
    if (window.innerWidth <= 820) return; // In mobile drawer labels are fully shown

    const collapsed = isSidebarCollapsed();
    const isSpecial = target.id === 'sidebarCollapseBtn' || target.id === 'sidebarBrandLink';

    // In expanded mode, only show tooltips for the collapse button or logo
    if (!collapsed && !isSpecial) return;

    let text = target.getAttribute('data-tooltip');
    if (!text && target.id === 'sidebarBrandLink') {
      text = 'WebDev AI Studio — Home';
    }
    if (!text) {
      const labelEl = target.querySelector('span');
      if (labelEl) text = labelEl.textContent.trim();
    }
    if (!text) return;

    tooltip.textContent = text;
    tooltip.classList.add('visible');
    tooltip.setAttribute('aria-hidden', 'false');

    const rect = target.getBoundingClientRect();
    const top = rect.top + (rect.height / 2);
    const left = rect.right + 10;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  function hideSidebarTooltip() {
    const tooltip = getSidebarFloatingTooltip();
    if (!tooltip) return;
    tooltip.classList.remove('visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  function setupSidebar() {
    // 1. Restore persisted state
    try {
      const saved = localStorage.getItem(SIDEBAR_PREF_KEY);
      if (saved === 'true' && window.innerWidth > 820) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    } catch (e) {
      setSidebarCollapsed(false);
    }

    // 2. Collapse Toggle button click
    if (sidebarCollapseBtn) {
      sidebarCollapseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebarCollapse();
      });
    }

    // 3. Brand Logo click -> Navigate to Overview
    if (sidebarBrandLink) {
      sidebarBrandLink.addEventListener('click', (e) => {
        e.preventDefault();
        openDashboard();
        if (window.innerWidth <= 820) {
          toggleMobileDrawer(false);
        }
      });
    }

    // 4. Mobile navigation events
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMobileDrawer(true);
      });
    }

    if (sidebarMobileCloseBtn) {
      sidebarMobileCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMobileDrawer(false);
      });
    }

    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => {
        toggleMobileDrawer(false);
      });
    }

    // 5. Close mobile drawer when any navigation link is clicked
    document.querySelectorAll('.app-sidebar .nav-item, .app-sidebar .project-subnav-item').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 820) {
          toggleMobileDrawer(false);
        }
      });
    });

    // 6. Tooltips for all items with data-tooltip
    const tooltipTargets = document.querySelectorAll(
      '#appSidebar .nav-item, #sidebarBrandLink, #sidebarCollapseBtn, #sidebarUserAvatar'
    );

    tooltipTargets.forEach(el => {
      // Remove native browser title to avoid duplicate tooltips
      if (el.hasAttribute('title')) {
        el.removeAttribute('title');
      }

      el.addEventListener('mouseenter', () => showSidebarTooltip(el));
      el.addEventListener('mouseleave', hideSidebarTooltip);
      el.addEventListener('focus', () => showSidebarTooltip(el));
      el.addEventListener('blur', hideSidebarTooltip);
    });

    window.addEventListener('scroll', hideSidebarTooltip, { passive: true });
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 820) {
        hideSidebarTooltip();
      }
    });
  }

  // Command Palette
  function setupCommandPalette() {
    if (!cmdModal || !cmdInput || !cmdResults) return;

    function openCmd() {
      cmdModal.classList.add('open');
      cmdInput.value = '';
      renderCmdResults('');
      cmdInput.focus();
    }

    function closeCmd() {
      cmdModal.classList.remove('open');
    }

    if (searchTrigger) {
      searchTrigger.addEventListener('click', openCmd);
    }

    cmdModal.addEventListener('click', (e) => {
      if (e.target === cmdModal) closeCmd();
    });

    cmdInput.addEventListener('input', (e) => {
      renderCmdResults(e.target.value.trim().toLowerCase());
    });

    function getBuiltInActions() {
      return [
        {
          id: 'action-overview',
          type: 'action',
          name: 'Workspace Overview',
          category: 'WORKSPACE',
          shortcut: 'O',
          execute: openDashboard
        },
        {
          id: 'action-profile',
          type: 'action',
          name: 'Account & Profile Workspace',
          category: 'WORKSPACE',
          shortcut: 'A',
          execute: openProfile
        },
        {
          id: 'action-projects',
          type: 'action',
          name: 'Open Projects',
          category: 'WORKSPACE',
          shortcut: 'P',
          execute: () => { if (window.ProjectsView) window.ProjectsView.open(); }
        },
        {
          id: 'action-history',
          type: 'action',
          name: 'Open Activity History',
          category: 'WORKSPACE',
          shortcut: 'H',
          execute: () => { if (window.HistoryView) window.HistoryView.open(); }
        },
        {
          id: 'action-design-to-code',
          type: 'action',
          name: 'Open Design → Code Studio',
          category: 'BUILD',
          shortcut: 'D',
          execute: openDesignToCode
        },
        {
          id: 'action-schema-generator',
          type: 'action',
          name: 'Open Schema Generator',
          category: 'BUILD',
          shortcut: 'J',
          execute: openSchemaGenerator
        },
        {
          id: 'action-visual-css-engineer',
          type: 'action',
          name: 'Open Visual CSS Engineer',
          category: 'BUILD',
          shortcut: 'C',
          execute: openVisualCssEngineer
        },
        {
          id: 'action-acf-architect',
          type: 'action',
          name: 'Open ACF Architect',
          category: 'BUILD',
          shortcut: 'W',
          execute: openAcfArchitect
        },
        {
          id: 'action-browser-lab',
          type: 'action',
          name: 'Launch Browser Lab',
          category: 'TEST',
          shortcut: 'R',
          execute: openResponsiveTester
        },
        {
          id: 'action-automated-qa',
          type: 'action',
          name: 'Run Automated QA Suite',
          category: 'TEST',
          shortcut: 'U',
          execute: openAutomatedQa
        },
        {
          id: 'action-api-tester',
          type: 'action',
          name: 'Open API Tester',
          category: 'TEST',
          shortcut: 'E',
          execute: openApiTester
        },
        {
          id: 'action-seo-intelligence',
          type: 'action',
          name: 'Open SEO Intelligence',
          category: 'ANALYZE',
          shortcut: 'S',
          execute: openSeoAudit
        },
        {
          id: 'action-qa',
          type: 'action',
          name: 'Open Website QA Scanner',
          category: 'ANALYZE',
          shortcut: 'Q',
          execute: () => { if (window.WebsiteQa) window.WebsiteQa.open(); }
        },
        {
          id: 'action-create-proj',
          type: 'action',
          name: 'Create New Project',
          category: 'WORKSPACE',
          shortcut: 'N',
          execute: () => { if (window.ProjectsView) window.ProjectsView.openCreateModal(); }
        },
        {
          id: 'action-settings',
          type: 'action',
          name: 'System Settings',
          category: 'SYSTEM',
          shortcut: '⌘,',
          execute: () => { if (window.SettingsView) window.SettingsView.open(); }
        },
        {
          id: 'action-toggle-theme',
          type: 'action',
          name: 'Toggle Dark / Light Theme',
          category: 'SYSTEM',
          shortcut: 'T',
          execute: toggleTheme
        },
        {
          id: 'action-toggle-sidebar',
          type: 'action',
          name: 'Toggle Sidebar Collapse',
          category: 'SYSTEM',
          shortcut: '⌘B',
          execute: toggleSidebar
        }
      ];
    }

    function renderCmdResults(query) {
      const actions = getBuiltInActions().filter(a =>
        a.name.toLowerCase().includes(query) || a.category.toLowerCase().includes(query)
      );

      const matchingTools = TOOLS.filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.category.toLowerCase().includes(query) ||
        t.desc.toLowerCase().includes(query)
      ).map(t => ({
        id: `tool-${t.id}`,
        type: 'tool',
        name: t.name,
        category: t.category,
        shortcut: t.shortcut,
        rawTool: t,
        execute: () => {
          if (t.id === 'website-qa' && window.WebsiteQa) {
            window.WebsiteQa.open();
          } else if (t.id === 'responsive-tester') {
            openResponsiveTester();
          } else if (t.id === 'api-tester') {
            openApiTester();
          } else if (t.id === 'automated-qa') {
            openAutomatedQa();
          } else if (t.id === 'seo-audit') {
            openSeoAudit();
          } else if (t.id === 'design-to-code') {
            openDesignToCode();
          } else if (t.id === 'schema-generator') {
            openSchemaGenerator();
          } else if (t.id === 'visual-css-engineer' || t.id === 'ai-css') {
            openVisualCssEngineer();
          } else if (t.id === 'acf-architect' || t.id === 'acf-generator') {
            openAcfArchitect();
          } else if (t.id === 'architecture') {
            openArchitectureGraph();
          } else {
            showToast(`${t.name} opened`);
          }
        }
      }));

      let projectMatches = [];
      if (window.ProjectManager) {
        const realProjects = window.ProjectManager.getProjects();
        projectMatches = realProjects.filter(p =>
          p.name.toLowerCase().includes(query) || (p.url && p.url.toLowerCase().includes(query))
        ).map(p => ({
          id: `proj-${p.id}`,
          type: 'project',
          name: p.name,
          category: 'PROJECTS',
          subtext: p.url,
          shortcut: '↵',
          execute: () => {
            if (window.ProjectsView) window.ProjectsView.openWorkspace(p.id);
          }
        }));
      }

      // Group into Developer Categories: WORKSPACE, PROJECTS, BUILD, TEST, ANALYZE, SYSTEM
      const categoriesOrder = ['WORKSPACE', 'PROJECTS', 'BUILD', 'TEST', 'ANALYZE', 'SYSTEM'];
      const combined = [...actions, ...projectMatches, ...matchingTools];

      if (combined.length === 0) {
        cmdResults.innerHTML = `
          <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 12px; font-family: var(--font-mono);">
            No matching tools, projects or actions found
          </div>
        `;
        return;
      }

      // Render grouped with section headers
      let globalIndex = 0;
      let html = '';

      categoriesOrder.forEach(cat => {
        const itemsInCat = combined.filter(item => item.category === cat);
        if (itemsInCat.length > 0) {
          html += `<div class="cmd-section-header">${cat}</div>`;
          itemsInCat.forEach(item => {
            const isSelected = globalIndex === 0;
            html += `
              <div class="cmd-item ${isSelected ? 'selected' : ''}" data-cmd-index="${globalIndex}">
                <div class="cmd-item-left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${item.type === 'project' 
                      ? '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' 
                      : (item.type === 'action' 
                          ? '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>'
                          : '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>')}
                  </svg>
                  <div style="display: flex; align-items: baseline; gap: 6px;">
                    <span style="font-weight: 500;">${escapeHtml(item.name)}</span>
                    ${item.subtext ? `<span class="font-mono text-muted text-xs truncate" style="max-width: 220px;">${escapeHtml(item.subtext)}</span>` : ''}
                  </div>
                </div>
                <span class="kbd">${escapeHtml(item.shortcut || '')}</span>
              </div>
            `;
            item._renderedIndex = globalIndex;
            globalIndex++;
          });
        }
      });

      cmdResults.innerHTML = html;

      const flatItems = [];
      categoriesOrder.forEach(cat => {
        combined.filter(item => item.category === cat).forEach(item => flatItems.push(item));
      });

      cmdResults.querySelectorAll('.cmd-item').forEach(itemEl => {
        itemEl.addEventListener('click', () => {
          const idx = parseInt(itemEl.getAttribute('data-cmd-index'), 10);
          const target = flatItems[idx];
          closeCmd();
          if (target && target.execute) {
            target.execute();
          }
        });
      });
    }

    // Key navigation inside cmd palette
    cmdInput.addEventListener('keydown', (e) => {
      const items = Array.from(cmdResults.querySelectorAll('.cmd-item'));
      const activeIdx = items.findIndex(el => el.classList.contains('selected'));

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = (activeIdx + 1) % items.length;
        items.forEach(el => el.classList.remove('selected'));
        if (items[nextIdx]) {
          items[nextIdx].classList.add('selected');
          items[nextIdx].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = (activeIdx - 1 + items.length) % items.length;
        items.forEach(el => el.classList.remove('selected'));
        if (items[prevIdx]) {
          items[prevIdx].classList.add('selected');
          items[prevIdx].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[activeIdx]) {
          items[activeIdx].click();
        }
      }
    });
  }

  // Tool Click handlers
  function setupToolClicks() {
    document.querySelectorAll('.tool-item, .primary-action-card, .nav-item, .quick-action-btn').forEach(item => {
      item.addEventListener('click', (e) => {
        const isQa = item.id === 'cardAnalyzeWebsite' || item.id === 'toolWebsiteQa' || item.id === 'navWebsiteQa' || item.getAttribute('data-view') === 'website-qa';
        if (isQa) {
          e.preventDefault();
          if (window.WebsiteQa) window.WebsiteQa.open();
          return;
        }

        const isResponsive = item.id === 'navBrowserLab' || item.id === 'navResponsiveTester' || item.id === 'toolResponsiveTester' || item.id === 'dashBtnBrowserLab' || item.getAttribute('data-view') === 'responsive-tester';
        if (isResponsive) {
          e.preventDefault();
          openResponsiveTester();
          return;
        }

        const isApiTester = item.id === 'navApiTester' || item.id === 'toolApiTester' || item.getAttribute('data-view') === 'api-tester';
        if (isApiTester) {
          e.preventDefault();
          openApiTester();
          return;
        }

        const isAutomatedQa = item.id === 'navAutomatedQa' || item.id === 'toolAutomatedQa' || item.id === 'dashBtnAutomatedQa' || item.getAttribute('data-view') === 'automated-qa';
        if (isAutomatedQa) {
          e.preventDefault();
          openAutomatedQa();
          return;
        }

        const isSeoAudit = item.id === 'navSeoAudit' || item.id === 'toolSeoAudit' || item.id === 'dashBtnSeo' || item.getAttribute('data-view') === 'seo-audit';
        if (isSeoAudit) {
          e.preventDefault();
          openSeoAudit();
          return;
        }

        const isDesignToCode = item.id === 'navDesignToCode' || item.id === 'toolCardDesignToCode' || item.id === 'dashBtnDesignToCode' || item.getAttribute('data-view') === 'design-to-code' || item.getAttribute('data-tool') === 'design-to-code';
        if (isDesignToCode) {
          e.preventDefault();
          openDesignToCode();
          return;
        }

        const isSchemaGenerator = item.id === 'navSchemaGenerator' || item.id === 'toolCardSchemaGen' || item.getAttribute('data-view') === 'schema-generator' || item.getAttribute('data-tool') === 'schema-generator';
        if (isSchemaGenerator) {
          e.preventDefault();
          openSchemaGenerator();
          return;
        }

        const isVisualCss = item.id === 'navVisualCssEngineer' || item.id === 'navAiCss' || item.id === 'toolCardVisualCss' || item.id === 'toolCardAiCss' || item.getAttribute('data-view') === 'visual-css-engineer' || item.getAttribute('data-view') === 'ai-css' || item.getAttribute('data-tool') === 'visual-css-engineer';
        if (isVisualCss) {
          e.preventDefault();
          openVisualCssEngineer();
          return;
        }

        const isAcfArchitect = item.id === 'navAcfArchitect' || item.id === 'navAcfGenerator' || item.id === 'toolCardAcf' || item.getAttribute('data-view') === 'acf-architect' || item.getAttribute('data-view') === 'acf-generator' || item.getAttribute('data-tool') === 'acf-architect' || item.getAttribute('data-tool') === 'acf-generator';
        if (isAcfArchitect) {
          e.preventDefault();
          openAcfArchitect();
          return;
        }

        const isArchitecture = item.id === 'navArchitectureGraph' || item.id === 'navArchitecture' || item.id === 'toolCardArchitecture' || item.getAttribute('data-view') === 'architecture' || item.getAttribute('data-tool') === 'architecture';
        if (isArchitecture) {
          e.preventDefault();
          openArchitectureGraph();
          return;
        }

        const isIntegrations = item.id === 'navIntegrations';
        if (isIntegrations) {
          e.preventDefault();
          if (window.SettingsView) {
            window.SettingsView.open();
            setTimeout(() => {
              const intTab = document.querySelector('[data-settings-tab="integrations"]');
              if (intTab) intTab.click();
            }, 50);
          }
          return;
        }

        const isAccessibility = item.id === 'navAccessibility' || item.getAttribute('data-view') === 'accessibility';
        if (isAccessibility) {
          e.preventDefault();
          openAutomatedQa();
          return;
        }

        const isPerformance = item.id === 'navPerformance' || item.getAttribute('data-view') === 'performance';
        if (isPerformance) {
          e.preventDefault();
          openSeoAudit();
          return;
        }

        const view = item.getAttribute('data-view');
        if (view === 'dashboard') {
          e.preventDefault();
          openDashboard();
          return;
        }
        if (view === 'projects') {
          e.preventDefault();
          if (window.ProjectsView) window.ProjectsView.open();
          return;
        }
        if (view === 'history') {
          e.preventDefault();
          if (window.HistoryView) window.HistoryView.open();
          return;
        }
        if (view === 'settings') {
          e.preventDefault();
          if (window.SettingsView) window.SettingsView.open();
          return;
        }
        if (view === 'profile') {
          e.preventDefault();
          openProfile();
          return;
        }

        if (item.classList.contains('tool-item')) {
          e.preventDefault();
          const title = item.querySelector('.tool-name, .action-card-title')?.textContent || 'Tool';
          showToast(`${title} opened`);
        }
      });
    });

    // Handle dashboard link and breadcrumb root
    const navDashboard = document.getElementById('navDashboard');
    if (navDashboard) {
      navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        openDashboard();
      });
    }

    const breadcrumbRoot = document.getElementById('breadcrumbRoot');
    if (breadcrumbRoot) {
      breadcrumbRoot.addEventListener('click', (e) => {
        e.preventDefault();
        openDashboard();
      });
    }
  }

  function updateBreadcrumbs(viewTitle) {
    if (breadcrumbCurrent) {
      breadcrumbCurrent.textContent = viewTitle;
    }
    if (breadcrumbProject) {
      breadcrumbProject.textContent = window.activeProjectName || 'All Projects';
    }
  }

  function setupGlobalProjectSwitcher() {
    if (!globalProjectSwitcher || !window.ProjectManager) return;

    function populateSwitcher() {
      const projects = window.ProjectManager.getProjects();
      const currentVal = globalProjectSwitcher.value;
      globalProjectSwitcher.innerHTML = '<option value="">All Projects</option>' + 
        projects.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
      if (currentVal && projects.some(p => p.id === currentVal)) {
        globalProjectSwitcher.value = currentVal;
      }
    }

    window.ProjectManager.subscribe(() => {
      populateSwitcher();
    });

    globalProjectSwitcher.addEventListener('change', (e) => {
      const projId = e.target.value;
      if (projId) {
        const proj = window.ProjectManager.getProject(projId);
        window.activeProjectId = projId;
        window.activeProjectName = proj ? proj.name : 'Active Project';
        showToast(`Workspace focused on: ${window.activeProjectName}`);
        if (breadcrumbProject) breadcrumbProject.textContent = window.activeProjectName;
      } else {
        window.activeProjectId = null;
        window.activeProjectName = 'All Projects';
        showToast('Viewing all workspace projects');
        if (breadcrumbProject) breadcrumbProject.textContent = 'All Projects';
      }
    });

    populateSwitcher();
  }

  function toggleTheme() {
    if (window.SettingsManager) {
      const current = window.SettingsManager.getSetting('theme');
      const next = current === 'dark' ? 'light' : 'dark';
      window.SettingsManager.updateSettings({ theme: next });
      updateThemeIcon(next);
      showToast(`Theme set to ${next}`);
    } else {
      const doc = document.documentElement;
      const current = doc.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      doc.setAttribute('data-theme', next);
      updateThemeIcon(next);
      showToast(`Theme set to ${next}`);
    }
  }

  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    const sun = themeToggleBtn.querySelector('.theme-icon-sun');
    const moon = themeToggleBtn.querySelector('.theme-icon-moon');
    if (sun && moon) {
      if (theme === 'dark') {
        sun.style.display = 'none';
        moon.style.display = 'block';
      } else {
        sun.style.display = 'block';
        moon.style.display = 'none';
      }
    }
  }

  function setupThemeToggle() {
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
    }
    if (window.SettingsManager) {
      updateThemeIcon(window.SettingsManager.getSetting('theme'));
      window.SettingsManager.subscribe(() => {
        updateThemeIcon(window.SettingsManager.getSetting('theme'));
      });
    }
  }

  async function checkSystemStatus() {
    const badge = document.getElementById('sysConnectionBadge');
    if (!badge) return;
    try {
      const res = await fetch('/api/dashboard', { method: 'GET', credentials: 'include' });
      if (res.ok) {
        const dot = badge.querySelector('.sys-status-dot');
        const label = badge.querySelector('.sys-status-label');
        if (dot) dot.className = 'sys-status-dot';
        if (label) label.textContent = 'PLAYWRIGHT READY';
      }
    } catch (e) {
      // Offline fallback
    }
  }

  const ALL_VIEW_IDS = [
    'viewDashboard',
    'viewWebsiteQa',
    'viewProjects',
    'viewSettings',
    'viewHistory',
    'viewResponsiveTester',
    'viewApiTester',
    'viewAutomatedQa',
    'viewSeoAudit',
    'viewDesignToCode',
    'viewProfile',
    'viewSchemaGenerator',
    'viewVisualCssEngineer',
    'viewAcfArchitect',
    'viewArchitecture'
  ];

  function hideAllViews() {
    ALL_VIEW_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function openDashboard(fromHistory = false) {
    hideAllViews();
    const dash = document.getElementById('viewDashboard');
    if (dash) dash.style.display = 'flex';

    updateBreadcrumbs('Overview');

    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    const navDashboard = document.getElementById('navDashboard');
    if (navDashboard) navDashboard.classList.add('active');

    if (!fromHistory && window.location.pathname === '/profile') {
      history.pushState({ view: 'dashboard' }, 'WebDev AI Studio', '/');
    }

    if (window.ProjectsView && window.ProjectsView.renderDashboardProjects) {
      window.ProjectsView.renderDashboardProjects();
    }
    if (window.HistoryView && window.HistoryView.renderDashboardActivity) {
      window.HistoryView.renderDashboardActivity();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openProfile(fromHistory = false) {
    hideAllViews();
    const profView = document.getElementById('viewProfile');
    if (profView) {
      profView.style.display = 'flex';
    }

    updateBreadcrumbs('Account & Profile');

    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));

    if (!fromHistory && window.location.pathname !== '/profile') {
      history.pushState({ view: 'profile' }, 'Profile & Account Workspace', '/profile');
    }

    if (window.ProfileView) {
      window.ProfileView.open();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openResponsiveTester(url) {
    hideAllViews();
    const resp = document.getElementById('viewResponsiveTester');
    if (resp) {
      resp.style.display = 'flex';
    }

    updateBreadcrumbs('Browser Lab');

    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    const navBrowserLab = document.getElementById('navBrowserLab') || document.getElementById('navResponsiveTester');
    if (navBrowserLab) navBrowserLab.classList.add('active');

    if (!window.responsiveTesterInstance && window.ResponsiveTesterTool) {
      window.responsiveTesterInstance = new window.ResponsiveTesterTool();
    }
    if (url && window.responsiveTesterInstance) {
      window.responsiveTesterInstance.loadUrl(url);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openApiTester() {
    hideAllViews();
    const apiView = document.getElementById('viewApiTester');
    if (apiView) {
      apiView.style.display = 'flex';
    }

    updateBreadcrumbs('API Tester');

    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    const navApi = document.getElementById('navApiTester');
    if (navApi) navApi.classList.add('active');

    if (!window.apiTesterInstance && window.ApiTesterTool) {
      window.apiTesterInstance = new window.ApiTesterTool();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openAutomatedQa(url) {
    hideAllViews();
    const qaView = document.getElementById('viewAutomatedQa');
    if (qaView) {
      qaView.style.display = 'flex';
    }

    updateBreadcrumbs('Automated QA Suite');

    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    const navQa = document.getElementById('navAutomatedQa');
    if (navQa) navQa.classList.add('active');

    if (!window.automatedQaInstance && window.AutomatedQaTool) {
      window.automatedQaInstance = new window.AutomatedQaTool();
    }
    if (url && window.automatedQaInstance) {
      window.automatedQaInstance.loadUrl(url);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openSeoAudit(auditIdOrUrl) {
    hideAllViews();
    const seoView = document.getElementById('viewSeoAudit');
    if (seoView) {
      seoView.style.display = 'flex';
    }

    updateBreadcrumbs('SEO Intelligence');

    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    const navSeo = document.getElementById('navSeoAudit');
    if (navSeo) navSeo.classList.add('active');

    if (!window.seoAuditInstance && window.SeoAuditTool) {
      window.seoAuditInstance = new window.SeoAuditTool();
    }
    if (auditIdOrUrl && window.seoAuditInstance) {
      if (typeof auditIdOrUrl === 'string' && (auditIdOrUrl.startsWith('http://') || auditIdOrUrl.startsWith('https://'))) {
        window.seoAuditInstance.loadUrl(auditIdOrUrl);
      } else if (typeof auditIdOrUrl === 'string') {
        window.seoAuditInstance.loadAudit(auditIdOrUrl);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDesignToCode() {
    hideAllViews();
    const designView = document.getElementById('viewDesignToCode');
    if (designView) {
      designView.style.display = 'flex';
    }

    updateBreadcrumbs('Design → Code');

    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    const navDesign = document.getElementById('navDesignToCode');
    if (navDesign) navDesign.classList.add('active');

    if (!window.designToCodeInstance && window.DesignToCodeTool) {
      window.designToCodeInstance = new window.DesignToCodeTool();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openSchemaGenerator(fromHistory = false) {
    hideAllViews();
    const schemaView = document.getElementById('viewSchemaGenerator');
    if (schemaView) {
      schemaView.style.display = 'flex';
    }

    updateBreadcrumbs('Schema Generator');

    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    const navSchema = document.getElementById('navSchemaGenerator');
    if (navSchema) navSchema.classList.add('active');

    if (!fromHistory && window.location.pathname !== '/schema-generator') {
      history.pushState({ view: 'schema-generator' }, 'Schema / Structured Data Workspace', '/schema-generator');
    }

    if (!window.schemaGeneratorInstance && window.SchemaGeneratorTool) {
      window.schemaGeneratorInstance = new window.SchemaGeneratorTool('viewSchemaGenerator');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openVisualCssEngineer(fromHistory = false) {
    hideAllViews();
    const vceView = document.getElementById('viewVisualCssEngineer');
    if (vceView) {
      vceView.style.display = 'flex';
    }

    updateBreadcrumbs('Visual CSS Engineer');

    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    const navVisualCss = document.getElementById('navVisualCssEngineer') || document.getElementById('navAiCss');
    if (navVisualCss) navVisualCss.classList.add('active');

    if (!fromHistory && window.location.pathname !== '/visual-css-engineer') {
      history.pushState({ view: 'visual-css-engineer' }, 'Visual CSS Engineer', '/visual-css-engineer');
    }

    if (!window.visualCssEngineerInstance && window.VisualCssEngineerTool) {
      window.visualCssEngineerInstance = new window.VisualCssEngineerTool('viewVisualCssEngineer');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openAcfArchitect(fromHistory = false) {
    hideAllViews();
    const acfView = document.getElementById('viewAcfArchitect');
    if (acfView) {
      acfView.style.display = 'flex';
    }

    updateBreadcrumbs('ACF Architect');

    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    const navAcf = document.getElementById('navAcfArchitect') || document.getElementById('navAcfGenerator');
    if (navAcf) navAcf.classList.add('active');

    if (!fromHistory && window.location.pathname !== '/acf-architect') {
      history.pushState({ view: 'acf-architect' }, 'ACF Architect', '/acf-architect');
    }

    if (!window.acfArchitectInstance && window.AcfArchitectTool) {
      window.acfArchitectInstance = new window.AcfArchitectTool('viewAcfArchitect');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openArchitectureGraph(fromHistory = false) {
    hideAllViews();
    const archView = document.getElementById('viewArchitecture');
    if (archView) {
      archView.style.display = 'flex';
    }

    updateBreadcrumbs('Architecture Graph');

    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    const navArch = document.getElementById('navArchitectureGraph');
    if (navArch) navArch.classList.add('active');

    if (!fromHistory && window.location.pathname !== '/architecture') {
      history.pushState({ view: 'architecture' }, 'Architecture Graph', '/architecture');
    }

    if (!window.architectureGraphInstance && window.ArchitectureGraphTool) {
      window.architectureGraphInstance = new window.ArchitectureGraphTool('viewArchitecture');
    } else if (window.architectureGraphInstance && window.architectureGraphInstance.onViewActivated) {
      window.architectureGraphInstance.onViewActivated();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.openApiTester = openApiTester;
  window.openAutomatedQa = openAutomatedQa;
  window.openSeoAudit = openSeoAudit;
  window.openDesignToCode = openDesignToCode;
  window.openSchemaGenerator = openSchemaGenerator;
  window.openVisualCssEngineer = openVisualCssEngineer;
  window.openAcfArchitect = openAcfArchitect;
  window.openAcfGenerator = openAcfArchitect;
  window.openArchitectureGraph = openArchitectureGraph;
  window.openProfile = openProfile;

  // Global Keyboard Shortcuts
  function setupShortcuts() {
    if (window.__globalShortcutsInitialized) return;
    window.__globalShortcutsInitialized = true;

    window.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // ⌘K or Ctrl+K -> Command Palette
      if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (cmdModal && !cmdModal.classList.contains('open')) {
          cmdModal.classList.add('open');
          if (cmdInput) {
            cmdInput.value = '';
            cmdInput.focus();
            const evt = new Event('input');
            cmdInput.dispatchEvent(evt);
          }
        } else if (cmdModal) {
          cmdModal.classList.remove('open');
        }
        return;
      }

      // ⌘B or Ctrl+B -> Toggle Sidebar (Idempotent, ignores when editing form inputs)
      if (cmdOrCtrl && e.key.toLowerCase() === 'b') {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
          return;
        }
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // ⌘, or Ctrl+, -> Open Settings
      if (cmdOrCtrl && e.key === ',') {
        e.preventDefault();
        if (window.SettingsView) {
          window.SettingsView.open();
        }
        return;
      }

      // ⌘Enter or Ctrl+Enter -> Run Active Tool (e.g. Website QA scan or Responsive Tester reload)
      if (cmdOrCtrl && e.key === 'Enter') {
        const qaView = document.getElementById('viewWebsiteQa');
        if (qaView && qaView.style.display !== 'none' && window.WebsiteQa) {
          e.preventDefault();
          window.WebsiteQa.scan();
          return;
        }

        const respView = document.getElementById('viewResponsiveTester');
        if (respView && respView.style.display !== 'none' && window.responsiveTesterInstance) {
          e.preventDefault();
          window.responsiveTesterInstance.applyUrlFromInput();
          return;
        }

        const autoQaView = document.getElementById('viewAutomatedQa');
        if (autoQaView && autoQaView.style.display !== 'none' && window.automatedQaInstance) {
          e.preventDefault();
          window.automatedQaInstance.runSuite();
          return;
        }
      }

      // Escape -> Close open modals, drawers, command palette
      if (e.key === 'Escape') {
        let closedSomething = false;

        if (cmdModal && cmdModal.classList.contains('open')) {
          cmdModal.classList.remove('open');
          closedSomething = true;
        }

        const projectModal = document.getElementById('projectCreateModal');
        if (projectModal && projectModal.classList.contains('open')) {
          projectModal.classList.remove('open');
          closedSomething = true;
        }

        const editModal = document.getElementById('projectEditModal');
        if (editModal && editModal.classList.contains('open')) {
          editModal.classList.remove('open');
          closedSomething = true;
        }

        const historyDrawer = document.getElementById('historyDetailDrawer');
        const historyBackdrop = document.getElementById('historyDrawerBackdrop');
        if (historyDrawer && historyDrawer.classList.contains('open')) {
          historyDrawer.classList.remove('open');
          if (historyBackdrop) historyBackdrop.classList.remove('open');
          closedSomething = true;
        }

        ['breakpointModal', 'comparisonModal', 'screenshotModal'].forEach(mId => {
          const modal = document.getElementById(mId);
          if (modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
            closedSomething = true;
          }
        });

        if (appSidebar && appSidebar.classList.contains('open')) {
          appSidebar.classList.remove('open');
          if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
          closedSomething = true;
        }

        if (closedSomething) {
          e.preventDefault();
        }
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.App = {
    toggleSidebar,
    toggleSidebarCollapse,
    setSidebarCollapsed,
    isSidebarCollapsed,
    showToast,
    openDashboard,
    openResponsiveTester,
    openApiTester,
    openAutomatedQa,
    openSeoAudit,
    openDesignToCode,
    openSchemaGenerator,
    openProfile
  };
  window.openResponsiveTester = openResponsiveTester;
  window.openDesignToCode = openDesignToCode;
  window.openSchemaGenerator = openSchemaGenerator;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
