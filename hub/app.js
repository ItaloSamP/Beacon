/**
 * Beacon Quality Hub — Dashboard Application
 * Fetches reports.json and renders all dashboard sections.
 * Features: status cards, coverage sparklines, security drill-down,
 * test failures expand, lint table, docker images, history table,
 * filter by component + date, dark mode, auto-refresh, export JSON/CSV.
 */

/* ==========================================================
 * State
 * ========================================================== */
let reportsData = null;
let activeFilter = 'all';
let refreshTimer = null;
let refreshSeconds = 60;
let refreshInterval = null;

/* ==========================================================
 * Initialization
 * ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initEventListeners();
  fetchReports();
  startAutoRefresh();
});

/* ==========================================================
 * Dark Mode
 * ========================================================== */
function initDarkMode() {
  const saved = localStorage.getItem('beacon-hub-dark-mode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (localStorage.getItem('beacon-hub-dark-mode') === null) {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('beacon-hub-dark-mode', isDark ? 'dark' : 'light');
}

/* ==========================================================
 * Event Listeners
 * ========================================================== */
function initEventListeners() {
  // Dark mode toggle
  document.getElementById('btn-dark-mode').addEventListener('click', toggleDarkMode);

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });

  // Date filter
  document.getElementById('filter-date-start').addEventListener('change', applyFilters);
  document.getElementById('filter-date-end').addEventListener('change', applyFilters);

  // Clear filters
  document.getElementById('btn-clear-filters').addEventListener('click', () => {
    activeFilter = 'all';
    document.getElementById('filter-date-start').value = '';
    document.getElementById('filter-date-end').value = '';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
    applyFilters();
  });

  // Export buttons
  document.getElementById('btn-export-json').addEventListener('click', exportJSON);
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
}

/* ==========================================================
 * Data Fetching
 * ========================================================== */
async function fetchReports() {
  try {
    const resp = await fetch('reports.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    reportsData = await resp.json();
    renderAll();
    updateHeaderTimestamp();
  } catch (err) {
    console.error('Failed to fetch reports.json:', err);
    showToast('error', 'Failed to load quality data');
    // Show loading state
    document.getElementById('header-updated').textContent = 'Connection error';
  }
}

function updateHeaderTimestamp() {
  const el = document.getElementById('header-updated');
  if (reportsData && reportsData.generated_at) {
    const d = new Date(reportsData.generated_at);
    const rel = relativeTime(d);
    el.textContent = `Generated ${rel} · ${reportsData.commit.slice(0, 7)} · ${reportsData.branch}`;
  }
}

/* ==========================================================
 * Render All Sections
 * ========================================================== */
function renderAll() {
  if (!reportsData) return;
  renderStatusCards();
  renderCoverageChart();
  renderSecurityIssues();
  renderTestFailures();
  renderDockerImages();
  renderLintWarnings();
  renderHistory();
  lucide.createIcons();
  applyFilters();
}

function applyFilters() {
  if (!reportsData) return;
  const dateStart = document.getElementById('filter-date-start').value;
  const dateEnd = document.getElementById('filter-date-end').value;

  filterTestFailures(activeFilter, dateStart, dateEnd);
  filterSecurityIssues(activeFilter, dateStart, dateEnd);
  filterHistory(activeFilter, dateStart, dateEnd);

  // Re-render icons in filtered content
  lucide.createIcons();
}

/* ==========================================================
 * Status Cards
 * ========================================================== */
function renderStatusCards() {
  const container = document.getElementById('status-cards');
  if (!container) return;

  const comps = reportsData.components;
  const cards = [
    { key: 'backend',  label: 'Backend',  icon: 'server',       data: comps.backend },
    { key: 'frontend', label: 'Frontend', icon: 'layout',       data: comps.frontend },
    { key: 'agent',    label: 'Agent',    icon: 'cpu',          data: comps.agent },
    { key: 'docker',   label: 'Docker',   icon: 'container',    data: comps.docker },
    { key: 'e2e',      label: 'E2E',      icon: 'play-circle',  data: comps.e2e },
  ];

  container.innerHTML = cards.map(c => {
    const d = c.data;
    const statusLabel = d.status === 'pass' ? 'PASS' : d.status === 'warning' ? 'WARN' : d.status === 'built' ? 'BUILT' : d.status === 'fail' ? 'FAIL' : 'FAIL';
    const statusClass = d.status === 'pass' ? 'pass' : d.status === 'warning' ? 'warning' : d.status === 'built' ? 'built' : 'fail';

    let testsHTML = '';
    if (d.tests && typeof d.tests.total !== 'undefined') {
      const passPct = d.tests.total > 0 ? Math.round((d.tests.passed / d.tests.total) * 100) : 0;
      testsHTML = `
        <div class="flex items-center gap-2 mb-2">
          <div class="flex-1 h-1.5 rounded-full bg-[#e5e7eb] dark:bg-[#334155] overflow-hidden">
            <div class="h-full rounded-full bg-success transition-all duration-500" style="width:${passPct}%"></div>
          </div>
          <span class="text-xs font-medium text-[#4b5563] dark:text-[#94a3b8] tabular-nums">${passPct}%</span>
        </div>
        <div class="text-xs text-[#6b7280] dark:text-[#64748b]">
          <span class="text-success dark:text-green-400 font-semibold">${d.tests.passed}</span>
          <span class="mx-0.5">/</span>
          <span>${d.tests.total}</span>
          ${d.tests.failed > 0 ? `<span class="text-danger dark:text-red-400 font-semibold ml-1">(${d.tests.failed} failed)</span>` : ''}
          ${d.tests.skipped > 0 ? `<span class="text-[#9ca3af] ml-1">(${d.tests.skipped} skipped)</span>` : ''}
        </div>`;
    }

    let coverageHTML = '';
    if (typeof d.coverage !== 'undefined') {
      const covColor = d.coverage >= 80 ? 'text-success dark:text-green-400' : d.coverage >= 60 ? 'text-warning dark:text-yellow-400' : 'text-danger dark:text-red-400';
      coverageHTML = `<div class="text-xs text-[#6b7280] dark:text-[#64748b] mt-1">Coverage <span class="font-bold tabular-nums ${covColor}">${d.coverage.toFixed(1)}%</span></div>`;
    }

    let securityHTML = '';
    if (d.security_issues) {
      const { high, medium, low } = d.security_issues;
      const parts = [];
      if (high > 0) parts.push(`<span class="text-danger dark:text-red-400 font-semibold">${high}H</span>`);
      if (medium > 0) parts.push(`<span class="text-warning dark:text-yellow-400 font-semibold">${medium}M</span>`);
      if (low > 0) parts.push(`<span class="text-primary font-semibold">${low}L</span>`);
      if (parts.length > 0) {
        securityHTML = `<div class="text-xs text-[#6b7280] dark:text-[#64748b] mt-1">Security: ${parts.join(' ')}</div>`;
      }
    }

    let dockerHTML = '';
    if (d.images) {
      const totalMB = d.images.reduce((sum, img) => sum + img.size_mb, 0);
      dockerHTML = `
        <div class="text-xs text-[#6b7280] dark:text-[#64748b] mt-1">
          ${d.images.length} image${d.images.length !== 1 ? 's' : ''} · ${totalMB.toFixed(0)} MB
        </div>`;
    }

    // Count lint issues from reportsData
    const lintCount = reportsData.lint_warnings.filter(lw => mapComponentToFilter(lw.component) === c.key).length;

    return `
      <div class="status-card bg-white dark:bg-[#1e293b] rounded-xl border border-[#e5e7eb] dark:border-[#334155] shadow-sm p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <i data-lucide="${c.icon}" class="w-4 h-4 text-primary"></i>
            <span class="text-sm font-semibold text-[#111827] dark:text-[#f1f5f9]">${c.label}</span>
          </div>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>
        ${testsHTML}
        ${coverageHTML}
        ${securityHTML}
        ${dockerHTML}
        ${lintCount > 0 ? `<div class="text-xs text-[#6b7280] dark:text-[#64748b] mt-1">Lint: <span class="text-warning dark:text-yellow-400 font-semibold">${lintCount} warnings</span></div>` : ''}
      </div>`;
  }).join('');
}

function mapComponentToFilter(component) {
  const map = {
    'backend': 'backend',
    'frontend': 'frontend',
    'agent': 'agent',
    'docker': 'docker',
    'e2e': 'e2e',
  };
  return map[component] || component;
}

/* ==========================================================
 * Coverage Chart (Canvas + Fallback Sparklines)
 * ========================================================== */
function renderCoverageChart() {
  const canvas = document.getElementById('coverage-canvas');
  const fallback = document.getElementById('coverage-sparklines');
  if (!canvas || !reportsData.coverage_trend) return;

  const trend = reportsData.coverage_trend;
  if (trend.length === 0) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Canvas unsupported — show fallback
    canvas.parentElement.classList.add('hidden');
    fallback.classList.remove('hidden');
    renderCoverageFallback(fallback, trend);
    return;
  }

  drawCoverageCanvas(ctx, canvas, trend);
}

function drawCoverageCanvas(ctx, canvas, trend) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W = rect.width;
  const H = 256;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  const pad = { top: 20, right: 20, bottom: 30, left: 45 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const allVals = [
    ...trend.map(d => d.backend),
    ...trend.map(d => d.frontend),
    ...trend.map(d => d.agent),
  ];
  const minVal = Math.floor(Math.min(...allVals) - 2);
  const maxVal = Math.ceil(Math.max(...allVals) + 2);

  function x(i) { return pad.left + (i / (trend.length - 1)) * plotW; }
  function y(v) { return pad.top + plotH - ((v - minVal) / (maxVal - minVal)) * plotH; }

  // Grid
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim() || '#e5e7eb';
  ctx.lineWidth = 0.5;
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const val = minVal + (i / gridLines) * (maxVal - minVal);
    const gy = y(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, gy);
    ctx.lineTo(W - pad.right, gy);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim() || '#6b7280';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(0) + '%', pad.left - 6, gy + 3);
  }

  // X-axis labels
  ctx.textAlign = 'center';
  const xStep = Math.max(1, Math.floor(trend.length / 6));
  for (let i = 0; i < trend.length; i += xStep) {
    const date = trend[i].date.slice(5); // MM-DD
    ctx.fillText(date, x(i), H - pad.bottom + 14);
  }
  // Always label last point
  const lastDate = trend[trend.length - 1].date.slice(5);
  ctx.fillText(lastDate, x(trend.length - 1), H - pad.bottom + 14);

  // Draw lines
  const datasets = [
    { key: 'backend', color: '#2563eb', dash: [] },
    { key: 'frontend', color: '#16a34a', dash: [] },
    { key: 'agent', color: '#7c3aed', dash: [] },
  ];

  datasets.forEach(ds => {
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2;
    ctx.setLineDash(ds.dash);
    ctx.beginPath();
    trend.forEach((pt, i) => {
      const px = x(i), py = y(pt[ds.key]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Dot on last point
    const lastX = x(trend.length - 1);
    const lastY = y(trend[trend.length - 1][ds.key]);
    ctx.fillStyle = ds.color;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Value label on last point
    ctx.fillStyle = ds.color;
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(trend[trend.length - 1][ds.key].toFixed(1) + '%', lastX + 6, lastY + 3);
  });
}

function renderCoverageFallback(container, trend) {
  const datasets = [
    { key: 'backend', label: 'Backend', color: '#2563eb' },
    { key: 'frontend', label: 'Frontend', color: '#16a34a' },
    { key: 'agent', label: 'Agent', color: '#7c3aed' },
  ];

  datasets.forEach(ds => {
    const vals = trend.map(d => d[ds.key]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const last = vals[vals.length - 1];

    const svg = `
      <div class="flex items-center gap-3">
        <span class="text-xs font-medium w-20 text-[#4b5563] dark:text-[#94a3b8]">${ds.label}</span>
        <svg class="flex-1 h-8" viewBox="0 0 ${vals.length * 4} 32" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="${ds.color}"
            stroke-width="2"
            points="${vals.map((v, i) => `${i * 4},${32 - ((v - min) / (max - min)) * 28}`).join(' ')}"
          />
        </svg>
        <span class="text-xs font-bold tabular-nums" style="color:${ds.color}">${last.toFixed(1)}%</span>
      </div>`;
    container.insertAdjacentHTML('beforeend', svg);
  });
}

/* ==========================================================
 * Security Issues — grouped by severity, drill-down on click
 * ========================================================== */
function renderSecurityIssues() {
  const container = document.getElementById('security-list');
  if (!container || !reportsData.security_issues) return;

  const issues = [...reportsData.security_issues];
  if (issues.length === 0) {
    container.innerHTML = '<p class="text-sm text-[#6b7280] dark:text-[#64748b] text-center py-4">No security issues found</p>';
    return;
  }

  // Sort: high → medium → low
  const order = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  // Group by severity
  const groups = { high: [], medium: [], low: [] };
  issues.forEach(iss => groups[iss.severity].push(iss));

  const labels = { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };
  const bgColors = { high: 'bg-[#fef2f2] dark:bg-red-950/30', medium: 'bg-[#fffbeb] dark:bg-yellow-950/20', low: 'bg-[#eff6ff] dark:bg-blue-950/20' };
  const headingColors = { high: 'text-danger-dark dark:text-red-300', medium: 'text-warning-dark dark:text-yellow-300', low: 'text-primary-dark dark:text-blue-300' };

  let html = '';
  ['high', 'medium', 'low'].forEach(sev => {
    if (groups[sev].length === 0) return;
    html += `
      <div class="mb-3">
        <div class="flex items-center gap-2 mb-1 px-2 py-1 rounded ${bgColors[sev]}">
          <span class="severity-badge ${sev}">${labels[sev]}</span>
          <span class="text-xs font-medium ${headingColors[sev]}">${groups[sev].length} issue${groups[sev].length !== 1 ? 's' : ''}</span>
        </div>`;

    groups[sev].forEach((iss, idx) => {
      const id = `sec-${sev}-${idx}`;
      html += `
        <div class="security-item px-3 py-2 rounded-lg border border-transparent hover:border-[#e5e7eb] dark:hover:border-[#334155] text-sm" data-id="${id}">
          <div class="flex items-start justify-between cursor-pointer" onclick="toggleSecurityDetail('${id}')">
            <div class="flex-1 min-w-0">
              <p class="text-[#111827] dark:text-[#f1f5f9] truncate">${escapeHTML(iss.description)}</p>
              <p class="text-xs text-[#6b7280] dark:text-[#64748b] mt-0.5">
                <span class="font-mono">${escapeHTML(iss.cwe)}</span>
                <span class="mx-1">·</span>
                <span class="font-mono truncate">${escapeHTML(iss.file)}:${iss.line}</span>
              </p>
            </div>
            <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-[#9ca3af] mt-1 ml-1 flex-shrink-0 transition-transform" id="${id}-icon"></i>
          </div>
          <div class="security-detail" id="${id}-detail">
            <div class="space-y-1">
              <p><strong class="text-[#4b5563] dark:text-[#94a3b8]">CWE:</strong> ${escapeHTML(iss.cwe)}</p>
              <p><strong class="text-[#4b5563] dark:text-[#94a3b8]">File:</strong> <code class="text-xs bg-[#e5e7eb] dark:bg-[#334155] px-1 py-0.5 rounded">${escapeHTML(iss.file)}</code></p>
              <p><strong class="text-[#4b5563] dark:text-[#94a3b8]">Line:</strong> ${iss.line}</p>
              <p><strong class="text-[#4b5563] dark:text-[#94a3b8]">Description:</strong> ${escapeHTML(iss.description)}</p>
            </div>
          </div>
        </div>`;
    });

    html += '</div>';
  });

  container.innerHTML = html;
}

function toggleSecurityDetail(id) {
  const detail = document.getElementById(id + '-detail');
  const icon = document.getElementById(id + '-icon');
  if (!detail) return;
  const isOpen = detail.classList.toggle('open');
  if (icon) icon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

/* ==========================================================
 * Test Failures — drill-down expand stack trace on click
 * ========================================================== */
function renderTestFailures() {
  const body = document.getElementById('test-failures-body');
  const empty = document.getElementById('test-failures-empty');
  const count = document.getElementById('test-failure-count');
  if (!body || !reportsData.test_failures) return;

  const failures = [...reportsData.test_failures];
  count.textContent = failures.length;
  count.classList.toggle('hidden', failures.length === 0);

  if (failures.length === 0) {
    body.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  body.innerHTML = failures.map((f, idx) => {
    const id = `tf-${idx}`;
    const compLabel = f.component.charAt(0).toUpperCase() + f.component.slice(1);
    return `
      <tr class="test-failure-row border-b border-[#e5e7eb] dark:border-[#334155]" data-id="${id}" data-component="${f.component}">
        <td class="py-2 pr-3">
          <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-[#eff6ff] dark:bg-blue-900/30 text-primary-dark dark:text-blue-300">${compLabel}</span>
        </td>
        <td class="py-2 pr-3 text-[#111827] dark:text-[#f1f5f9] cursor-pointer" onclick="toggleTestStackTrace('${id}')">
          <span class="font-medium">${escapeHTML(f.test)}</span>
        </td>
        <td class="py-2 pr-3 text-xs font-mono text-[#6b7280] dark:text-[#64748b] hidden sm:table-cell">${escapeHTML(f.file)}:${f.line}</td>
        <td class="py-2 pr-3 text-sm text-danger dark:text-red-400">
          <span class="line-clamp-2">${escapeHTML(f.error)}</span>
        </td>
        <td class="py-2 hidden md:table-cell">
          ${f.ci_url ? `<a href="${escapeHTML(f.ci_url)}" target="_blank" rel="noopener" class="ci-link text-xs">View run →</a>` : '<span class="text-xs text-[#9ca3af]">—</span>'}
        </td>
      </tr>
      <tr class="test-failure-detail hidden" id="${id}-detail" data-component="${f.component}">
        <td colspan="5" class="py-0 pb-3">
          <div class="test-stack-trace">${escapeHTML(f.stack_trace || 'No stack trace available.')}</div>
        </td>
      </tr>`;
  }).join('');

  // Re-bind click on the row itself for drill-down (entire row clickable)
  body.querySelectorAll('.test-failure-row').forEach(row => {
    row.addEventListener('click', (e) => {
      // Don't toggle if clicking the CI link
      if (e.target.tagName === 'A') return;
      const id = row.dataset.id;
      toggleTestStackTrace(id);
    });
  });
}

function toggleTestStackTrace(id) {
  const detail = document.getElementById(id + '-detail');
  if (!detail) return;
  detail.classList.toggle('hidden');
  const trace = detail.querySelector('.test-stack-trace');
  if (trace) trace.classList.toggle('open');
}

/* ==========================================================
 * Docker Images
 * ========================================================== */
function renderDockerImages() {
  const container = document.getElementById('docker-list');
  if (!container || !reportsData.components.docker || !reportsData.components.docker.images) return;

  const images = reportsData.components.docker.images;
  if (images.length === 0) {
    container.innerHTML = '<p class="text-sm text-[#6b7280] dark:text-[#64748b] text-center py-4">No Docker images built</p>';
    return;
  }

  container.innerHTML = images.map(img => {
    const sizeColor = img.size_mb > 150 ? 'text-warning dark:text-yellow-400' : img.size_mb > 80 ? 'text-primary' : 'text-success dark:text-green-400';
    return `
      <div class="docker-image-card bg-[#f9fafb] dark:bg-[#0f172a] rounded-lg border border-[#e5e7eb] dark:border-[#334155] p-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <i data-lucide="package" class="w-4 h-4 text-primary"></i>
          </div>
          <div>
            <p class="text-sm font-semibold text-[#111827] dark:text-[#f1f5f9] font-mono">${escapeHTML(img.name)}</p>
            <p class="text-xs text-[#6b7280] dark:text-[#64748b] font-mono">${escapeHTML(img.tag)}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm font-bold tabular-nums ${sizeColor}">${img.size_mb.toFixed(1)} MB</p>
        </div>
      </div>`;
  }).join('');
}

/* ==========================================================
 * Lint Warnings
 * ========================================================== */
function renderLintWarnings() {
  const container = document.getElementById('lint-list');
  const countEl = document.getElementById('lint-warning-count');
  if (!container || !reportsData.lint_warnings) return;

  const warnings = [...reportsData.lint_warnings];
  countEl.textContent = warnings.length;

  if (warnings.length === 0) {
    container.innerHTML = '<p class="text-sm text-[#6b7280] dark:text-[#64748b] text-center py-4">No lint warnings — code is clean!</p>';
    return;
  }

  // Group by file
  const byFile = {};
  warnings.forEach(w => {
    const key = w.file;
    if (!byFile[key]) byFile[key] = { file: key, component: w.component, items: [] };
    byFile[key].items.push(w);
  });

  container.innerHTML = Object.values(byFile).map((group, gi) => {
    const fileId = `lint-${gi}`;
    const compLabel = group.component.charAt(0).toUpperCase() + group.component.slice(1);
    return `
      <div class="border border-[#e5e7eb] dark:border-[#334155] rounded-lg overflow-hidden" data-component="${group.component}">
        <div class="flex items-center justify-between px-3 py-2 bg-[#f9fafb] dark:bg-[#0f172a] border-b border-[#e5e7eb] dark:border-[#334155]">
          <div class="flex items-center gap-2 min-w-0">
            <i data-lucide="file-warning" class="w-3.5 h-3.5 text-warning flex-shrink-0"></i>
            <span class="text-xs font-mono text-[#4b5563] dark:text-[#94a3b8] truncate">${escapeHTML(group.file)}</span>
          </div>
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[#eff6ff] dark:bg-blue-900/30 text-primary-dark dark:text-blue-300 ml-2 flex-shrink-0">${compLabel}</span>
        </div>
        <div>
          ${group.items.map(w => `
            <div class="lint-warning-row px-3 py-1.5 text-xs border-b border-[#e5e7eb] dark:border-[#334155] last:border-b-0">
              <span class="text-[#6b7280] dark:text-[#64748b] font-mono mr-1.5">L${w.line}</span>
              <span class="text-[#4b5563] dark:text-[#94a3b8]">${escapeHTML(w.message)}</span>
              <span class="text-[#9ca3af] dark:text-[#64748b] ml-2 font-mono">${escapeHTML(w.rule)}</span>
            </div>
          `).join('')}
        </div>
      </div>`;
  }).join('');
}

/* ==========================================================
 * History Table
 * ========================================================== */
function renderHistory() {
  const body = document.getElementById('history-body');
  if (!body || !reportsData.history) return;

  const history = [...reportsData.history];

  body.innerHTML = history.map(h => {
    const statusLabel = h.status === 'pass' ? 'PASS' : h.status === 'warning' ? 'WARN' : 'FAIL';
    const statusClass = h.status === 'pass' ? 'status-badge pass' : h.status === 'warning' ? 'status-badge warning' : 'status-badge fail';
    const d = new Date(h.date);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const duration = formatDuration(h.duration_seconds);

    return `
      <tr class="history-row border-b border-[#e5e7eb] dark:border-[#334155]" data-date="${h.date.slice(0, 10)}" data-status="${h.status}">
        <td class="py-2 pr-3 text-xs text-[#4b5563] dark:text-[#94a3b8]">
          <span class="block">${dateStr}</span>
          <span class="text-[#9ca3af] dark:text-[#64748b]">${timeStr}</span>
        </td>
        <td class="py-2 pr-3">
          <code class="text-xs bg-[#f3f4f6] dark:bg-[#334155] px-1.5 py-0.5 rounded font-mono text-[#4b5563] dark:text-[#94a3b8]">${escapeHTML(h.commit)}</code>
        </td>
        <td class="py-2 pr-3 text-sm text-[#111827] dark:text-[#f1f5f9] hidden sm:table-cell max-w-xs truncate">${escapeHTML(h.commit_msg)}</td>
        <td class="py-2 pr-3">
          <span class="${statusClass}">${statusLabel}</span>
        </td>
        <td class="py-2 pr-3 text-xs font-mono text-[#6b7280] dark:text-[#64748b] hidden md:table-cell tabular-nums">${duration}</td>
        <td class="py-2 hidden lg:table-cell">
          ${h.ci_url ? `<a href="${escapeHTML(h.ci_url)}" target="_blank" rel="noopener" class="ci-link text-xs">#${h.ci_url.split('/').pop()}</a>` : '<span class="text-xs text-[#9ca3af]">—</span>'}
        </td>
      </tr>`;
  }).join('');
}

/* ==========================================================
 * Filtering
 * ========================================================== */
function filterTestFailures(component, dateStart, dateEnd) {
  const rows = document.querySelectorAll('#test-failures-body .test-failure-row');
  const details = document.querySelectorAll('#test-failures-body .test-failure-detail');
  let visible = 0;

  rows.forEach(row => {
    const comp = row.dataset.component;
    const match = component === 'all' || comp === component;
    if (match) { row.classList.remove('hidden'); visible++; }
    else { row.classList.add('hidden'); }
  });

  details.forEach(detail => {
    const comp = detail.dataset.component;
    const parentMatch = component === 'all' || comp === component;
    if (!parentMatch) detail.classList.add('hidden');
  });

  document.getElementById('test-failure-count').textContent = visible;
}

function filterSecurityIssues(component, dateStart, dateEnd) {
  // Security issues don't have dates, filter by component (match in file path)
  const items = document.querySelectorAll('#security-list .security-item');
  items.forEach(item => {
    if (component === 'all') { item.classList.remove('hidden'); return; }
    const text = item.textContent.toLowerCase();
    const match = text.includes(component);
    item.classList.toggle('hidden', !match);
  });

  // Hide empty severity groups
  document.querySelectorAll('#security-list > div.mb-3').forEach(group => {
    const visibleItems = group.querySelectorAll('.security-item:not(.hidden)');
    if (visibleItems.length === 0) group.classList.add('hidden');
    else group.classList.remove('hidden');
  });
}

function filterHistory(component, dateStart, dateEnd) {
  const rows = document.querySelectorAll('#history-body .history-row');
  rows.forEach(row => {
    let show = true;
    if (dateStart && row.dataset.date < dateStart) show = false;
    if (dateEnd && row.dataset.date > dateEnd) show = false;
    row.classList.toggle('hidden', !show);
  });
}

/* ==========================================================
 * Auto-Refresh
 * ========================================================== */
function startAutoRefresh() {
  refreshSeconds = 60;
  document.getElementById('refresh-indicator').classList.remove('hidden');
  updateCountdown();

  refreshInterval = setInterval(() => {
    refreshSeconds--;
    if (refreshSeconds <= 0) {
      refreshSeconds = 60;
      fetchReports();
    }
    updateCountdown();
  }, 1000);
}

function updateCountdown() {
  const el = document.getElementById('refresh-countdown');
  if (el) el.textContent = refreshSeconds + 's';
}

/* ==========================================================
 * Export
 * ========================================================== */
function exportJSON() {
  if (!reportsData) { showToast('error', 'No data to export'); return; }
  const blob = new Blob([JSON.stringify(reportsData, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'beacon-quality-report.json');
  showToast('success', 'JSON exported');
}

function exportCSV() {
  if (!reportsData) { showToast('error', 'No data to export'); return; }

  let csv = '';

  // History table as CSV (most useful)
  csv += 'Date,Commit,Message,Status,Duration,CI URL\n';
  if (reportsData.history) {
    reportsData.history.forEach(h => {
      csv += `${h.date},${h.commit},"${h.commit_msg.replace(/"/g, '""')}",${h.status},${h.duration_seconds},${h.ci_url || ''}\n`;
    });
  }

  csv += '\nTest Failures\n';
  csv += 'Component,Test,File,Line,Error,CI URL\n';
  if (reportsData.test_failures) {
    reportsData.test_failures.forEach(f => {
      csv += `${f.component},"${f.test.replace(/"/g, '""')}","${f.file}",${f.line},"${f.error.replace(/"/g, '""')}",${f.ci_url || ''}\n`;
    });
  }

  csv += '\nSecurity Issues\n';
  csv += 'Severity,CWE,File,Line,Description\n';
  if (reportsData.security_issues) {
    reportsData.security_issues.forEach(s => {
      csv += `${s.severity},${s.cwe},"${s.file}",${s.line},"${s.description.replace(/"/g, '""')}"\n`;
    });
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, 'beacon-quality-report.csv');
  showToast('success', 'CSV exported');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ==========================================================
 * Utilities
 * ========================================================== */
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function relativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function showToast(type, message) {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Auto-remove after animation
  setTimeout(() => toast.remove(), 3000);
}

// Handle window resize for canvas redraw
let resizeDebounce = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeDebounce);
  resizeDebounce = setTimeout(() => {
    if (reportsData) renderCoverageChart();
  }, 200);
});
