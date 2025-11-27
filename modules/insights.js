// Insights Module
// Handles insights visualization and analysis

export class InsightsModule {
    constructor(container, contextPanel) {
        this.container = container;
        this.contextPanel = contextPanel;
        this.insights = [];
        this.sortMode = 'recency'; // recency | strength | weakness
        this.currentSortColumn = 'last_seen';
        this.currentSortDirection = 'desc';
        this.categoryColors = {};
        this.isRendered = false;
    }

    /**
     * Initialize and load insights
     */
    async init({ render = true } = {}) {
        await this.loadData();
        this.setupEventListeners();
        if (render) {
            this.render();
            this.isRendered = true;
        } else {
            this.isRendered = false;
        }
    }

    /**
     * Load insights data
     */
    async loadData() {
        try {
            // Try primary path first, then fallback
            let response;
            try {
                response = await fetch('../ai-memory-sync/state/insights/insights.json');
                if (!response.ok) throw new Error('Primary path failed');
            } catch (e) {
                response = await fetch('../ai-insight-synthesizer/state/insights.json');
            }

            const data = await response.json();
            this.insights = Object.keys(data.insights).map(key => ({
                id: key,
                ...data.insights[key]
            }));

            // Generate category colors
            this.generateCategoryColors();

        } catch (error) {
            console.error('Error loading insights:', error);
            this.insights = [];
        }
    }

    /**
     * Generate consistent colors for categories
     */
    generateCategoryColors() {
        const categories = [...new Set(this.insights.map(i => i.category))];
        const colors = [
            '#0A84FF', '#FF453A', '#30D158', '#FF9F0A', '#BF5AF2',
            '#5E5CE6', '#00C7BE', '#FF375F', '#FFD60A'
        ];

        categories.forEach((cat, idx) => {
            this.categoryColors[cat] = colors[idx % colors.length];
        });
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Relevancy toggle buttons
        document.querySelectorAll('.relevancy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.relevancy-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.sortMode = e.target.dataset.mode;
                this.renderTopicCloud();
            });
        });

        // Search and filter controls
        const searchInput = document.getElementById('insights-search-input');
        const categoryFilter = document.getElementById('category-filter');
        const sourceFilter = document.getElementById('source-filter');

        if (searchInput) {
            searchInput.addEventListener('keyup', () => this.filterTable());
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterTable());
        }

        if (sourceFilter) {
            sourceFilter.addEventListener('change', () => this.filterTable());
        }

        // Topic popup close
        const topicPopupClose = document.getElementById('topic-popup-close');
        if (topicPopupClose) {
            topicPopupClose.addEventListener('click', () => {
                this.hideTopicPopup();
            });
        }
    }

    /**
     * Render all insight visualizations
     */
    render() {
        this.renderMetrics();
        this.renderRecentMemories();
        this.renderTopicCloud();
        this.renderCategoryChart();
        this.renderTimelineGraph();
        this.renderTable();
        this.populateFilters();
        this.isRendered = true;
    }

    /**
     * Render dashboard metrics
     */
    renderMetrics() {
        document.getElementById('total-insights').textContent = this.insights.length;

        // Calculate recent insights (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentCount = this.insights.filter(i =>
            new Date(i.chat_timestamp) >= sevenDaysAgo
        ).length;
        document.getElementById('recent-insights').textContent = recentCount;

        // Active categories
        const activeCategories = new Set(this.insights.map(i => i.category)).size;
        document.getElementById('active-categories').textContent = activeCategories;
    }

    /**
     * Render lazily if not yet rendered
     */
    renderIfNeeded() {
        if (!this.isRendered) {
            this.render();
        }
    }

    /**
     * Render recent memories list
     */
    renderRecentMemories() {
        const list = document.getElementById('recent-memories-list');
        list.innerHTML = '';

        const sortedByLastSeen = [...this.insights]
            .sort((a, b) => new Date(b.chat_timestamp) - new Date(a.chat_timestamp))
            .slice(0, 5);

        sortedByLastSeen.forEach(insight => {
            const listItem = document.createElement('li');
            const formattedDate = this.formatRelativeTime(new Date(insight.chat_timestamp));
            listItem.innerHTML = `<span class="content">${this.escapeHtml(insight.content)}</span><span class="timestamp">${formattedDate}</span>`;

            // Add hover for context panel
            listItem.addEventListener('mouseenter', () => {
                if (this.contextPanel && !this.contextPanel.isPinned()) {
                    this.showSourceConversations(insight);
                }
            });

            listItem.addEventListener('click', () => {
                this.showInsightDetails(insight);
            });

            list.appendChild(listItem);
        });
    }

    /**
     * Render topic cloud with hierarchical display
     */
    renderTopicCloud() {
        const container = document.getElementById('topic-cloud-container');
        container.innerHTML = '';

        // Count insights per category
        const topicCounts = this.insights.reduce((acc, insight) => {
            if (insight.category) {
                acc[insight.category] = (acc[insight.category] || 0) + 1;
            }
            return acc;
        }, {});

        const maxCount = Math.max(...Object.values(topicCounts));

        Object.keys(topicCounts).forEach(topic => {
            const span = document.createElement('span');
            span.className = 'topic-tag';
            span.textContent = topic;

            // Size based on count
            const fontSize = 1 + (topicCounts[topic] / maxCount) * 1.5;
            span.style.fontSize = `${fontSize}em`;
            span.style.backgroundColor = this.categoryColors[topic] || '#0A84FF';

            // Add hover event to show child insights
            span.addEventListener('mouseenter', () => {
                this.showTopicPopup(topic);
            });

            span.addEventListener('click', () => {
                this.filterByCategory(topic);
            });

            container.appendChild(span);
        });
    }

    /**
     * Show topic popup with child insights
     */
    showTopicPopup(category) {
        const popup = document.getElementById('topic-popup');
        const title = document.getElementById('topic-popup-title');
        const content = document.getElementById('topic-popup-content');

        title.textContent = category;
        content.innerHTML = '';

        // Get insights for this category
        const categoryInsights = this.insights.filter(i => i.category === category);

        // Sort based on current mode
        const sorted = this.sortInsightsByMode(categoryInsights, this.sortMode);

        // Limit to reasonable number (10)
        const limited = sorted.slice(0, 10);

        limited.forEach(insight => {
            const item = document.createElement('div');
            item.className = 'topic-insight-item';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'topic-insight-content';
            contentDiv.textContent = insight.content;

            const metaDiv = document.createElement('div');
            metaDiv.className = 'topic-insight-meta';

            const timestamp = this.formatRelativeTime(new Date(insight.chat_timestamp));
            const strength = (insight.strength * 100).toFixed(0);

            metaDiv.innerHTML = `
                <span>${timestamp}</span>
                <span class="topic-insight-strength">Strength: ${strength}%</span>
            `;

            item.appendChild(contentDiv);
            item.appendChild(metaDiv);

            // Add click to navigate
            item.addEventListener('click', () => {
                this.showInsightDetails(insight);
                this.hideTopicPopup();
            });

            // Add hover for context panel
            item.addEventListener('mouseenter', () => {
                if (this.contextPanel && !this.contextPanel.isPinned()) {
                    this.showSourceConversations(insight);
                }
            });

            content.appendChild(item);
        });

        popup.classList.remove('hidden');
        popup.classList.add('visible');
    }

    /**
     * Hide topic popup
     */
    hideTopicPopup() {
        const popup = document.getElementById('topic-popup');
        popup.classList.remove('visible');
        popup.classList.add('hidden');
    }

    /**
     * Sort insights by mode (recency, strength, weakness)
     */
    sortInsightsByMode(insights, mode) {
        return [...insights].sort((a, b) => {
            switch (mode) {
                case 'recency':
                    return new Date(b.chat_timestamp) - new Date(a.chat_timestamp);
                case 'strength':
                    return b.strength - a.strength;
                case 'weakness':
                    return a.strength - b.strength;
                default:
                    return 0;
            }
        });
    }

    /**
     * Render D3 category breakdown chart (donut)
     */
    renderCategoryChart() {
        const container = document.getElementById('category-chart');
        container.innerHTML = '';

        if (this.insights.length === 0) return;

        // Count insights by category
        const categoryCount = d3.rollup(
            this.insights,
            v => v.length,
            d => d.category
        );

        const data = Array.from(categoryCount, ([category, count]) => ({ category, count }));

        // Chart dimensions
        const width = 300;
        const height = 300;
        const radius = Math.min(width, height) / 2;

        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        // Pie generator
        const pie = d3.pie()
            .value(d => d.count)
            .sort(null);

        // Arc generator
        const arc = d3.arc()
            .innerRadius(radius * 0.5)  // Donut chart
            .outerRadius(radius * 0.8);

        const arcHover = d3.arc()
            .innerRadius(radius * 0.5)
            .outerRadius(radius * 0.85);

        // Draw arcs
        const arcs = svg.selectAll('arc')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'arc');

        const moduleRef = this;

        arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => this.categoryColors[d.data.category] || '#0A84FF')
            .attr('stroke', 'var(--border-color)')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .attr('d', arcHover);

                // Show tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'd3-tooltip visible';
                tooltip.innerHTML = `
                    <div class="d3-tooltip-title">${d.data.category}</div>
                    <div class="d3-tooltip-content">Count: ${d.data.count} (${((d.data.count / moduleRef.insights.length) * 100).toFixed(1)}%)</div>
                `;
                tooltip.style.left = event.pageX + 'px';
                tooltip.style.top = event.pageY + 'px';
                document.body.appendChild(tooltip);
            })
            .on('mouseout', (event) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .attr('d', arc);

                // Remove tooltip
                document.querySelectorAll('.d3-tooltip').forEach(t => t.remove());
            })
            .on('click', (event, d) => {
                this.filterByCategory(d.data.category);
            });

        // Add labels
        arcs.append('text')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .text(d => d.data.count > 2 ? d.data.category : '');
    }

    /**
     * Render D3 timeline graph
     */
    renderTimelineGraph() {
        const container = document.getElementById('timeline-graph');
        container.innerHTML = '';

        if (this.insights.length === 0) return;

        // Chart dimensions
        const margin = { top: 20, right: 30, bottom: 60, left: 150 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // X scale: Source time (chat_timestamp)
        const xScale = d3.scaleTime()
            .domain(d3.extent(this.insights, d => new Date(d.chat_timestamp)))
            .range([0, width]);

        // Y scale: Categories
        const categories = [...new Set(this.insights.map(i => i.category))];
        const yScale = d3.scaleBand()
            .domain(categories)
            .range([0, height])
            .padding(0.2);

        // Add X axis
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale)
                .ticks(6)
                .tickFormat(d3.timeFormat('%b %d')));

        // Add Y axis
        svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yScale));

        // Plot insights as circles
        svg.selectAll('circle')
            .data(this.insights)
            .enter()
            .append('circle')
            .attr('cx', d => xScale(new Date(d.chat_timestamp)))
            .attr('cy', d => yScale(d.category) + yScale.bandwidth() / 2)
            .attr('r', 5)
            .attr('fill', d => this.categoryColors[d.category] || '#0A84FF')
            .attr('opacity', 0.7)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                // Show tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'd3-tooltip visible';
                tooltip.innerHTML = `
                    <div class="d3-tooltip-title">${this.escapeHtml(d.content.substring(0, 60))}...</div>
                    <div class="d3-tooltip-content">
                        <strong>Source:</strong> ${this.formatDate(new Date(d.chat_timestamp))}<br>
                        <span class="d3-tooltip-tag">Generated: ${this.formatDate(new Date(d.last_seen))}</span><br>
                        <strong>Category:</strong> ${d.category}<br>
                        <strong>Strength:</strong> ${(d.strength * 100).toFixed(0)}%
                    </div>
                `;
                tooltip.style.left = event.pageX + 10 + 'px';
                tooltip.style.top = event.pageY + 10 + 'px';
                document.body.appendChild(tooltip);
            })
            .on('mouseout', () => {
                document.querySelectorAll('.d3-tooltip').forEach(t => t.remove());
            })
            .on('click', (event, d) => {
                this.showInsightDetails(d);
            });
    }

    /**
     * Render insights table
     */
    renderTable() {
        this.filterTable(); // Initial render with no filters
    }

    /**
     * Populate filter dropdowns
     */
    populateFilters() {
        const categoryFilter = document.getElementById('category-filter');
        const sourceFilter = document.getElementById('source-filter');

        // Populate categories
        const categories = [...new Set(this.insights.map(i => i.category))].sort();
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });

        // Populate sources
        const sources = [...new Set(
            this.insights
                .map(i => i.evidence && i.evidence.length > 0 ? i.evidence[0].split('/')[0] : null)
                .filter(Boolean)
        )].sort();

        sources.forEach(src => {
            const option = document.createElement('option');
            option.value = src;
            option.textContent = src;
            sourceFilter.appendChild(option);
        });
    }

    /**
     * Filter table based on search and filter inputs
     */
    filterTable() {
        const searchTerm = document.getElementById('insights-search-input').value.toLowerCase();
        const selectedCategory = document.getElementById('category-filter').value;
        const selectedSource = document.getElementById('source-filter').value;

        const filteredInsights = this.insights.filter(insight => {
            const source = insight.evidence && insight.evidence.length > 0 ? insight.evidence[0].split('/')[0] : '';

            const matchesCategory = !selectedCategory || insight.category === selectedCategory;
            const matchesSource = !selectedSource || source === selectedSource;
            const matchesSearch = !searchTerm ||
                insight.content.toLowerCase().includes(searchTerm) ||
                insight.category.toLowerCase().includes(searchTerm) ||
                source.toLowerCase().includes(searchTerm);

            return matchesCategory && matchesSource && matchesSearch;
        });

        this.renderTableContent(filteredInsights);
    }

    /**
     * Render table content
     */
    renderTableContent(insights) {
        const container = document.getElementById('insights-table-container');
        container.innerHTML = '';

        const table = document.createElement('table');
        table.className = 'insights-table';

        // Create header
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const columns = [
            { key: 'content', label: 'Insight', sortable: true },
            { key: 'category', label: 'Category', sortable: true },
            { key: 'strength', label: 'Strength', sortable: true },
            { key: 'source', label: 'Source', sortable: false },
            { key: 'chat_timestamp', label: 'Source Time', sortable: true },
            { key: 'occurrence_count', label: 'Count', sortable: true }
        ];

        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.label;
            if (col.sortable) {
                th.classList.add('sortable');
                th.addEventListener('click', () => this.sortTable(col.key, insights));
                if (col.key === this.currentSortColumn) {
                    th.classList.add(this.currentSortDirection);
                }
            }
            headerRow.appendChild(th);
        });

        // Create body
        const tbody = table.createTBody();
        insights.forEach(insight => {
            const row = tbody.insertRow();

            // Add hover for context panel
            row.addEventListener('mouseenter', () => {
                if (this.contextPanel && !this.contextPanel.isPinned()) {
                    this.showSourceConversations(insight);
                }
            });

            row.addEventListener('click', () => {
                this.showInsightDetails(insight);
            });

            columns.forEach(col => {
                const cell = row.insertCell();
                if (col.key === 'source') {
                    cell.textContent = insight.evidence && insight.evidence.length > 0 ?
                        insight.evidence[0].split('/')[0] : '';
                } else if (col.key === 'chat_timestamp') {
                    cell.textContent = this.formatDate(new Date(insight.chat_timestamp));
                } else if (col.key === 'strength') {
                    cell.textContent = (insight.strength * 100).toFixed(0) + '%';
                } else {
                    cell.textContent = insight[col.key];
                }
            });
        });

        container.appendChild(table);
    }

    /**
     * Sort table by column
     */
    sortTable(columnKey, insights) {
        if (this.currentSortColumn === columnKey) {
            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSortColumn = columnKey;
            this.currentSortDirection = 'asc';
        }

        const sorted = [...insights].sort((a, b) => {
            let valA = a[columnKey];
            let valB = b[columnKey];

            if (columnKey === 'chat_timestamp' || columnKey === 'last_seen') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            } else if (typeof valA === 'string') {
                return this.currentSortDirection === 'asc' ?
                    valA.localeCompare(valB) : valB.localeCompare(valA);
            }

            if (valA < valB) return this.currentSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return this.currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderTableContent(sorted);
    }

    /**
     * Filter by category
     */
    filterByCategory(category) {
        document.getElementById('category-filter').value = category;
        this.filterTable();

        // Scroll to table
        document.getElementById('table-view').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Show source conversations for an insight
     */
    showSourceConversations(insight) {
        if (this.contextPanel) {
            this.contextPanel.showSourceConversations(insight);
        }
    }

    /**
     * Show insight details (could navigate to table or show modal)
     */
    showInsightDetails(insight) {
        // For now, filter by category and scroll to table
        this.filterByCategory(insight.category);
    }

    /**
     * Get all insights
     */
    getAllInsights() {
        return this.insights;
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
