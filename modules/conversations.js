// Conversations Module
// Handles conversation viewing and management

export class ConversationsModule {
    constructor(container, contextPanel) {
        this.container = container;
        this.contextPanel = contextPanel;
        this.syncStatus = null;
        this.conversations = new Map();
        this.currentConversation = null;
        this.currentFilter = 'all';
        this.searchTerm = '';
    }

    /**
     * Initialize and load conversations
     */
    async init() {
        this.setupEventListeners();
        await this.loadData();
    }

    /**
     * Set up event listeners for filters, search, and metadata toggle
     */
    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.tool;
                this.renderConversationList();
            });
        });

        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.renderConversationList();
            });
        }

        // Metadata toggle
        const metadataBtn = document.getElementById('toggle-metadata');
        if (metadataBtn) {
            metadataBtn.addEventListener('click', () => {
                const panel = document.getElementById('metadata-panel');
                panel.classList.toggle('hidden');
                metadataBtn.textContent = panel.classList.contains('hidden') ? 'Show Metadata' : 'Hide Metadata';
            });
        }
    }

    /**
     * Load sync status and conversation data
     */
    async loadData() {
        try {
            // Load sync status
            const syncResponse = await fetch('../ai-memory-sync/sync-status.json');
            this.syncStatus = await syncResponse.json();

            // Update stats
            this.updateStats();

            // Load conversations from both Claude and Gemini
            await this.loadConversations('claude');
            await this.loadConversations('gemini');

            // Render conversation list
            this.renderConversationList();

            // Update status
            document.querySelector('.status-text').textContent = 'Connected';

        } catch (error) {
            console.error('Error loading data:', error);
            document.querySelector('.status-text').textContent = 'Error loading data';
            document.querySelector('.status-indicator').style.background = 'var(--error-color)';
        }
    }

    /**
     * Load conversations for a specific tool (claude/gemini)
     */
    async loadConversations(tool) {
        const syncedConversations = this.syncStatus.synced_conversations[tool];

        for (const [id, metadata] of Object.entries(syncedConversations)) {
            try {
                // Extract the path relative to the Scripts directory
                const pathMatch = metadata.archive_path.match(/ai-memory-sync[\/\\]archive.*/);
                if (!pathMatch) {
                    console.warn(`Could not extract relative path from: ${metadata.archive_path}`);
                    continue;
                }

                const relativePath = pathMatch[0].replace(/\\/g, '/');
                const response = await fetch(`../${relativePath}`);
                const conversation = await response.json();

                this.conversations.set(id, {
                    ...conversation,
                    metadata: metadata,
                    tool: tool
                });
            } catch (error) {
                console.error(`Error loading conversation ${id}:`, error);
            }
        }
    }

    /**
     * Update statistics display
     */
    updateStats() {
        document.getElementById('total-conversations').textContent =
            this.syncStatus.total_conversations;

        document.getElementById('total-messages').textContent =
            this.syncStatus.stats.total_messages.toLocaleString();

        const lastSync = new Date(this.syncStatus.last_sync);
        document.getElementById('last-sync').textContent =
            this.formatRelativeTime(lastSync);
    }

    /**
     * Render the filtered conversation list
     */
    renderConversationList() {
        const container = document.getElementById('conversation-items');
        container.innerHTML = '';

        const filteredConversations = Array.from(this.conversations.entries())
            .filter(([id, conv]) => {
                // Filter by tool
                if (this.currentFilter !== 'all' && conv.tool !== this.currentFilter) {
                    return false;
                }

                // Filter by search term
                if (this.searchTerm) {
                    const title = conv.conversation.title?.toLowerCase() || '';
                    const tags = conv.conversation.tags?.join(' ').toLowerCase() || '';
                    return title.includes(this.searchTerm) || tags.includes(this.searchTerm);
                }

                return true;
            })
            .sort((a, b) => {
                const dateA = new Date(a[1].conversation.updated);
                const dateB = new Date(b[1].conversation.updated);
                return dateB - dateA;
            });

        filteredConversations.forEach(([id, conv]) => {
            const item = this.createConversationItem(id, conv);
            container.appendChild(item);
        });

        if (filteredConversations.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No conversations found</div>';
        }
    }

    /**
     * Create a conversation list item element
     */
    createConversationItem(id, conv) {
        const div = document.createElement('div');
        div.className = 'conversation-item';
        if (this.currentConversation === id) {
            div.classList.add('active');
        }

        const title = conv.conversation.title || 'Untitled Conversation';
        const messageCount = conv.metadata.message_count;
        const date = new Date(conv.conversation.updated);
        const tool = conv.tool;

        div.innerHTML = `
            <div class="conversation-item-header">
                <div class="conversation-item-title">${this.escapeHtml(title)}</div>
                <span class="conversation-item-tool ${tool}">${tool}</span>
            </div>
            <div class="conversation-item-meta">
                <span>${messageCount} messages</span>
                <span>${this.formatRelativeTime(date)}</span>
            </div>
        `;

        div.addEventListener('click', () => {
            this.loadConversation(id);
        });

        // Add hover event for context panel (bi-directional linking)
        div.addEventListener('mouseenter', () => {
            if (this.contextPanel && !this.contextPanel.isPinned()) {
                this.showRelatedInsights(id);
            }
        });

        return div;
    }

    /**
     * Load and display a specific conversation
     */
    async loadConversation(id) {
        this.currentConversation = id;
        const conv = this.conversations.get(id);

        // Update active state in list
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });

        // Find and activate the clicked item
        const items = document.querySelectorAll('.conversation-item');
        items.forEach(item => {
            if (item.querySelector('.conversation-item-title').textContent === (conv.conversation.title || 'Untitled Conversation')) {
                item.classList.add('active');
            }
        });

        // Update header
        document.getElementById('conversation-title').textContent =
            conv.conversation.title || 'Untitled Conversation';

        document.getElementById('conversation-tool').textContent =
            `Tool: ${conv.tool.charAt(0).toUpperCase() + conv.tool.slice(1)}`;

        document.getElementById('conversation-date').textContent =
            `Updated: ${this.formatDate(new Date(conv.conversation.updated))}`;

        document.getElementById('message-count').textContent =
            `${conv.metadata.message_count} messages`;

        // Render tags
        const tagsContainer = document.getElementById('conversation-tags');
        tagsContainer.innerHTML = '';
        if (conv.conversation.tags && conv.conversation.tags.length > 0) {
            conv.conversation.tags.forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.textContent = tag;
                tagsContainer.appendChild(tagEl);
            });
        }

        // Render messages
        this.renderMessages(conv.conversation.messages);

        // Render metadata
        this.renderMetadata(conv);

        // Show related insights in context panel
        if (this.contextPanel) {
            this.showRelatedInsights(id);
        }
    }

    /**
     * Show related insights for a conversation
     */
    showRelatedInsights(conversationId) {
        if (this.contextPanel) {
            this.contextPanel.showRelatedInsights(conversationId);
        }
    }

    /**
     * Render messages in the conversation
     */
    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        container.innerHTML = '';

        messages.forEach(msg => {
            const messageEl = this.createMessageElement(msg);
            if (messageEl.children.length > 0) {
                container.appendChild(messageEl);
            }
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Create a message element
     */
    createMessageElement(msg) {
        // Check if message has any visible content
        let hasVisibleContent = false;
        let contentHtml = '';

        // Handle different content types
        if (Array.isArray(msg.content)) {
            msg.content.forEach(item => {
                if (item.type === 'text' && item.text) {
                    contentHtml += this.formatMessageContent(item.text);
                    hasVisibleContent = true;
                } else if (item.type === 'tool_use' && item.name) {
                    contentHtml += `<div style="color: var(--text-secondary); font-style: italic;">🔧 Using tool: ${item.name}</div>`;
                    hasVisibleContent = true;
                }
                // Skip 'thinking' blocks - they're internal and not meant for display
            });
        } else if (typeof msg.content === 'string' && msg.content.trim()) {
            contentHtml = this.formatMessageContent(msg.content);
            hasVisibleContent = true;
        }

        // Skip rendering if no visible content
        if (!hasVisibleContent) {
            return document.createDocumentFragment(); // Return empty fragment
        }

        const div = document.createElement('div');
        div.className = `message ${msg.role}`;

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        // Add type label for non-standard message types
        if (msg.type !== msg.role) {
            const typeLabel = document.createElement('div');
            typeLabel.className = 'message-type-label';
            typeLabel.textContent = msg.type;
            bubble.appendChild(typeLabel);
        }

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = contentHtml;

        bubble.appendChild(content);

        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = this.formatTime(new Date(msg.timestamp));
        bubble.appendChild(timestamp);

        div.appendChild(bubble);
        return div;
    }

    /**
     * Format message content with basic markdown
     */
    formatMessageContent(text) {
        // Basic markdown-like formatting
        let formatted = this.escapeHtml(text);

        // Code blocks
        formatted = formatted.replace(/```([^`]+)```/g, '<pre>$1</pre>');

        // Bold
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    /**
     * Render conversation metadata
     */
    renderMetadata(conv) {
        const container = document.getElementById('metadata-content');
        container.innerHTML = `
            <div class="metadata-section">
                <h4>Sync Information</h4>
                <div class="metadata-item">
                    <span class="metadata-label">First Synced</span>
                    <span class="metadata-value">${this.formatDate(new Date(conv.metadata.first_synced))}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Last Synced</span>
                    <span class="metadata-value">${this.formatDate(new Date(conv.metadata.last_synced))}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Message Count</span>
                    <span class="metadata-value">${conv.metadata.message_count}</span>
                </div>
            </div>

            <div class="metadata-section">
                <h4>Conversation Details</h4>
                <div class="metadata-item">
                    <span class="metadata-label">ID</span>
                    <span class="metadata-value">${conv.conversation.id.substring(0, 8)}...</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Tool</span>
                    <span class="metadata-value">${conv.tool}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Model</span>
                    <span class="metadata-value">${conv.conversation.model || 'N/A'}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Created</span>
                    <span class="metadata-value">${this.formatDate(new Date(conv.conversation.created))}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Updated</span>
                    <span class="metadata-value">${this.formatDate(new Date(conv.conversation.updated))}</span>
                </div>
            </div>

            <div class="metadata-section">
                <h4>Archive Path</h4>
                <div class="metadata-path">${conv.metadata.archive_path}</div>
            </div>

            ${conv.conversation.project_path ? `
                <div class="metadata-section">
                    <h4>Project Path</h4>
                    <div class="metadata-path">${conv.conversation.project_path}</div>
                </div>
            ` : ''}
        `;
    }

    /**
     * Get all conversations
     */
    getAllConversations() {
        return this.conversations;
    }

    /**
     * Format date
     */
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Format time
     */
    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
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

        return this.formatDate(date);
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
