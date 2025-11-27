// Theme Manager Module
// Handles theme switching and persistence

export class ThemeManager {
    constructor() {
        // Default to dark mode as per user preference
        this.theme = localStorage.getItem('theme') || 'dark';
    }

    /**
     * Initialize theme system
     */
    init() {
        this.apply();
        this.setupToggle();
    }

    /**
     * Apply current theme to document
     */
    apply() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateToggle();
    }

    /**
     * Toggle between light and dark themes
     */
    toggle() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', this.theme);
        this.apply();
    }

    /**
     * Set up theme toggle event listener
     */
    setupToggle() {
        const toggleCheckbox = document.getElementById('theme-toggle');
        if (toggleCheckbox) {
            toggleCheckbox.addEventListener('change', () => {
                this.toggle();
            });
        }
    }

    /**
     * Update toggle switch state to match current theme
     */
    updateToggle() {
        const toggleCheckbox = document.getElementById('theme-toggle');
        if (toggleCheckbox) {
            // Checked = dark mode
            toggleCheckbox.checked = (this.theme === 'dark');
        }
    }

    /**
     * Get current theme
     */
    getTheme() {
        return this.theme;
    }

    /**
     * Set specific theme
     */
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.theme = theme;
            localStorage.setItem('theme', this.theme);
            this.apply();
        }
    }
}
