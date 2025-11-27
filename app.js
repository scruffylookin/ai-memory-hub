// AI Memory Hub - Main Application Controller
// Orchestrates all modules and manages tab navigation

import { ThemeManager } from './modules/theme.js';
import { ConversationsModule } from './modules/conversations.js';
import { InsightsModule } from './modules/insights.js';
import { ContextPanel } from './modules/contextPanel.js';

class AIMemoryHub {
    constructor() {
        this.currentTab = 'conversations';
        this.themeManager = null;
        this.conversationsModule = null;
        this.insightsModule = null;
        this.contextPanel = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing AI Memory Hub...');

        // Initialize theme manager first (for immediate dark mode)
        this.themeManager = new ThemeManager();
        this.themeManager.init();

        // Initialize context panel
        this.contextPanel = new ContextPanel();

        // Set up tab navigation
        this.setupTabNavigation();

        // Load initial tab (conversations)
        await this.loadTab('conversations');

        // Preload insights data so context panel links are ready immediately
        await this.preloadInsights();

        console.log('AI Memory Hub initialized successfully!');
    }

    /**
     * Set up tab navigation event listeners
     */
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const targetTab = e.target.dataset.tab;
                if (targetTab !== this.currentTab) {
                    await this.switchTab(targetTab);
                }
            });
        });
    }

    /**
     * Switch to a specific tab
     */
    async switchTab(tabName) {
        console.log(`Switching to ${tabName} tab...`);

        // Update button states
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.classList.add('hidden');
        });

        // Show target tab content
        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) {
            targetContent.classList.remove('hidden');
            targetContent.classList.add('active');
        }

        // Load tab if not already loaded
        if (tabName !== this.currentTab) {
            await this.loadTab(tabName);
        }

        this.currentTab = tabName;
    }

    /**
     * Load and initialize a specific tab
     */
    async loadTab(tabName, options = {}) {
        const { render = true, silent = false } = options;

        try {
            if (tabName === 'conversations' && !this.conversationsModule) {
                console.log('Loading conversations module...');
                const container = document.getElementById('conversations-tab');
                this.conversationsModule = new ConversationsModule(container, this.contextPanel);
                await this.conversationsModule.init();

                // Set module reference in context panel
                this.contextPanel.setModules(this.conversationsModule, this.insightsModule);

                console.log('Conversations module loaded successfully!');

            } else if (tabName === 'insights') {
                if (!this.insightsModule) {
                console.log('Loading insights module...');
                const container = document.getElementById('insights-tab');
                this.insightsModule = new InsightsModule(container, this.contextPanel);
                    await this.insightsModule.init({ render });

                // Set module reference in context panel
                this.contextPanel.setModules(this.conversationsModule, this.insightsModule);

                console.log('Insights module loaded successfully!');
                } else if (render) {
                    this.insightsModule.renderIfNeeded();
                }
            }
        } catch (error) {
            console.error(`Error loading ${tabName} tab:`, error);
            if (!silent) {
                this.showError(`Failed to load ${tabName}. Please check your data sources.`);
            }
        }
    }

    /**
     * Show error message to user
     */
    showError(message) {
        // Create error toast or notification
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: var(--error-color);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-size: 14px;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    /**
     * Preload insights data without rendering visuals (avoids layout issues while hidden)
     */
    async preloadInsights() {
        try {
            await this.loadTab('insights', { render: false, silent: true });
        } catch (error) {
            console.warn('Insights preload failed:', error);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new AIMemoryHub();
    app.init().catch(error => {
        console.error('Failed to initialize AI Memory Hub:', error);
    });
});
