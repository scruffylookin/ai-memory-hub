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

        // Review session state
        this.reviewDecisions = []; // Track approve/reject/skip decisions
        this.reviewedInsights = new Set(); // Track which insights were reviewed

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

        if (this.pendingInsights.length === 0) {
            alert('No insights to review!');
            return;
        }

        // Sort pending insights by strength (highest first)
        this.pendingInsights.sort((a, b) => {
            const strengthA = a.strength || a.confidence || 0;
            const strengthB = b.strength || b.confidence || 0;
            return strengthB - strengthA;
        });

        this.currentView = 'review';
        this.reviewIndex = 0;
        this.reviewDecisions = [];
        this.reviewedInsights = new Set();
        this.renderReviewInterface();
        this.setupKeyboardShortcuts();
    }

    /**
     * Render the review interface
     */
    renderReviewInterface() {
        const insight = this.pendingInsights[this.reviewIndex];
        if (!insight) {
            this.finishReview();
            return;
        }

        const insightId = insight.id || insight.insight_id || `insight_${this.reviewIndex}`;
        const insightText = insight.insight || insight.content || insight.statement || 'No content';
        const category = insight.category || 'uncategorized';
        const strength = insight.strength || insight.confidence || 0;
        const firstSeen = insight.first_observed || insight.created || 'Unknown';
        const lastSeen = insight.last_observed || insight.updated || 'Unknown';

        // Get evidence (conversation sources)
        const evidence = this.getInsightEvidence(insight);

        // Check for similar anchors
        const similarAnchors = this.findSimilarAnchors(insightText);

        const progress = this.reviewIndex + 1;
        const total = this.pendingInsights.length;
        const progressPercent = (progress / total) * 100;

        this.container.innerHTML = `
            <div class="review-container">
                <!-- Header with Progress -->
                <div class="review-header">
                    <button class="btn-link" data-action="exit-review">
                        ← Back to Overview
                    </button>
                    <div class="review-progress">
                        <span class="progress-text">${progress} of ${total}</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                </div>

                <!-- Insight Card -->
                <div class="insight-review-card">
                    <div class="insight-header">
                        <span class="insight-category-badge">${this.formatCategory(category)}</span>
                        <span class="insight-id">${insightId}</span>
                    </div>

                    <div class="insight-statement">
                        "${this.escapeHtml(insightText)}"
                    </div>

                    <div class="insight-meta">
                        <div class="meta-item">
                            <span class="meta-label">Confidence:</span>
                            <div class="confidence-bar">
                                <div class="confidence-fill" style="width: ${strength * 100}%"></div>
                            </div>
                            <span class="meta-value">${(strength * 100).toFixed(0)}%</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">First Seen:</span>
                            <span class="meta-value">${this.formatDate(firstSeen)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Last Seen:</span>
                            <span class="meta-value">${this.formatDate(lastSeen)}</span>
                        </div>
                    </div>

                    <!-- Evidence Section -->
                    <div class="evidence-section">
                        <h4>📊 Evidence (${evidence.length} conversations)</h4>
                        ${evidence.length > 0 ? `
                            <div class="evidence-list">
                                ${evidence.slice(0, 5).map(e => `
                                    <div class="evidence-item">
                                        <div class="evidence-date">${this.formatDate(e.date)}</div>
                                        <div class="evidence-text">"${this.escapeHtml(e.text)}"</div>
                                    </div>
                                `).join('')}
                                ${evidence.length > 5 ? `
                                    <div class="evidence-more">
                                        + ${evidence.length - 5} more conversations
                                    </div>
                                ` : ''}
                            </div>
                        ` : `
                            <div class="no-evidence">No specific evidence available</div>
                        `}
                    </div>

                    <!-- Similar Anchors Warning -->
                    ${similarAnchors.length > 0 ? `
                        <div class="similarity-warning">
                            <h4>⚠️ Similar Anchors Detected</h4>
                            <div class="similar-anchors-list">
                                ${similarAnchors.map(anchor => `
                                    <div class="similar-anchor">
                                        <div class="similarity-score">${(anchor.similarity * 100).toFixed(0)}% match</div>
                                        <div class="similar-text">"${this.escapeHtml(anchor.statement)}"</div>
                                        <div class="similar-meta">Created ${this.formatDate(anchor.created)}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="similarity-note">
                                This insight may be redundant. Consider if it adds new information.
                            </div>
                        </div>
                    ` : ''}

                    <!-- Action Buttons -->
                    <div class="review-actions">
                        <button class="btn btn-primary" data-action="approve-insight" data-id="${insightId}">
                            ✓ Approve as Anchor
                            <span class="kbd-hint">→</span>
                        </button>
                        <button class="btn btn-secondary" data-action="edit-and-approve" data-id="${insightId}">
                            ✎ Edit & Approve
                            <span class="kbd-hint">E</span>
                        </button>
                        <button class="btn btn-secondary" data-action="skip-insight" data-id="${insightId}">
                            ↷ Skip for Later
                            <span class="kbd-hint">↓</span>
                        </button>
                        <button class="btn btn-secondary danger" data-action="reject-insight" data-id="${insightId}">
                            ✗ Reject Permanently
                            <span class="kbd-hint">←</span>
                        </button>
                    </div>

                    ${this.readOnly ? `
                        <div class="review-notice">
                            <strong>Read-Only Mode:</strong> Actions are simulated. No files will be modified.
                        </div>
                    ` : ''}
                </div>

                <!-- Navigation -->
                <div class="review-navigation">
                    <button class="btn btn-secondary" data-action="prev-insight" ${this.reviewIndex === 0 ? 'disabled' : ''}>
                        ← Previous
                    </button>
                    <span class="nav-position">${progress} / ${total}</span>
                    <button class="btn btn-secondary" data-action="next-insight" ${this.reviewIndex >= total - 1 ? 'disabled' : ''}>
                        Next →
                    </button>
                </div>
            </div>
        `;

        // Attach event listeners for review actions
        this.attachReviewListeners();
    }

    /**
     * Attach event listeners for review interface
     */
    attachReviewListeners() {
        this.container.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            const id = e.target.closest('[data-id]')?.dataset.id;

            if (!action) return;

            switch (action) {
                case 'exit-review':
                    this.exitReview();
                    break;
                case 'approve-insight':
                    this.approveInsight(id);
                    break;
                case 'edit-and-approve':
                    this.editAndApprove(id);
                    break;
                case 'skip-insight':
                    this.skipInsight(id);
                    break;
                case 'reject-insight':
                    this.rejectInsight(id);
                    break;
                case 'prev-insight':
                    this.navigateReview(-1);
                    break;
                case 'next-insight':
                    this.navigateReview(1);
                    break;
            }
        });
    }

    /**
     * Setup keyboard shortcuts for review
     */
    setupKeyboardShortcuts() {
        this.keyHandler = (e) => {
            if (this.currentView !== 'review') return;

            switch (e.key) {
                case 'ArrowRight':
                    e.preventDefault();
                    this.approveInsight();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.rejectInsight();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.skipInsight();
                    break;
                case 'e':
                case 'E':
                    e.preventDefault();
                    this.editAndApprove();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.exitReview();
                    break;
            }
        };

        document.addEventListener('keydown', this.keyHandler);
    }

    /**
     * Remove keyboard shortcuts
     */
    removeKeyboardShortcuts() {
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
    }

    /**
     * Get evidence for an insight
     */
    getInsightEvidence(insight) {
        // Extract evidence from insight data
        const evidence = [];

        if (insight.evidence && Array.isArray(insight.evidence)) {
            return insight.evidence.map(e => ({
                date: e.timestamp || e.date || e.chat_timestamp,
                text: e.excerpt || e.text || e.content || 'Evidence text'
            }));
        }

        // Fallback: create mock evidence from metadata
        if (insight.source_conversations && Array.isArray(insight.source_conversations)) {
            return insight.source_conversations.slice(0, 5).map(conv => ({
                date: conv.timestamp || conv.date,
                text: `Referenced in conversation ${conv.id || 'unknown'}`
            }));
        }

        return evidence;
    }

    /**
     * Find similar existing anchors
     */
    findSimilarAnchors(insightText) {
        const similar = [];
        const insightWords = new Set(
            insightText.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 3)
        );

        for (const anchor of this.anchors) {
            const anchorWords = new Set(
                anchor.statement.toLowerCase()
                    .replace(/[^\w\s]/g, '')
                    .split(/\s+/)
                    .filter(w => w.length > 3)
            );

            // Calculate Jaccard similarity
            const intersection = new Set([...insightWords].filter(w => anchorWords.has(w)));
            const union = new Set([...insightWords, ...anchorWords]);
            const similarity = intersection.size / union.size;

            if (similarity > 0.4) { // 40% similarity threshold
                similar.push({
                    ...anchor,
                    similarity
                });
            }
        }

        return similar.sort((a, b) => b.similarity - a.similarity);
    }

    /**
     * Navigate through review items
     */
    navigateReview(delta) {
        const newIndex = this.reviewIndex + delta;
        if (newIndex >= 0 && newIndex < this.pendingInsights.length) {
            this.reviewIndex = newIndex;
            this.renderReviewInterface();
        }
    }

    /**
     * Approve insight as anchor
     */
    approveInsight(id) {
        const insight = this.pendingInsights[this.reviewIndex];
        const insightId = id || insight.id || insight.insight_id || `insight_${this.reviewIndex}`;

        console.log('Approving insight:', insightId);

        this.reviewDecisions.push({
            insightId,
            action: 'approve',
            statement: insight.insight || insight.content,
            category: insight.category,
            timestamp: new Date().toISOString()
        });

        this.reviewedInsights.add(insightId);

        // Show feedback
        this.showFeedback('✓ Would create anchor (read-only mode)', 'success');

        // Move to next
        setTimeout(() => this.navigateReview(1), 800);
    }

    /**
     * Skip insight for later review
     */
    skipInsight(id) {
        const insight = this.pendingInsights[this.reviewIndex];
        const insightId = id || insight.id || insight.insight_id || `insight_${this.reviewIndex}`;

        console.log('Skipping insight:', insightId);

        this.reviewDecisions.push({
            insightId,
            action: 'skip',
            timestamp: new Date().toISOString()
        });

        this.showFeedback('↷ Skipped for later review', 'info');
        setTimeout(() => this.navigateReview(1), 500);
    }

    /**
     * Reject insight permanently
     */
    rejectInsight(id) {
        const insight = this.pendingInsights[this.reviewIndex];
        const insightId = id || insight.id || insight.insight_id || `insight_${this.reviewIndex}`;

        console.log('Rejecting insight:', insightId);

        this.reviewDecisions.push({
            insightId,
            action: 'reject',
            statement: insight.insight || insight.content,
            category: insight.category,
            timestamp: new Date().toISOString()
        });

        this.reviewedInsights.add(insightId);

        this.showFeedback('✗ Would reject permanently (read-only mode)', 'warning');
        setTimeout(() => this.navigateReview(1), 800);
    }

    /**
     * Edit and approve insight
     */
    editAndApprove(id) {
        const insight = this.pendingInsights[this.reviewIndex];
        const insightId = id || insight.id || insight.insight_id || `insight_${this.reviewIndex}`;
        const currentText = insight.insight || insight.content || '';

        const newText = prompt('Edit insight text:', currentText);

        if (newText && newText !== currentText) {
            console.log('Editing and approving:', insightId, newText);

            this.reviewDecisions.push({
                insightId,
                action: 'approve_edited',
                original: currentText,
                statement: newText,
                category: insight.category,
                timestamp: new Date().toISOString()
            });

            this.reviewedInsights.add(insightId);
            this.showFeedback('✓ Would create edited anchor (read-only mode)', 'success');
            setTimeout(() => this.navigateReview(1), 800);
        }
    }

    /**
     * Show feedback message
     */
    showFeedback(message, type = 'info') {
        const colors = {
            success: '#30D158',
            warning: '#FF9F0A',
            error: '#FF453A',
            info: '#0A84FF'
        };

        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        feedback.textContent = message;
        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
    }

    /**
     * Exit review and return to overview
     */
    exitReview() {
        this.removeKeyboardShortcuts();
        this.currentView = 'overview';

        // Show summary if any decisions were made
        if (this.reviewDecisions.length > 0) {
            const approved = this.reviewDecisions.filter(d => d.action === 'approve' || d.action === 'approve_edited').length;
            const rejected = this.reviewDecisions.filter(d => d.action === 'reject').length;
            const skipped = this.reviewDecisions.filter(d => d.action === 'skip').length;

            console.log('Review session complete:', {
                approved,
                rejected,
                skipped,
                decisions: this.reviewDecisions
            });

            alert(`Review Session Summary:\n\n✓ Approved: ${approved}\n✗ Rejected: ${rejected}\n↷ Skipped: ${skipped}\n\n(Read-only mode - no changes saved)`);
        }

        this.render();
    }

    /**
     * Finish review when all insights processed
     */
    finishReview() {
        this.removeKeyboardShortcuts();
        this.currentView = 'overview';

        const approved = this.reviewDecisions.filter(d => d.action === 'approve' || d.action === 'approve_edited').length;
        const rejected = this.reviewDecisions.filter(d => d.action === 'reject').length;
        const skipped = this.reviewDecisions.filter(d => d.action === 'skip').length;

        alert(`Review Complete!\n\n✓ Approved: ${approved}\n✗ Rejected: ${rejected}\n↷ Skipped: ${skipped}\n\nAll insights have been reviewed.\n\n(Read-only mode - no changes saved)`);

        this.render();
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString || dateString === 'Unknown') return 'Unknown';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
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
