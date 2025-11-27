# AI Memory Hub

A unified, visually appealing web application for exploring AI conversation archives and synthesized insights. Combines conversation browsing with advanced insight visualization and bi-directional linking between conversations and insights.

## Features

### Conversations Tab
- **iMessage-Style Interface**: Clean message bubbles for easy reading
- **Multi-Tool Support**: Browse conversations from Claude and Gemini
- **Real-time Filtering**: Filter by tool (Claude/Gemini) and search by title/tags
- **Detailed Metadata**: View sync history, timestamps, model info, and file paths
- **Statistics Dashboard**: Total conversations, messages, and sync status
- **Bi-directional Linking**: Hover over conversations to see related insights

### Insights Tab
- **Dashboard Metrics**: Total insights, recent activity, active categories
- **Recent Memories**: 5 most recent insights with timestamps
- **Interactive Topic Cloud**: Sized by frequency, hover to see child insights
  - Relevancy sorting: Recency, Strength, or Weakness
  - Displays up to 10 most relevant insights per topic
- **D3.js Timeline Graph**: Visualize insights over time by category
  - X-axis: Source chat timestamp (primary)
  - Hover shows insight details with generation time as tag
  - Interactive: click to view insight details
- **Category Breakdown Chart**: Interactive donut chart showing insight distribution
  - Click segments to filter insights table
  - Hover for count and percentage
- **Sortable Insights Table**: Full searchable, filterable table
  - Search across content, category, and source
  - Filter by category and source
  - Sort by any column
- **Bi-directional Linking**: Hover over insights to see source conversations

### Design & User Experience
- **Dark Mode by Default**: Professional dark theme with toggle switch
- **Subtle & Professional Polish**: 0.3s smooth transitions, gentle hover effects
- **Responsive Design**: Works on desktop and tablet
- **Floating Context Panel**: Bi-directional links appear on hover
  - Pin to keep open
  - Click items to navigate between tabs
- **Topic Popup**: Shows hierarchical insights when hovering over topics

## Quick Start

### Prerequisites

- The **ai-memory-sync** project must be set up and have synced conversations
- The **ai-insight-synthesizer** must have generated insights
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (required for loading JSON files)

### Installation

The viewer is already set up in the `ai-memory-hub` directory. You just need to serve it.

### Running the Hub

You need to serve the files using a local web server.

#### Option 1: Python (Recommended)

```bash
# Navigate to the Scripts directory
cd "C:\Users\bgarr\OneDrive\Documents\Scripts"

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open: http://localhost:8000/ai-memory-hub/

#### Option 2: Node.js (http-server)

```bash
# Install globally
npm install -g http-server

# Navigate to Scripts directory and run
cd "C:\Users\bgarr\OneDrive\Documents\Scripts"
http-server -p 8000
```

Then open: http://localhost:8000/ai-memory-hub/

#### Option 3: VS Code Live Server Extension

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html` in the ai-memory-hub directory
3. Select "Open with Live Server"

## Usage Guide

### Conversations Tab

1. **Browse Conversations**:
   - Conversations appear in the sidebar, sorted by most recent
   - Click any conversation to view its messages

2. **Filter & Search**:
   - Use the tool filters (All/Claude/Gemini) to narrow down
   - Type in the search box to find conversations by title or tags

3. **View Messages**:
   - Messages appear as bubbles (user messages on right, assistant on left)
   - Timestamps show when each message was sent

4. **See Related Insights**:
   - Hover over a conversation item or view a conversation
   - The context panel slides in showing related insights
   - Click an insight to navigate to the Insights tab

5. **View Metadata**:
   - Click "Show Metadata" to see detailed conversation information
   - Includes sync history, conversation IDs, model info, file paths

### Insights Tab

1. **Dashboard Overview**:
   - See total insights, recent activity, and active categories at a glance

2. **Recent Memories**:
   - View the 5 most recent insights
   - Hover to see source conversations in the context panel

3. **Topic Cloud**:
   - Topics are sized by frequency (larger = more insights)
   - **Relevancy Buttons**: Change sorting of child insights
     - **Recency**: Sort by source chat timestamp (most recent first)
     - **Strength**: Sort by insight confidence (strongest first)
     - **Weakness**: Sort by insight confidence (weakest first)
   - Hover over a topic to see a popup with up to 10 child insights
   - Click a topic to filter the insights table to that category

4. **Category Breakdown Chart**:
   - Interactive donut chart showing insight distribution
   - Hover over segments to see count and percentage
   - Click a segment to filter the insights table

5. **Timeline Graph**:
   - Visualize when insights were sourced from conversations
   - **X-axis**: Source chat timestamp (when conversation occurred)
   - **Y-axis**: Categories
   - Hover over points to see:
     - Insight content preview
     - Source time (primary)
     - Generated tag (when insight was created)
     - Category and strength
   - Click points to view insight details

6. **Insights Table**:
   - **Search**: Type to search across content, category, and source
   - **Filter**: Use dropdowns to filter by category or source
   - **Sort**: Click column headers to sort
   - **Hover**: Hover over rows to see source conversations in context panel
   - **Click**: Click rows to scroll to filtered view

### Context Panel (Bi-directional Linking)

The context panel creates powerful links between conversations and insights:

> Insight data preloads automatically, so related insights appear as soon as you hover conversations.

**From Conversations → Insights**:
- Hover over conversation items or view a conversation
- Panel shows related insights from that conversation
- Click insights to navigate to Insights tab

**From Insights → Conversations**:
- Hover over insights in Recent Memories, Table, or Timeline
- Panel shows source conversations for that insight
- Click conversations to navigate to Conversations tab

**Panel Controls**:
- **Pin (📌)**: Click to keep panel open when moving mouse away
- **Close (×)**: Click to hide panel
- Panel auto-hides after 500ms when unpinned

### Theme Toggle

- **Light/Dark Switch**: Located in the header
- Toggle to switch between light and dark modes
- **Default**: Dark mode
- Theme preference is saved in browser localStorage

## Project Structure

```
ai-memory-hub/
├── index.html              # Main application entry point
├── styles.css              # Unified stylesheet with dark mode
├── app.js                  # Main application controller
├── modules/
│   ├── conversations.js    # Conversation viewing module
│   ├── insights.js         # Insights visualization module
│   ├── theme.js            # Theme management
│   └── contextPanel.js     # Bi-directional linking panel
└── README.md               # This file
```

## Data Sources

The application reads from:
- **Conversations**: `../ai-memory-sync/sync-status.json` and conversation archives
- **Insights**: `../ai-memory-sync/state/insights/insights.json` (primary)
  - Fallback: `../ai-insight-synthesizer/state/insights.json`

## Customization

### Colors

Edit CSS variables in `styles.css`:

```css
/* Dark Mode */
[data-theme="dark"] {
    --primary-color: #0A84FF;      /* Main accent color */
    --claude-color: #F59E0B;       /* Claude tag color */
    --gemini-color: #A78BFA;       /* Gemini tag color */
    --sidebar-bg: #1C1C1E;         /* Sidebar background */
    --main-bg: #000000;            /* Main background */
    /* ... more colors ... */
}
```

### Layout

Key layout dimensions in `styles.css`:
- Sidebar width: `350px` (line ~381)
- Context panel width: `350px` (line ~1009)
- Message bubble max-width: `70%` (line ~625)
- App header height: `60px` (line ~137)
- Tab navigation height: `50px` (line ~186)

## Troubleshooting

### "Error loading data" message

- Ensure ai-memory-sync has run at least once
- Check that `sync-status.json` exists in the ai-memory-sync directory
- Verify you're using a web server (not file:// protocol)
- Check browser console (F12) for specific errors

### Conversations not showing

- Verify JSON files exist in the archive directory
- Check file paths in sync-status.json are correct
- Ensure conversation JSON files are valid

### Insights not loading

- Check that insights.json exists in either:
  - `ai-memory-sync/state/insights/insights.json`
  - `ai-insight-synthesizer/state/insights.json`
- Verify the JSON structure is correct

### D3 visualizations not rendering

- Ensure you have internet connection (D3.js loads from CDN)
- Check browser console for D3 errors
- Verify insights data has required fields (chat_timestamp, category, etc.)

### Context panel not appearing

- Context panel only appears when hovering if:
  - There are related insights/conversations to show
  - Panel is not already pinned
- Try pinning the panel and manually checking data

### Theme not persisting

- Check browser localStorage is enabled
- Clear browser cache and reload
- Manually set theme preference in localStorage

## Browser Support

- **Chrome/Edge**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support (macOS)
- **IE11**: ❌ Not supported

## Performance Notes

- **Large datasets**: The application handles thousands of insights efficiently
- **D3 rendering**: Initial render may take 1-2 seconds for very large datasets
- **Context panel**: Hover delays prevent performance issues from rapid mouse movement
- **Tab switching**: Modules load lazily (only when first accessed)

## Technical Details

### Dependencies

- **D3.js v7**: Loaded from CDN for visualizations
- **No build process**: Pure HTML/CSS/JavaScript (ES6 modules)

### Browser APIs Used

- Fetch API (for loading JSON)
- LocalStorage (for theme persistence)
- ES6 Modules (for code organization)
- CSS Custom Properties (for theming)

### Architecture

- **Modular Design**: Each major feature is its own ES6 module
- **Event-Driven**: Modules communicate through event listeners and callbacks
- **Lazy Loading**: Tab content loads only when first accessed
- **Responsive**: Uses CSS Grid and Flexbox for responsive layouts

## Future Enhancements

Potential features for future versions:
- **Global Search**: Search across both conversations and insights simultaneously
- **Export Functionality**: Export conversations to Markdown, insights to CSV/JSON
- **Advanced Analytics**: Combined stats from conversations and insights
- **Timeline Sync**: Link conversation timeline with insight timeline
- **Network Visualization**: Show relationships between insights and conversations
- **Filters**: More advanced filtering options (date ranges, strength thresholds)
- **Bookmarks**: Save favorite conversations or insights
- **Notes**: Add personal notes to conversations or insights

## License

This project is part of the ai-memory-sync ecosystem.

## Contributing

Found a bug or have a feature request? Feel free to modify and enhance!

## Acknowledgments

- **ai-memory-viewer**: Source for conversation browsing interface
- **ai-memory-visualizer**: Source for insights dashboard and timeline
- **D3.js**: Data visualization library
- **Claude Code**: Development assistance

---

**Version**: 1.0.0
**Last Updated**: November 2025
**Author**: Built with Claude Code
