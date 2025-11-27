// Context Panel Module
// Handles bi-directional linking between conversations and insights

export class ContextPanel {
    constructor() {
        this.panel = document.getElementById('context-panel');
        this.title = document.getElementById('context-panel-title');
        this.content = document.getElementById('context-panel-content');
        this.closeBtn = document.getElementById('context-panel-close');
        this.pinBtn = document.getElementById('context-panel-pin');

        this.pinned = false;
        this.hideTimeout = null;
        this.conversationsModule = null;
        this.insightsModule = null;

        this.setupEventListeners();
    }

    /**
     * Set module references
     */
    setModules(conversationsModule, insightsModule) {
        this.conversationsModule = conversationsModule;
        this.insightsModule = insightsModule;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Close button
        this.closeBtn.addEventListener('click', () => {
            this.hide();
        });

        // Pin button
        this.pinBtn.addEventListener('click', () => {
            this.togglePin();
        });

        // Panel mouse events
        this.panel.addEventListener('mouseenter', () => {
            this.cancelHideTimeout();
        });

        this.panel.addEventListener('mouseleave', () => {
            if (!this.pinned) {
                this.scheduleHide();
            }
        });
    }

    /**
     * Show related insights for a conversation
     */
    showRelatedInsights(conversationId) {
        if (!this.insightsModule) return;

        const insights = this.insightsModule.getAllInsights();
        const relatedInsights = insights.filter(insight =>
            insight.evidence && insight.evidence.some(e => e.includes(conversationId))
        );

        if (relatedInsights.length === 0) {
            // Don't show panel if no related insights
            return;
        }

        // Limit to 5 most relevant (by strength)
        const limited = relatedInsights
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 5);

        this.title.textContent = 'Related Insights';
        this.renderInsights(limited);
        this.show();
    }

    /**
     * Show source conversations for an insight
     */
    showSourceConversations(insight) {
        if (!this.conversationsModule || !insight.evidence) return;

        const conversations = this.conversationsModule.getAllConversations();
        const sourceConversations = [];

        insight.evidence.forEach(evidenceStr => {
            // Evidence format: "claude-cli/conv-id" or "gemini-cli/conv-id"
            const [tool, ...idParts] = evidenceStr.split('/');
            const id = idParts.join('/');

            // Try to find conversation
            for (const [convId, conv] of conversations.entries()) {
                if (convId.includes(id) || id.includes(convId)) {
                    sourceConversations.push(conv);
                    break;
                }
            }
        });

        if (sourceConversations.length === 0) {
            return;
        }

        // Limit to 5
        const limited = sourceConversations.slice(0, 5);

        this.title.textContent = 'Source Conversations';
        this.renderConversations(limited);
        this.show();
    }

    /**
     * Render insights in context panel
     */
    renderInsights(insights) {
        this.content.innerHTML = '';

        insights.forEach(insight => {
            const item = document.createElement('div');
            item.className = 'context-item';

            const title = document.createElement('div');
            title.className = 'context-item-title';
            title.textContent = insight.content.substring(0, 100) + (insight.content.length > 100 ? '...' : '');

            const meta = document.createElement('div');
            meta.className = 'context-item-meta';
            meta.innerHTML = `
                <span>${insight.category}</span> •
                <span>Strength: ${(insight.strength * 100).toFixed(0)}%</span> •
                <span>${this.formatRelativeTime(new Date(insight.chat_timestamp))}</span>
            `;

            item.appendChild(title);
            item.appendChild(meta);

            // Click to navigate to insights tab and filter by category
            item.addEventListener('click', () => {
                this.navigateToInsight(insight);
            });

            this.content.appendChild(item);
        });
    }

    /**
     * Render conversations in context panel
     */
    renderConversations(conversations) {
        this.content.innerHTML = '';

        conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = 'context-item';

            const title = document.createElement('div');
            title.className = 'context-item-title';
            title.textContent = conv.conversation.title || 'Untitled Conversation';

            const meta = document.createElement('div');
            meta.className = 'context-item-meta';
            meta.innerHTML = `
                <span>${conv.tool}</span> •
                <span>${conv.metadata.message_count} messages</span> •
                <span>${this.formatRelativeTime(new Date(conv.conversation.updated))}</span>
            `;

            item.appendChild(title);
            item.appendChild(meta);

            // Click to navigate to conversations tab and load conversation
            item.addEventListener('click', () => {
                this.navigateToConversation(conv);
            });

            this.content.appendChild(item);
        });
    }

    /**
     * Navigate to insight
     */
    navigateToInsight(insight) {
        // Switch to insights tab
        const insightsTab = document.querySelector('.tab-btn[data-tab="insights"]');
        if (insightsTab) {
            insightsTab.click();
        }

        // Filter by category
        if (this.insightsModule) {
            setTimeout(() => {
                this.insightsModule.filterByCategory(insight.category);
            }, 100);
        }

        this.hide();
    }

    /**
     * Navigate to conversation
     */
    navigateToConversation(conv) {
        // Switch to conversations tab
        const conversationsTab = document.querySelector('.tab-btn[data-tab="conversations"]');
        if (conversationsTab) {
            conversationsTab.click();
        }

        // Load conversation
        if (this.conversationsModule) {
            setTimeout(() => {
                // Find conversation ID
                for (const [id, conversation] of this.conversationsModule.getAllConversations().entries()) {
                    if (conversation === conv) {
                        this.conversationsModule.loadConversation(id);
                        break;
                    }
                }
            }, 100);
        }

        this.hide();
    }

    /**
     * Show panel
     */
    show() {
        this.cancelHideTimeout();
        this.panel.classList.remove('hidden');
        this.panel.classList.add('visible');

        if (!this.pinned) {
            this.scheduleHide();
        }
    }

    /**
     * Hide panel
     */
    hide() {
        this.panel.classList.remove('visible');
        this.panel.classList.add('hidden');
        this.cancelHideTimeout();
    }

    /**
     * Toggle pin state
     */
    togglePin() {
        this.pinned = !this.pinned;

        if (this.pinned) {
            this.pinBtn.classList.add('pinned');
            this.pinBtn.title = 'Unpin panel';
            this.cancelHideTimeout();
        } else {
            this.pinBtn.classList.remove('pinned');
            this.pinBtn.title = 'Pin panel';
            this.scheduleHide();
        }
    }

    /**
     * Check if panel is pinned
     */
    isPinned() {
        return this.pinned;
    }

    /**
     * Schedule hide after delay
     */
    scheduleHide() {
        this.cancelHideTimeout();
        this.hideTimeout = setTimeout(() => {
            if (!this.pinned) {
                this.hide();
            }
        }, 500); // 500ms delay
    }

    /**
     * Cancel scheduled hide
     */
    cancelHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    /**
     * Format relative time
     */
    formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }
}
