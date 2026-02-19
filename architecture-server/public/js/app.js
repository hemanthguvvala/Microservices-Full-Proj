// Architecture Explorer — Main Application
// Interactive UML Architecture Visualization Engine

(function () {
  'use strict';

  // ─── State ────────────────────────────────────────
  let currentView = 'architecture';
  let detailOpen = false;

  // ─── DOM Refs ─────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const content = $('#mainContent');
  const detailPanel = $('#detailPanel');
  const detailTitle = $('#detailTitle');
  const detailBody = $('#detailBody');
  const detailClose = $('#detailClose');
  const themeToggle = $('#themeToggle');
  const searchInput = $('#globalSearch');
  const searchResults = $('#searchResults');

  // ─── Init ──────────────────────────────────────────
  function init() {
    renderView(currentView);
    bindNavigation();
    bindDetailClose();
    bindThemeToggle();
    bindSearch();
    initMermaid();
  }

  function initMermaid() {
    if (typeof mermaid !== 'undefined') {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
        sequence: { useMaxWidth: true, actorMargin: 40 },
      });
    }
  }

  // ─── Navigation ──────────────────────────────────
  function bindNavigation() {
    $$('.nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        $$('.nav-item').forEach((n) => n.classList.remove('active'));
        item.classList.add('active');
        currentView = item.dataset.view;
        closeDetail();
        renderView(currentView);
      });
    });
  }

  function renderView(view) {
    content.classList.remove('shifted');
    const renderers = {
      architecture: renderArchitecture,
      services: renderServices,
      patterns: renderPatterns,
      dataflow: renderDataFlow,
      infrastructure: renderInfrastructure,
      techstack: renderTechStack,
      structure: renderStructure,
      docs: renderDocs,
      interview: renderInterview,
    };
    if (renderers[view]) renderers[view]();
  }

  // ─── Detail Panel ─────────────────────────────────
  function openDetail(title, htmlContent) {
    detailTitle.textContent = title;
    detailBody.innerHTML = htmlContent;
    detailPanel.classList.add('open');
    content.classList.add('shifted');
    detailOpen = true;
  }

  function closeDetail() {
    detailPanel.classList.remove('open');
    content.classList.remove('shifted');
    detailOpen = false;
  }

  function bindDetailClose() {
    detailClose.addEventListener('click', closeDetail);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && detailOpen) closeDetail();
    });
  }

  // ─── Theme Toggle ─────────────────────────────────
  function bindThemeToggle() {
    themeToggle.addEventListener('click', () => {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
      initMermaid();
      if (currentView === 'architecture' || currentView === 'dataflow') {
        renderView(currentView);
      }
    });
  }

  // ─── Search ───────────────────────────────────────
  function bindSearch() {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (q.length < 2) { searchResults.classList.remove('active'); return; }
      const results = performSearch(q);
      if (results.length === 0) { searchResults.classList.remove('active'); return; }
      searchResults.innerHTML = results.map((r) => `
        <div class="search-result-item" data-type="${r.type}" data-id="${r.id}">
          <span class="sr-type">${r.type}</span>
          <span class="sr-name">${r.name}</span>
          <span class="sr-desc">${r.desc || ''}</span>
        </div>
      `).join('');
      searchResults.classList.add('active');
      searchResults.querySelectorAll('.search-result-item').forEach((item) => {
        item.addEventListener('click', () => {
          handleSearchClick(item.dataset.type, item.dataset.id);
          searchResults.classList.remove('active');
          searchInput.value = '';
        });
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-box')) searchResults.classList.remove('active');
    });
  }

  function performSearch(query) {
    const results = [];
    // Search services
    Object.values(ARCH_DATA.services).forEach((s) => {
      if (s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)) {
        results.push({ type: 'Service', id: s.id, name: s.name, desc: `:${s.port}` });
      }
    });
    // Search frontends
    Object.values(ARCH_DATA.frontends).forEach((f) => {
      if (f.name.toLowerCase().includes(query) || f.framework.toLowerCase().includes(query)) {
        results.push({ type: 'Frontend', id: f.id, name: f.name, desc: f.framework });
      }
    });
    // Search patterns
    ARCH_DATA.patterns.forEach((p, i) => {
      if (p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)) {
        results.push({ type: 'Pattern', id: i, name: p.name, desc: p.where });
      }
    });
    // Search tech
    ARCH_DATA.techStack.forEach((group) => {
      group.items.forEach((t) => {
        if (t.name.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query)) {
          results.push({ type: 'Tech', id: t.name, name: t.name, desc: group.category });
        }
      });
    });
    return results.slice(0, 12);
  }

  function handleSearchClick(type, id) {
    if (type === 'Service') {
      navigateTo('services');
      setTimeout(() => showServiceDetail(id), 100);
    } else if (type === 'Frontend') {
      navigateTo('services');
      setTimeout(() => showFrontendDetail(id), 100);
    } else if (type === 'Pattern') {
      navigateTo('patterns');
      setTimeout(() => showPatternDetail(parseInt(id)), 100);
    } else if (type === 'Tech') {
      navigateTo('techstack');
    }
  }

  function navigateTo(view) {
    $$('.nav-item').forEach((n) => {
      n.classList.toggle('active', n.dataset.view === view);
    });
    currentView = view;
    renderView(view);
  }

  // ═════════════════════════════════════════════════
  //  VIEW RENDERERS
  // ═════════════════════════════════════════════════

  // ─── Architecture View ─────────────────────────
  function renderArchitecture() {
    content.innerHTML = `
      <div class="animate-in">
        <div class="view-header">
          <h2>System Architecture</h2>
          <p>Click any component to explore its details, technologies, and interview insights</p>
        </div>

        <div class="stats-bar">
          <div class="stat-card"><div class="stat-value">6</div><div class="stat-label">Microservices</div></div>
          <div class="stat-card"><div class="stat-value">2</div><div class="stat-label">Frontends</div></div>
          <div class="stat-card"><div class="stat-value">34+</div><div class="stat-label">Design Patterns</div></div>
          <div class="stat-card"><div class="stat-value">65+</div><div class="stat-label">Technologies</div></div>
          <div class="stat-card"><div class="stat-value">19</div><div class="stat-label">Docker Services</div></div>
        </div>

        <div class="arch-diagram">
          <!-- Frontend Layer -->
          <div class="arch-layer">
            <span class="arch-layer-label">Frontend Layer</span>
            <div class="arch-nodes">
              <div class="arch-node frontend" onclick="window.__showFrontend('react')">
                <div class="arch-node-icon">⚛️</div>
                <div class="arch-node-name">React 18</div>
                <div class="arch-node-port">:3000</div>
              </div>
              <div class="arch-node frontend" onclick="window.__showFrontend('angular')">
                <div class="arch-node-icon">🅰️</div>
                <div class="arch-node-name">Angular 17</div>
                <div class="arch-node-port">:4200</div>
              </div>
            </div>
          </div>

          <div class="arch-connector">▼ HTTP / REST</div>

          <!-- Gateway Layer -->
          <div class="arch-layer">
            <span class="arch-layer-label">API Gateway</span>
            <div class="arch-nodes">
              <div class="arch-node infra" onclick="window.__showService('gateway')">
                <div class="arch-node-icon">🚪</div>
                <div class="arch-node-name">Spring Cloud Gateway</div>
                <div class="arch-node-port">:8080</div>
              </div>
            </div>
          </div>

          <div class="arch-connector">▼ Route + Load Balance</div>

          <!-- Service Discovery -->
          <div class="arch-layer">
            <span class="arch-layer-label">Service Discovery & Configuration</span>
            <div class="arch-nodes">
              <div class="arch-node infra" onclick="window.__showService('eureka')">
                <div class="arch-node-icon">🔍</div>
                <div class="arch-node-name">Eureka Server</div>
                <div class="arch-node-port">:8761</div>
              </div>
              <div class="arch-node infra" onclick="window.__showService('config')">
                <div class="arch-node-icon">⚙️</div>
                <div class="arch-node-name">Config Server</div>
                <div class="arch-node-port">:8888</div>
              </div>
            </div>
          </div>

          <div class="arch-connector">▼ Register + Fetch Config</div>

          <!-- Business Services -->
          <div class="arch-layer">
            <span class="arch-layer-label">Business Services</span>
            <div class="arch-nodes">
              <div class="arch-node business" onclick="window.__showService('employee')">
                <div class="arch-node-icon">👤</div>
                <div class="arch-node-name">Employee Service</div>
                <div class="arch-node-port">:8081</div>
              </div>
              <div class="arch-node business" onclick="window.__showService('payroll')">
                <div class="arch-node-icon">💰</div>
                <div class="arch-node-name">Payroll Service</div>
                <div class="arch-node-port">:8083</div>
              </div>
              <div class="arch-node business" onclick="window.__showService('notification')">
                <div class="arch-node-icon">🔔</div>
                <div class="arch-node-name">Notification Service</div>
                <div class="arch-node-port">:8084</div>
              </div>
            </div>
          </div>

          <div class="arch-connector">▼ Persist + Stream</div>

          <!-- Data Layer -->
          <div class="arch-layer">
            <span class="arch-layer-label">Data Layer</span>
            <div class="arch-nodes">
              <div class="arch-node data">
                <div class="arch-node-icon">🐘</div>
                <div class="arch-node-name">PostgreSQL</div>
                <div class="arch-node-port">:5432</div>
              </div>
              <div class="arch-node data">
                <div class="arch-node-icon">🍃</div>
                <div class="arch-node-name">MongoDB</div>
                <div class="arch-node-port">:27017</div>
              </div>
              <div class="arch-node data">
                <div class="arch-node-icon">🔎</div>
                <div class="arch-node-name">Elasticsearch</div>
                <div class="arch-node-port">:9200</div>
              </div>
              <div class="arch-node data">
                <div class="arch-node-icon">⚡</div>
                <div class="arch-node-name">Redis</div>
                <div class="arch-node-port">:6379</div>
              </div>
              <div class="arch-node data">
                <div class="arch-node-icon">📨</div>
                <div class="arch-node-name">Kafka</div>
                <div class="arch-node-port">:9092</div>
              </div>
            </div>
          </div>

          <div class="arch-connector">▼ Metrics + Traces + Logs</div>

          <!-- Monitoring Layer -->
          <div class="arch-layer">
            <span class="arch-layer-label">Observability</span>
            <div class="arch-nodes">
              <div class="arch-node monitoring">
                <div class="arch-node-icon">📈</div>
                <div class="arch-node-name">Prometheus</div>
                <div class="arch-node-port">:9090</div>
              </div>
              <div class="arch-node monitoring">
                <div class="arch-node-icon">📊</div>
                <div class="arch-node-name">Grafana</div>
                <div class="arch-node-port">:3001</div>
              </div>
              <div class="arch-node monitoring">
                <div class="arch-node-icon">🔗</div>
                <div class="arch-node-name">Zipkin</div>
                <div class="arch-node-port">:9411</div>
              </div>
              <div class="arch-node monitoring">
                <div class="arch-node-icon">📝</div>
                <div class="arch-node-name">ELK Stack</div>
                <div class="arch-node-port">:5601</div>
              </div>
            </div>
          </div>
        </div>

        <div class="mermaid-container" style="margin-top: 24px;">
          <h3 style="margin-bottom: 16px; font-weight: 600;">Mermaid System Topology</h3>
          <div class="mermaid" id="mermaid-arch">${ARCH_DATA.mermaidDiagrams.systemArchitecture}</div>
        </div>
      </div>
    `;
    renderMermaids();
  }

  // ─── Services View ────────────────────────────
  function renderServices() {
    const services = Object.values(ARCH_DATA.services);
    const frontends = Object.values(ARCH_DATA.frontends);

    content.innerHTML = `
      <div class="animate-in">
        <div class="view-header">
          <h2>Services & Frontends</h2>
          <p>Click any service to explore its classes, packages, technologies, patterns, and interview notes</p>
        </div>

        <h3 style="margin-bottom: 12px;">🖥️ Backend Microservices</h3>
        <div class="card-grid" style="margin-bottom: 24px;">
          ${services.map((s) => `
            <div class="card" onclick="window.__showService('${s.id}')">
              <div class="card-icon" style="background: ${s.color}22; color: ${s.color}; font-size: 1.5rem;">${s.icon}</div>
              <h3>${s.name}</h3>
              <p>${s.description.substring(0, 120)}...</p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="tag tag-blue">:${s.port}</span>
                <span class="tag ${s.type === 'INFRASTRUCTURE' ? 'tag-purple' : 'tag-green'}">${s.type}</span>
              </div>
              <div class="card-tags">
                ${(s.patterns || []).slice(0, 3).map((p) => `<span class="tag tag-orange">${p}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <h3 style="margin-bottom: 12px;">🌐 Frontend Applications</h3>
        <div class="card-grid">
          ${frontends.map((f) => `
            <div class="card" onclick="window.__showFrontend('${f.id}')">
              <div class="card-icon" style="background: ${f.color}22; color: ${f.color}; font-size: 1.5rem;">${f.icon}</div>
              <h3>${f.name}</h3>
              <p>${f.description.substring(0, 120)}...</p>
              <div style="margin-bottom: 8px;">
                <span class="tag tag-cyan">${f.port}</span>
                <span class="tag tag-blue">${f.framework}</span>
              </div>
              <div class="card-tags">
                ${f.technologies.slice(0, 4).map((t) => `<span class="tag tag-orange">${t}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ─── Patterns View ────────────────────────────
  function renderPatterns() {
    const categories = {};
    ARCH_DATA.patterns.forEach((p, i) => {
      if (!categories[p.category]) categories[p.category] = [];
      categories[p.category].push({ ...p, index: i });
    });

    const catIcons = {
      'Architectural': '🏗️', 'Data': '💾', 'Distributed Transactions': '🔄',
      'Resilience': '🛡️', 'Gang of Four': '🧩', 'API Design': '📡',
      'DDD': '🎯', 'Concurrency': '⚡', 'Observability': '📊',
      'SaaS': '☁️', 'DevOps': '🐳', 'Messaging': '📨',
      'Integration': '🔗', 'Operations': '⚙️', 'Architecture': '🏛️',
    };

    content.innerHTML = `
      <div class="animate-in">
        <div class="view-header">
          <h2>Design Patterns (${ARCH_DATA.patterns.length})</h2>
          <p>Production-grade patterns implemented across the project. Click any pattern for detailed explanation and interview insights.</p>
        </div>

        ${Object.entries(categories).map(([cat, patterns]) => `
          <div class="pattern-category">
            <h3>${catIcons[cat] || '📦'} ${cat}</h3>
            <div class="pattern-list">
              ${patterns.map((p) => `
                <div class="pattern-card" onclick="window.__showPattern(${p.index})">
                  <h4>${p.name}</h4>
                  <div class="pattern-where">📍 ${p.where}</div>
                  <p>${p.description.substring(0, 140)}${p.description.length > 140 ? '...' : ''}</p>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─── Data Flow View ───────────────────────────
  function renderDataFlow() {
    content.innerHTML = `
      <div class="animate-in">
        <div class="view-header">
          <h2>Data Flow & Sequence Diagrams</h2>
          <p>Key interaction flows between services, showing communication patterns and data movement</p>
        </div>

        <div class="tab-bar">
          <button class="tab-btn active" data-tab="flow-onboarding">Employee Onboarding Saga</button>
          <button class="tab-btn" data-tab="flow-cqrs">CQRS Flow</button>
          <button class="tab-btn" data-tab="flow-strategy">Strategy Pattern (UML)</button>
          <button class="tab-btn" data-tab="flow-template">Template Method (UML)</button>
          <button class="tab-btn" data-tab="flow-deploy">Deployment Pipeline</button>
        </div>

        <div class="tab-content active" id="flow-onboarding">
          <div class="mermaid-container">
            <h3 style="margin-bottom: 12px;">Employee Onboarding — Orchestrated Saga</h3>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">Shows the distributed transaction flow: Client → Gateway → Employee Service → Saga Orchestrator → Payroll + Notification. Compensating transactions on failure.</p>
            <div class="mermaid">${ARCH_DATA.mermaidDiagrams.employeeOnboarding}</div>
          </div>
        </div>

        <div class="tab-content" id="flow-cqrs">
          <div class="mermaid-container">
            <h3 style="margin-bottom: 12px;">CQRS — Command / Query Separation</h3>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">Writes go to PostgreSQL, reads from Elasticsearch. Outbox Pattern publishes events to Kafka, which feeds the Elasticsearch indexer.</p>
            <div class="mermaid">${ARCH_DATA.mermaidDiagrams.cqrsFlow}</div>
          </div>
        </div>

        <div class="tab-content" id="flow-strategy">
          <div class="mermaid-container">
            <h3 style="margin-bottom: 12px;">Strategy Pattern — Notification Channels</h3>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">UML Class Diagram: NotificationStrategyFactory creates the appropriate strategy (Email/SMS/Push/InApp) based on channel type. Open/Closed Principle in action.</p>
            <div class="mermaid">${ARCH_DATA.mermaidDiagrams.strategyPattern}</div>
          </div>
        </div>

        <div class="tab-content" id="flow-template">
          <div class="mermaid-container">
            <h3 style="margin-bottom: 12px;">Template Method Pattern — Notification Processors</h3>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">AbstractNotificationProcessor defines the algorithm skeleton. Subclasses (Bulk, Urgent) override specific steps without changing the overall structure.</p>
            <div class="mermaid">${ARCH_DATA.mermaidDiagrams.templatePattern}</div>
          </div>
        </div>

        <div class="tab-content" id="flow-deploy">
          <div class="mermaid-container">
            <h3 style="margin-bottom: 12px;">CI/CD Deployment Pipeline</h3>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">Code Push → GitHub Actions → Maven/npm Build → Tests → SonarQube → Docker Build → ECR → Helm → Kubernetes (EKS) with AWS infrastructure provisioned by Terraform.</p>
            <div class="mermaid">${ARCH_DATA.mermaidDiagrams.infraDeploy}</div>
          </div>
        </div>
      </div>
    `;

    // Tab switching
    content.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        content.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        content.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        content.querySelector(`#${btn.dataset.tab}`).classList.add('active');
        renderMermaids();
      });
    });

    renderMermaids();
  }

  // ─── Infrastructure View ──────────────────────
  function renderInfrastructure() {
    const docker = ARCH_DATA.infrastructure.docker;
    const k8s = ARCH_DATA.infrastructure.kubernetes;
    const helm = ARCH_DATA.infrastructure.helm;
    const tf = ARCH_DATA.infrastructure.terraform;

    content.innerHTML = `
      <div class="animate-in">
        <div class="view-header">
          <h2>Infrastructure</h2>
          <p>Docker Compose, Kubernetes, Helm Charts, Terraform, and CI/CD pipelines</p>
        </div>

        <div class="tab-bar">
          <button class="tab-btn active" data-tab="infra-docker">🐳 Docker Compose</button>
          <button class="tab-btn" data-tab="infra-k8s">☸️ Kubernetes</button>
          <button class="tab-btn" data-tab="infra-helm">⎈ Helm</button>
          <button class="tab-btn" data-tab="infra-terraform">🏗️ Terraform</button>
          <button class="tab-btn" data-tab="infra-cicd">🔄 CI/CD</button>
        </div>

        <div class="tab-content active" id="infra-docker">
          <h3 style="margin-bottom: 12px;">Docker Compose Services (${docker.services.length})</h3>
          <div class="compose-services">
            ${docker.services.map((s) => `
              <div class="compose-service" onclick="window.__showDockerDetail('${s.name}')">
                <div class="cs-name">${s.name}</div>
                <div class="cs-image">${s.image}</div>
                <div class="cs-port">:${s.port}</div>
                ${s.purpose ? `<div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">${s.purpose}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="tab-content" id="infra-k8s">
          ${renderK8sSection('Base', k8s.base)}
          ${renderK8sSection('Infrastructure', k8s.infrastructure)}
          ${renderK8sSection('Services', k8s.services)}
          ${renderK8sSection('Monitoring', k8s.monitoring)}
          <h3 style="margin: 16px 0 8px;">Overlays (Kustomize)</h3>
          <div class="card-tags">${k8s.overlays.map((o) => `<span class="tag tag-purple">${o}</span>`).join('')}</div>
        </div>

        <div class="tab-content" id="infra-helm">
          <div class="detail-section">
            <h4>Chart: ${helm.chart}</h4>
            <div style="margin: 12px 0;">
              <strong>Values files:</strong>
              <div class="card-tags" style="margin-top: 6px;">${helm.values.map((v) => `<span class="tag tag-blue">${v}</span>`).join('')}</div>
            </div>
            <h4>Templates</h4>
            <ul class="detail-list">${helm.templates.map((t) => `<li>${t}</li>`).join('')}</ul>
          </div>
        </div>

        <div class="tab-content" id="infra-terraform">
          <div class="detail-section">
            <h4>Provider: ${tf.provider}</h4>
            <h4 style="margin-top: 16px;">Files</h4>
            <ul class="detail-list">${tf.files.map((f) => `<li>${f}</li>`).join('')}</ul>
            <h4 style="margin-top: 16px;">Environment Configs</h4>
            <div class="card-tags">${tf.environments.map((e) => `<span class="tag tag-purple">${e}</span>`).join('')}</div>
            <h4 style="margin-top: 16px;">AWS Resources</h4>
            <div class="card-tags" style="gap: 8px;">${tf.resources.map((r) => `<span class="tag tag-orange">${r}</span>`).join('')}</div>
          </div>
        </div>

        <div class="tab-content" id="infra-cicd">
          <div class="detail-section">
            <h4>GitHub Actions Pipelines (${ARCH_DATA.infrastructure.cicd.pipelines.length})</h4>
            <ul class="detail-list">${ARCH_DATA.infrastructure.cicd.pipelines.map((p) => `<li>${p}</li>`).join('')}</ul>
            <h4 style="margin-top: 16px;">Pipeline Stages</h4>
            <div class="detail-code">${ARCH_DATA.infrastructure.cicd.stages.join('\n')}</div>
          </div>
        </div>
      </div>
    `;

    content.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        content.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        content.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        content.querySelector(`#${btn.dataset.tab}`).classList.add('active');
      });
    });
  }

  function renderK8sSection(title, items) {
    return `
      <div class="infra-section">
        <h3>${title}</h3>
        <div class="card-tags" style="gap: 6px;">${items.map((f) => `
          <span class="tag tag-blue" style="padding: 6px 12px; cursor: pointer;" onclick="window.__openFile('k8s/${title.toLowerCase()}/${f}')">${f}</span>
        `).join('')}</div>
      </div>
    `;
  }

  // ─── Tech Stack View ──────────────────────────
  function renderTechStack() {
    content.innerHTML = `
      <div class="animate-in">
        <div class="view-header">
          <h2>Technology Stack (${ARCH_DATA.techStack.reduce((acc, g) => acc + g.items.length, 0)} Technologies)</h2>
          <p>Complete technology inventory organized by category. Click any technology for details.</p>
        </div>

        ${ARCH_DATA.techStack.map((group) => `
          <div class="tech-group">
            <h3>${group.category} (${group.items.length})</h3>
            <div class="tech-items">
              ${group.items.map((item) => `
                <div class="tech-item" onclick="window.__showTechDetail('${escapeHtml(item.name)}', '${escapeHtml(item.desc)}', '${group.category}')">
                  <span class="tech-dot" style="background: ${item.color}"></span>
                  <span>${item.name}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─── Structure View ───────────────────────────
  function renderStructure() {
    content.innerHTML = `
      <div class="animate-in">
        <div class="view-header">
          <h2>Project Structure</h2>
          <p>Interactive file explorer. Click folders to expand, files to view details.</p>
        </div>
        <div id="fileTreeContainer" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px;">
          <div style="color: var(--text-muted);">Loading file tree...</div>
        </div>
      </div>
    `;

    fetch('/api/filetree')
      .then((r) => r.json())
      .then((tree) => {
        const container = document.getElementById('fileTreeContainer');
        container.innerHTML = renderFileTreeNode(tree, true);
        bindTreeToggle(container);
      })
      .catch(() => {
        document.getElementById('fileTreeContainer').innerHTML = renderStaticStructure();
      });
  }

  function renderStaticStructure() {
    const dirs = [
      { name: 'employee-microservice/', desc: '👤 Employee Service — CQRS, Saga, Event Sourcing' },
      { name: 'payroll-microservice/', desc: '💰 Payroll Service — Salary management' },
      { name: 'notification-microservice/', desc: '🔔 Notification Service — Strategy, GraphQL, HATEOAS' },
      { name: 'api-gateway-service/', desc: '🚪 API Gateway — Routing, Rate Limiting' },
      { name: 'eureka-discovery-server/', desc: '🔍 Eureka — Service Discovery' },
      { name: 'config-server/', desc: '⚙️ Config Server — Centralized Config' },
      { name: 'frontend-react/', desc: '⚛️ React 18 + TypeScript + Vite SPA' },
      { name: 'frontend-angular/', desc: '🅰️ Angular 17 + Material + Signals SPA' },
      { name: 'docker-compose.yml', desc: '🐳 19-service Docker Compose' },
      { name: 'k8s/', desc: '☸️ Kubernetes manifests (19+ files)' },
      { name: 'helm/', desc: '⎈ Helm chart templates' },
      { name: 'terraform/', desc: '🏗️ AWS Infrastructure as Code' },
      { name: '.github/workflows/', desc: '🔄 8 CI/CD pipelines' },
      { name: 'monitoring/', desc: '📊 Prometheus, Grafana, ELK configs' },
    ];
    return dirs.map((d) => `
      <div class="file-tree-item ${d.name.endsWith('/') ? 'dir' : 'file'}" style="padding: 8px 12px;">
        <span class="tree-icon">${d.name.endsWith('/') ? '📁' : '📄'}</span>
        <span>${d.name}</span>
        <span style="margin-left: auto; font-size: 0.75rem; color: var(--text-muted);">${d.desc}</span>
      </div>
    `).join('');
  }

  function renderFileTreeNode(node, expanded) {
    if (!node) return '';
    if (node.type === 'file') {
      const icon = getFileIcon(node.name);
      return `<div class="file-tree-item file" data-path="${node.path}">
        <span class="tree-toggle"></span>
        <span class="tree-icon">${icon}</span>
        <span>${node.name}</span>
      </div>`;
    }
    const children = (node.children || []).map((c) => renderFileTreeNode(c, false)).join('');
    return `
      <div class="file-tree-item dir" data-path="${node.path}">
        <span class="tree-toggle">${expanded ? '▾' : '▸'}</span>
        <span class="tree-icon">📁</span>
        <span>${node.name}</span>
      </div>
      <div class="file-tree-children ${expanded ? '' : 'collapsed'}">${children}</div>
    `;
  }

  function bindTreeToggle(container) {
    container.querySelectorAll('.file-tree-item.dir').forEach((item) => {
      item.addEventListener('click', (e) => {
        const toggle = item.querySelector('.tree-toggle');
        const children = item.nextElementSibling;
        if (children && children.classList.contains('file-tree-children')) {
          children.classList.toggle('collapsed');
          toggle.textContent = children.classList.contains('collapsed') ? '▸' : '▾';
        }
      });
    });
    container.querySelectorAll('.file-tree-item.file').forEach((item) => {
      item.addEventListener('click', () => {
        const filepath = item.dataset.path;
        if (filepath) {
          fetch(`/api/file?path=${encodeURIComponent(filepath)}`)
            .then((r) => r.json())
            .then((data) => {
              openDetail(data.path, `
                <div class="detail-section">
                  <h4>File Info</h4>
                  <dl class="detail-kv">
                    <dt>Path</dt><dd>${data.path}</dd>
                    <dt>Extension</dt><dd>${data.extension || 'none'}</dd>
                    <dt>Size</dt><dd>${formatSize(data.size)}</dd>
                  </dl>
                </div>
                <div class="detail-section">
                  <h4>Content</h4>
                  <pre class="detail-code">${escapeHtml(data.content.substring(0, 5000))}${data.content.length > 5000 ? '\n\n... truncated ...' : ''}</pre>
                </div>
              `);
            });
        }
      });
    });
  }

  function getFileIcon(name) {
    if (name.endsWith('.java')) return '☕';
    if (name.endsWith('.ts') || name.endsWith('.tsx')) return '🔷';
    if (name.endsWith('.js') || name.endsWith('.jsx')) return '🟡';
    if (name.endsWith('.html')) return '🟠';
    if (name.endsWith('.css') || name.endsWith('.scss')) return '🎨';
    if (name.endsWith('.yml') || name.endsWith('.yaml')) return '📋';
    if (name.endsWith('.json')) return '📦';
    if (name.endsWith('.xml')) return '📃';
    if (name.endsWith('.sql')) return '🗃️';
    if (name.endsWith('.md')) return '📝';
    if (name.endsWith('.properties')) return '⚙️';
    if (name === 'Dockerfile') return '🐳';
    if (name === 'Makefile') return '🔧';
    return '📄';
  }

  // ─── Documentation View ───────────────────────
  function renderDocs() {
    content.innerHTML = `
      <div class="animate-in">
        <div class="view-header">
          <h2>📖 Project Documentation</h2>
          <p>All markdown documentation from this project — guides, ADRs, runbooks, and more</p>
        </div>
        <div id="docs-loading" style="text-align:center;padding:40px;color:var(--text-muted);">Loading documentation index...</div>
        <div id="docs-container" style="display:none;"></div>
        <div id="docs-reader" style="display:none;">
          <button class="kb-tab active" onclick="window.__closeMdReader()" style="margin-bottom:16px;">← Back to Doc List</button>
          <div id="docs-reader-title" style="font-size:1.1rem;font-weight:600;margin-bottom:16px;"></div>
          <div id="docs-reader-body" class="md-rendered"></div>
        </div>
      </div>
    `;

    fetch('/api/docs')
      .then(r => r.json())
      .then(docs => {
        const byCategory = {};
        docs.forEach(d => {
          if (!byCategory[d.category]) byCategory[d.category] = [];
          byCategory[d.category].push(d);
        });

        const html = Object.entries(byCategory).map(([cat, files]) => `
          <div class="kb-category expanded" style="margin-bottom:16px;">
            <div class="kb-category-header" onclick="this.parentElement.classList.toggle('expanded')">
              <h3>📁 ${cat}</h3>
              <span style="color:var(--text-muted);font-size:0.8rem;">${files.length} file${files.length>1?'s':''}</span>
            </div>
            <div class="kb-category-body">
              ${files.map(f => `
                <div class="doc-item" onclick="window.__openMdDoc('${f.path}', '${f.name.replace(/'/g, "\\'")}')" style="padding:10px 14px;margin-bottom:6px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border:1px solid var(--border);transition:background var(--transition);">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span>📝</span>
                    <div>
                      <div style="font-weight:500;font-size:0.9rem;">${f.name}</div>
                      <div style="font-size:0.75rem;color:var(--text-muted);">${f.path}</div>
                    </div>
                  </div>
                  <span style="font-size:0.75rem;color:var(--text-muted);">${(f.size / 1024).toFixed(1)} KB</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('');

        document.getElementById('docs-loading').style.display = 'none';
        const container = document.getElementById('docs-container');
        container.innerHTML = html;
        container.style.display = 'block';
      })
      .catch(() => {
        document.getElementById('docs-loading').innerHTML = '<p style="color:var(--red);">Failed to load docs index.</p>';
      });
  }

  window.__openMdDoc = function (filePath, fileName) {
    document.getElementById('docs-container').style.display = 'none';
    const reader = document.getElementById('docs-reader');
    reader.style.display = 'block';
    document.getElementById('docs-reader-title').textContent = fileName;
    document.getElementById('docs-reader-body').innerHTML = '<p style="color:var(--text-muted);">Loading...</p>';

    fetch('/api/file?path=' + encodeURIComponent(filePath))
      .then(r => r.json())
      .then(data => {
        if (typeof marked !== 'undefined') {
          document.getElementById('docs-reader-body').innerHTML = marked.parse(data.content);
        } else {
          document.getElementById('docs-reader-body').innerHTML = '<pre style="white-space:pre-wrap;font-size:0.85rem;line-height:1.7;">' + data.content.replace(/</g,'&lt;') + '</pre>';
        }
      })
      .catch(() => {
        document.getElementById('docs-reader-body').innerHTML = '<p style="color:var(--red);">Failed to load file.</p>';
      });
  };

  window.__closeMdReader = function () {
    document.getElementById('docs-reader').style.display = 'none';
    document.getElementById('docs-container').style.display = 'block';
  };

  // ─── Interview View ───────────────────────────
  function renderInterview() {
    // Count total Q&As from comprehensive KB
    const kbData = (typeof INTERVIEW_KB !== 'undefined') ? INTERVIEW_KB.categories : [];
    let totalQAs = 0;
    kbData.forEach(cat => cat.topics.forEach(t => totalQAs += t.qas.length));
    const quickQAs = ARCH_DATA.interviewTopics.reduce((sum, t) => sum + t.qas.length, 0);

    content.innerHTML = `
      <div class="animate-in">
        <div class="view-header">
          <h2>📚 Interview Knowledge Base</h2>
          <p>${kbData.length} categories &bull; ${totalQAs + quickQAs} total Q&As with code examples &bull; Full-stack coverage</p>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            <button class="kb-tab active" onclick="window.__switchInterviewTab('comprehensive')" id="tab-comprehensive">🧠 Comprehensive (${totalQAs})</button>
            <button class="kb-tab" onclick="window.__switchInterviewTab('quick')" id="tab-quick">⚡ Quick Reference (${quickQAs})</button>
          </div>
        </div>

        <div id="interview-comprehensive">
        ${kbData.map((cat, ci) => `
          <div class="kb-category" id="kb-cat-${ci}">
            <div class="kb-category-header" onclick="window.__toggleKbCat(${ci})">
              <h3>${cat.icon} ${cat.title}</h3>
              <span style="color:var(--text-muted);font-size:0.8rem;">
                ${cat.topics.reduce((s,t) => s + t.qas.length, 0)} Q&As
              </span>
            </div>
            <div class="kb-category-body">
              ${cat.topics.map((topic) => `
                <div class="kb-topic-group">
                  <h4 class="kb-topic-heading">${topic.heading}</h4>
                  ${topic.qas.map((qa) => `
                    <div class="interview-qa">
                      <div class="q">Q: ${qa.q}</div>
                      <div class="a">${qa.a}</div>
                      ${qa.code ? `<div class="kb-code"><pre><code>${qa.code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre></div>` : ''}
                    </div>
                  `).join('')}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
        </div>

        <div id="interview-quick" style="display:none;">
        ${ARCH_DATA.interviewTopics.map((topic, i) => `
          <div class="interview-topic ${i === 0 ? 'expanded' : ''}" id="topic-${i}">
            <div class="interview-topic-header" onclick="window.__toggleTopic(${i})">
              <h3>${topic.icon} ${topic.title}</h3>
              <span style="color: var(--text-muted); font-size: 0.8rem;">${topic.qas.length} Q&As</span>
            </div>
            <div class="interview-topic-body">
              ${topic.qas.map((qa) => `
                <div class="interview-qa">
                  <div class="q">Q: ${qa.q}</div>
                  <div class="a">${qa.a}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
        </div>
      </div>
    `;
  }

  // ═════════════════════════════════════════════════
  //  DETAIL RENDERERS
  // ═════════════════════════════════════════════════

  function showServiceDetail(serviceId) {
    const s = ARCH_DATA.services[serviceId];
    if (!s) return;

    let classesHtml = '';
    if (s.classGroups) {
      classesHtml = Object.entries(s.classGroups).map(([group, classes]) => `
        <div class="detail-section">
          <h4>${group} (${classes.length})</h4>
          <ul class="detail-list">${classes.map((c) => `<li><code style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--orange);">${c}</code></li>`).join('')}</ul>
        </div>
      `).join('');
    } else if (s.classes) {
      classesHtml = `<div class="detail-section"><h4>Classes</h4><ul class="detail-list">${s.classes.map((c) => `<li>${c}</li>`).join('')}</ul></div>`;
    }

    let dbHtml = '';
    if (s.databases) {
      dbHtml = `<div class="detail-section"><h4>Databases</h4>
        ${s.databases.map((db) => `<div style="padding: 6px 0; border-bottom: 1px solid var(--border);">
          <strong style="color: var(--accent);">${db.name}</strong> ${db.db ? `<code style="color: var(--orange);">${db.db}</code>` : ''} ${db.port ? `<span class="tag tag-blue">:${db.port}</span>` : ''}
          <div style="font-size: 0.8rem; color: var(--text-muted);">${db.purpose}</div>
        </div>`).join('')}
      </div>`;
    }

    let routesHtml = '';
    if (s.routes) {
      routesHtml = `<div class="detail-section"><h4>Gateway Routes</h4>
        ${s.routes.map((r) => `<div style="padding: 4px 0; font-size: 0.8rem;">
          <strong>${r.id}</strong>: <code style="color: var(--cyan);">${r.path}</code> → <code style="color: var(--success);">${r.uri}</code>
        </div>`).join('')}
      </div>`;
    }

    let graphqlHtml = '';
    if (s.graphql) {
      graphqlHtml = `<div class="detail-section"><h4>GraphQL Schema</h4>
        <div><strong>Queries:</strong> ${s.graphql.queries.map((q) => `<code style="color: var(--cyan);">${q}</code>`).join(', ')}</div>
        <div><strong>Mutations:</strong> ${s.graphql.mutations.map((m) => `<code style="color: var(--orange);">${m}</code>`).join(', ')}</div>
        <div><strong>Enums:</strong> ${s.graphql.enums.map((e) => `<span class="tag tag-purple" style="margin: 2px;">${e}</span>`).join(' ')}</div>
      </div>`;
    }

    openDetail(`${s.icon} ${s.name}`, `
      <div class="animate-slide">
        <div class="detail-section">
          <h4>Overview</h4>
          <dl class="detail-kv">
            <dt>Type</dt><dd>${s.type}</dd>
            <dt>Port</dt><dd>:${s.port}</dd>
            <dt>Package</dt><dd>${s.basePackage}</dd>
          </dl>
          <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">${s.description}</p>
        </div>

        <div class="detail-section">
          <h4>Technologies (${s.technologies.length})</h4>
          <div class="card-tags" style="gap: 6px;">
            ${s.technologies.map((t) => `<span class="tag tag-blue">${t}</span>`).join('')}
          </div>
        </div>

        <div class="detail-section">
          <h4>Design Patterns (${s.patterns.length})</h4>
          <div class="card-tags" style="gap: 6px;">
            ${s.patterns.map((p) => `<span class="tag tag-orange">${p}</span>`).join('')}
          </div>
        </div>

        ${classesHtml}
        ${dbHtml}
        ${routesHtml}
        ${graphqlHtml}

        ${s.messaging ? `<div class="detail-section"><h4>Messaging</h4>
          <dl class="detail-kv">
            <dt>Broker</dt><dd>${s.messaging.broker}</dd>
            ${s.messaging.topics ? `<dt>Topics</dt><dd>${s.messaging.topics.join(', ')}</dd>` : ''}
            <dt>Consumer</dt><dd>${s.messaging.consumerGroup}</dd>
          </dl>
        </div>` : ''}

        ${s.flywayMigrations ? `<div class="detail-section"><h4>Flyway Migrations</h4>
          <ul class="detail-list">${s.flywayMigrations.map((m) => `<li><code style="color: var(--cyan);">${m}</code></li>`).join('')}</ul>
        </div>` : ''}

        ${s.tests ? `<div class="detail-section"><h4>Tests</h4>
          <ul class="detail-list">${s.tests.map((t) => `<li>${t}</li>`).join('')}</ul>
        </div>` : ''}

        <div class="detail-section">
          <h4>Infrastructure Files</h4>
          <ul class="detail-list">
            <li>Dockerfile: <code style="color: var(--text-primary);">${s.dockerFile}</code></li>
            <li>K8s: <code style="color: var(--text-primary);">${s.k8sManifest}</code></li>
            <li>Helm: <code style="color: var(--text-primary);">${s.helmTemplate}</code></li>
          </ul>
        </div>

        ${s.interviewNotes ? `<div class="detail-section"><h4>🎯 Interview Notes</h4>
          ${s.interviewNotes.map((n) => `<div style="padding: 8px 12px; margin: 6px 0; background: var(--accent-bg); border-radius: var(--radius); font-size: 0.85rem; line-height: 1.6; color: var(--text-secondary);">${n}</div>`).join('')}
        </div>` : ''}
      </div>
    `);
  }

  function showFrontendDetail(frontendId) {
    const f = ARCH_DATA.frontends[frontendId];
    if (!f) return;

    openDetail(`${f.icon} ${f.name}`, `
      <div class="animate-slide">
        <div class="detail-section">
          <h4>Overview</h4>
          <dl class="detail-kv">
            <dt>Framework</dt><dd>${f.framework}</dd>
            <dt>Build</dt><dd>${f.buildTool}</dd>
            <dt>Port</dt><dd>${f.port}</dd>
          </dl>
          <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">${f.description}</p>
        </div>

        <div class="detail-section">
          <h4>Technologies (${f.technologies.length})</h4>
          <div class="card-tags" style="gap: 6px;">
            ${f.technologies.map((t) => `<span class="tag tag-blue">${t}</span>`).join('')}
          </div>
        </div>

        ${f.features ? `<div class="detail-section"><h4>Features</h4>
          <div class="card-tags" style="gap: 6px;">
            ${f.features.map((feat) => `<span class="tag tag-green">${feat}</span>`).join('')}
          </div>
        </div>` : ''}

        <div class="detail-section">
          <h4>Project Structure</h4>
          ${Object.entries(f.structure).map(([dir, desc]) => `
            <div style="padding: 5px 0; border-bottom: 1px solid var(--border);">
              <code style="color: var(--accent); font-family: var(--font-mono);">${dir}</code>
              <div style="font-size: 0.8rem; color: var(--text-muted); padding-left: 12px;">${desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `);
  }

  function showPatternDetail(index) {
    const p = ARCH_DATA.patterns[index];
    if (!p) return;

    openDetail(`🧩 ${p.name}`, `
      <div class="animate-slide">
        <div class="detail-section">
          <h4>Overview</h4>
          <dl class="detail-kv">
            <dt>Category</dt><dd>${p.category}</dd>
            <dt>Where</dt><dd>${p.where}</dd>
          </dl>
        </div>
        <div class="detail-section">
          <h4>Description</h4>
          <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.7;">${p.description}</p>
        </div>
        <div class="detail-section">
          <h4>🎯 Interview Insight</h4>
          <div style="padding: 12px 16px; background: var(--accent-bg); border-radius: var(--radius); font-size: 0.9rem; line-height: 1.7; color: var(--text-primary);">${p.interview}</div>
        </div>
      </div>
    `);
  }

  // ─── Global Window Functions ──────────────────
  window.__showService = showServiceDetail;
  window.__showFrontend = showFrontendDetail;
  window.__showPattern = showPatternDetail;

  window.__toggleTopic = function (index) {
    const topic = document.getElementById(`topic-${index}`);
    if (topic) topic.classList.toggle('expanded');
  };

  window.__toggleKbCat = function (index) {
    const cat = document.getElementById(`kb-cat-${index}`);
    if (cat) cat.classList.toggle('expanded');
  };

  window.__switchInterviewTab = function (tab) {
    document.getElementById('interview-comprehensive').style.display = tab === 'comprehensive' ? 'block' : 'none';
    document.getElementById('interview-quick').style.display = tab === 'quick' ? 'block' : 'none';
    document.querySelectorAll('.kb-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
  };

  window.__showDockerDetail = function (name) {
    const svc = ARCH_DATA.infrastructure.docker.services.find((s) => s.name === name);
    if (!svc) return;
    openDetail(`🐳 ${svc.name}`, `
      <div class="animate-slide">
        <div class="detail-section">
          <h4>Docker Service</h4>
          <dl class="detail-kv">
            <dt>Name</dt><dd>${svc.name}</dd>
            <dt>Image</dt><dd>${svc.image}</dd>
            <dt>Port</dt><dd>:${svc.port}</dd>
            ${svc.purpose ? `<dt>Purpose</dt><dd>${svc.purpose}</dd>` : ''}
            ${svc.dbs ? `<dt>Databases</dt><dd>${svc.dbs}</dd>` : ''}
          </dl>
        </div>
      </div>
    `);
  };

  window.__showTechDetail = function (name, desc, category) {
    openDetail(`🔧 ${name}`, `
      <div class="animate-slide">
        <div class="detail-section">
          <h4>${name}</h4>
          <dl class="detail-kv">
            <dt>Category</dt><dd>${category}</dd>
            <dt>Description</dt><dd>${desc}</dd>
          </dl>
        </div>
        <div class="detail-section">
          <h4>Used In</h4>
          <ul class="detail-list">
            ${findTechUsage(name).map((u) => `<li>${u}</li>`).join('') || '<li>Multiple services</li>'}
          </ul>
        </div>
      </div>
    `);
  };

  window.__openFile = function (path) {
    fetch(`/api/file?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((data) => {
        openDetail(data.path, `
          <div class="detail-section">
            <h4>File</h4>
            <dl class="detail-kv">
              <dt>Path</dt><dd>${data.path}</dd>
              <dt>Size</dt><dd>${formatSize(data.size)}</dd>
            </dl>
          </div>
          <div class="detail-section">
            <h4>Content</h4>
            <pre class="detail-code">${escapeHtml(data.content.substring(0, 5000))}</pre>
          </div>
        `);
      });
  };

  function findTechUsage(techName) {
    const usages = [];
    const lowerName = techName.toLowerCase();
    Object.values(ARCH_DATA.services).forEach((s) => {
      if (s.technologies.some((t) => t.toLowerCase().includes(lowerName))) {
        usages.push(`${s.icon} ${s.name}`);
      }
    });
    Object.values(ARCH_DATA.frontends).forEach((f) => {
      if (f.technologies.some((t) => t.toLowerCase().includes(lowerName))) {
        usages.push(`${f.icon} ${f.name}`);
      }
    });
    return usages;
  }

  // ─── Mermaid Rendering ────────────────────────
  async function renderMermaids() {
    if (typeof mermaid === 'undefined') return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
    });

    const elements = document.querySelectorAll('.mermaid:not([data-processed])');
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      try {
        const id = `mermaid-render-${Date.now()}-${i}`;
        const { svg } = await mermaid.render(id, el.textContent.trim());
        el.innerHTML = svg;
        el.setAttribute('data-processed', 'true');
      } catch (e) {
        console.warn('Mermaid render failed:', e);
        el.innerHTML = `<pre style="color: var(--text-muted); font-size: 0.8rem;">Diagram rendering failed. Content:\n${escapeHtml(el.textContent.trim().substring(0, 500))}</pre>`;
      }
    }
  }

  // ─── Utilities ────────────────────────────────
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ─── Start ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
