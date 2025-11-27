// Anchors Module - Manage user-confirmed preferences and insights
// Handles review of pending insights and elevation to anchors

export class AnchorsModule {
    constructor(container, contextPanel) {
        this.container = container;
        this.contextPanel = contextPanel;

        // Data paths (relative to ai-memory-sync)
        this.paths = {
            anchors: '../ai-memory-sync/state/insights/anchors.json',
            insights: '../ai-memory-sync/state/insights/insights.json',
            rejected: '../ai-memory-sync/state/insights/rejected-insights.json',
            claudeMd: '../ai-memory-sync/output/context/CLAUDE.md'
        };

        // Data stores
        this.anchors = [];
        this.insights = [];
        this.rejected = [];
        this.pendingInsights = [];

        // UI state
        this.currentView = 'overview'; // overview | review | manage
        this.reviewIndex = 0;
        this.filterCategory = 'all';
        this.searchQuery = '';

        // Read-only mode for safe initial deployment
        this.readOnly = true;

        console.log('AnchorsModule created (READ-ONLY MODE)');
    }

    /**
     * Initialize the anchors module
     */
    async init() {
        console.log('Initializing AnchorsModule...');

        try {
            await this.loadData();
            this.render();
            console.log('AnchorsModule initialized successfully!');
        } catch (error) {
            console.error('Error initializing AnchorsModule:', error);
            this.renderError(error.message);
        }
    }

    /**
     * Load all data from JSON files
     */
    async loadData() {
        console.log('Loading anchors data...');

        // Load anchors (or initialize empty if doesn't exist)
        try {
            const response = await fetch(this.paths.anchors);
            if (response.ok) {
                const data = await response.json();
                this.anchors = data.anchors || [];
                console.log(`Loaded ${this.anchors.length} anchors`);
            } else {
                console.log('No anchors file found, starting with empty list');
                this.anchors = [];
            }
        } catch (error) {
            console.log('No anchors file found, starting with empty list');
            this.anchors = [];
        }

        // Load insights
        try {
            const response = await fetch(this.paths.insights);
            if (response.ok) {
                const data = await response.json();

                // Normalize data to array regardless of source structure
                if (Array.isArray(data)) {
                    this.insights = data;
                } else if (Array.isArray(data.insights)) {
                    this.insights = data.insights;
                } else if (data && typeof data.insights === 'object') {
                    this.insights = Object.values(data.insights);
                } else if (data && typeof data === 'object') {
                    this.insights = Object.values(data);
                } else {
                    this.insights = [];
                }

                console.log(`Loaded ${this.insights.length} insights`);
            } else {
                console.warn('No insights file found');
                this.insights = [];
            }
        } catch (error) {
            console.warn('Error loading insights:', error);
            this.insights = [];
        }

        // Load rejected insights
        try {
            const response = await fetch(this.paths.rejected);
            if (response.ok) {
                const data = await response.json();
                this.rejected = data.rejected || [];
                console.log(`Loaded ${this.rejected.length} rejected insights`);
            } else {
                this.rejected = [];
            }
        } catch (error) {
            this.rejected = [];
        }

        // Calculate pending insights (not anchored, not rejected)
        this.calculatePendingInsights();
    }

    /**
     * Calculate which insights are pending review
     */
    calculatePendingInsights() {
        const anchoredIds = new Set(
            this.anchors
                .filter(a => a.source?.insight_id)
                .map(a => a.source.insight_id)
        );

        const rejectedIds = new Set(
            this.rejected.map(r => r.insight_id)
        );

        this.pendingInsights = this.insights.filter(insight => {
            const id = insight.id || insight.insight_id;
            return !anchoredIds.has(id) && !rejectedIds.has(id);
        });

        console.log(`Found ${this.pendingInsights.length} pending insights for review`);
    }

    /**
     * Render the main UI
     */
    render() {
        if (!this.container) {
            console.error('No container provided for AnchorsModule');
            return;
        }

        this.container.innerHTML = `
            <div class="anchors-container">
                <div class="anchors-header">
                    <h2>⚓ Anchors</h2>
                    ${this.readOnly ? '<span class="read-only-badge">READ-ONLY MODE</span>' : ''}
                </div>

                <div class="anchors-content">
                    ${this.renderOverview()}
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Render overview section
     */
    renderOverview() {
        const needsReview = this.pendingInsights.length;
        const claudeMdNeedsUpdate = this.anchors.length > 0; // Simplified check for now

        return `
            <div class="overview-section">
                <!-- Stats -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">⚓</div>
                        <div class="stat-info">
                            <div class="stat-value">${this.anchors.length}</div>
                            <div class="stat-label">Active Anchors</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">📋</div>
                        <div class="stat-info">
                            <div class="stat-value">${needsReview}</div>
                            <div class="stat-label">Pending Review</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">📄</div>
                        <div class="stat-info">
                            <div class="stat-value">${this.insights.length}</div>
                            <div class="stat-label">Total Insights</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">🚫</div>
                        <div class="stat-info">
                            <div class="stat-value">${this.rejected.length}</div>
                            <div class="stat-label">Rejected</div>
                        </div>
                    </div>
                </div>

                <!-- Attention Needed -->
                ${needsReview > 0 || claudeMdNeedsUpdate ? `
                <div class="attention-section">
                    <h3>⚠️ Attention Needed</h3>
                    <div class="attention-items">
                        ${needsReview > 0 ? `
                        <div class="attention-item">
                            <div class="attention-icon">📋</div>
                            <div class="attention-content">
                                <div class="attention-title">${needsReview} insights need review</div>
                                <div class="attention-description">Review and approve high-confidence insights</div>
                            </div>
                            <button class="btn btn-primary" data-action="start-review">
                                Review Now
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- Active Anchors -->
                <div class="anchors-list-section">
                    <div class="section-header">
                        <h3>🎯 Active Anchors (${this.anchors.length})</h3>
                        <button class="btn btn-secondary" data-action="add-anchor" ${this.readOnly ? 'disabled' : ''}>
                            + New Anchor
                        </button>
                    </div>

                    ${this.renderAnchorsList()}
                </div>

                ${this.readOnly ? `
                <div class="read-only-notice">
                    <strong>Note:</strong> Running in read-only mode for safety.
                    Data can be viewed but not modified.
                    Write operations will be enabled in a future update.
                </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render list of anchors grouped by category
     */
    renderAnchorsList() {
        if (this.anchors.length === 0) {
            return `
                <div class="empty-state">
                    <p>No anchors yet. Review pending insights or create one manually.</p>
                </div>
            `;
        }

        // Group by category
        const grouped = this.anchors.reduce((acc, anchor) => {
            const category = anchor.category || 'uncategorized';
            if (!acc[category]) acc[category] = [];
            acc[category].push(anchor);
            return acc;
        }, {});

        // Render each category
        return Object.entries(grouped)
            .map(([category, anchors]) => `
                <div class="anchor-category">
                    <h4>${this.formatCategory(category)} (${anchors.length})</h4>
                    <div class="anchor-items">
                        ${anchors.map(anchor => this.renderAnchorCard(anchor)).join('')}
                    </div>
                </div>
            `).join('');
    }

    /**
     * Render individual anchor card
     */
    renderAnchorCard(anchor) {
        const createdDate = anchor.created ? new Date(anchor.created).toLocaleDateString() : 'Unknown';
        const source = anchor.source?.type === 'elevated_from_insight'
            ? `From: ${anchor.source.insight_id}`
            : 'Manual';

        return `
            <div class="anchor-card" data-anchor-id="${anchor.id}">
                <div class="anchor-statement">${this.escapeHtml(anchor.statement)}</div>
                <div class="anchor-meta">
                    <span class="anchor-date">Created: ${createdDate}</span>
                    <span class="anchor-source">${source}</span>
                </div>
                ${anchor.notes ? `<div class="anchor-notes">${this.escapeHtml(anchor.notes)}</div>` : ''}
                <div class="anchor-actions">
                    <button class="btn-link" data-action="view-anchor" data-id="${anchor.id}">View</button>
                    <button class="btn-link" data-action="edit-anchor" data-id="${anchor.id}" ${this.readOnly ? 'disabled' : ''}>Edit</button>
                    <button class="btn-link danger" data-action="archive-anchor" data-id="${anchor.id}" ${this.readOnly ? 'disabled' : ''}>Archive</button>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Action buttons
        this.container.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;

            switch (action) {
                case 'start-review':
                    this.startReview();
                    break;
                case 'add-anchor':
                    if (!this.readOnly) this.showAddAnchorModal();
                    break;
                case 'view-anchor':
                    this.viewAnchor(e.target.dataset.id);
                    break;
                case 'edit-anchor':
                    if (!this.readOnly) this.editAnchor(e.target.dataset.id);
                    break;
                case 'archive-anchor':
                    if (!this.readOnly) this.archiveAnchor(e.target.dataset.id);
                    break;
            }
        });
    }

    /**
     * Start insight review workflow
     */
    startReview() {
        console.log('Starting insight review...');
        alert('Insight review workflow coming soon!\n\nThis will allow you to:\n- Review pending insights one by one\n- See evidence from conversations\n- Approve as anchors or reject\n- Detect duplicates and conflicts');
    }

    /**
     * View anchor details
     */
    viewAnchor(anchorId) {
        const anchor = this.anchors.find(a => a.id === anchorId);
        if (!anchor) return;

        console.log('Viewing anchor:', anchor);
        alert(`Anchor Details:\n\n${anchor.statement}\n\nCategory: ${anchor.category}\nCreated: ${anchor.created}\n\nFull details view coming soon!`);
    }

    /**
     * Edit anchor (placeholder)
     */
    editAnchor(anchorId) {
        console.log('Edit anchor:', anchorId);
        alert('Edit functionality coming soon!');
    }

    /**
     * Archive anchor (placeholder)
     */
    archiveAnchor(anchorId) {
        console.log('Archive anchor:', anchorId);
        alert('Archive functionality coming soon!');
    }

    /**
     * Show add anchor modal (placeholder)
     */
    showAddAnchorModal() {
        alert('Add new anchor functionality coming soon!\n\nYou will be able to create anchors manually without going through insight review.');
    }

    /**
     * Format category name for display
     */
    formatCategory(category) {
        return category
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Render error state
     */
    renderError(message) {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="error-state">
                <h2>Error Loading Anchors</h2>
                <p>${this.escapeHtml(message)}</p>
                <button class="btn btn-primary" onclick="location.reload()">Reload</button>
            </div>
        `;
    }
}
