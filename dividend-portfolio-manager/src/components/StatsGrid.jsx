// src/components/StatsGrid.jsx
import { For, Show, createMemo } from 'solid-js';

function StatsGrid(props) {
    // Get account context information
    const getAccountContext = () => {
        const account = props.selectedAccount?.();
        if (!account) return null;
        
        return {
            viewMode: account.viewMode,
            personName: account.personName,
            label: account.label,
            isAggregated: account.viewMode === 'all' || (account.viewMode === 'person' && account.aggregate)
        };
    };

    // Get display text for account context
    const getAccountContextText = () => {
        const context = getAccountContext();
        if (!context) return null;
        
        switch (context.viewMode) {
            case 'all':
                return 'All Accounts (Everyone)';
            case 'person':
                return `${context.personName}${context.isAggregated ? ' (All Accounts)' : ''}`;
            case 'account':
                return context.label;
            default:
                return null;
        }
    };

    // Get context badge type
    const getContextBadgeType = () => {
        const context = getAccountContext();
        if (!context) return null;
        
        if (context.viewMode === 'all') return 'global';
        if (context.viewMode === 'person') return 'person';
        if (context.viewMode === 'account') return 'account';
        return null;
    };

    // Get context icon
    const getContextIcon = () => {
        const context = getAccountContext();
        if (!context) return null;
        
        if (context.viewMode === 'all') return '🌐';
        if (context.viewMode === 'person') return '👤';
        if (context.viewMode === 'account') return '🏦';
        return null;
    };

    // Check if showing aggregated data
    const isShowingAggregatedData = () => {
        const context = getAccountContext();
        return context?.isAggregated || false;
    };

    // Get aggregation note
    const getAggregationNote = () => {
        const context = getAccountContext();
        if (!context?.isAggregated) return null;
        
        if (context.viewMode === 'all') return 'Combined across all persons and accounts';
        if (context.viewMode === 'person') return `Combined across ${context.personName}'s accounts`;
        return null;
    };

    // Enhanced stats with additional metadata
    const enhancedStats = createMemo(() => {
        const stats = props.stats || [];
        const context = getAccountContext();
        
        return stats.map((stat, index) => ({
            ...stat,
            id: `stat-${index}`,
            contextSensitive: true,
            aggregated: context?.isAggregated || false
        }));
    });

    return (
        <div class="stats-grid">
            {/* Account Context Banner */}
            <Show when={getAccountContextText()}>
                <div class={`account-context-banner badge-${getContextBadgeType()}`}>
                    <div class="context-main">
                        <span class="context-icon">{getContextIcon()}</span>
                        <span class="context-text">Viewing: {getAccountContextText()}</span>
                        <Show when={isShowingAggregatedData()}>
                            <span class="aggregation-badge">AGGREGATED</span>
                        </Show>
                    </div>
                    <Show when={getAggregationNote()}>
                        <div class="context-note">
                            <span class="note-icon">💡</span>
                            <span class="note-text">{getAggregationNote()}</span>
                        </div>
                    </Show>
                </div>
            </Show>
            
            {/* Stats Cards */}
            <For each={enhancedStats()}>
                {stat => (
                    <div class={`stat-card ${stat.aggregated ? 'aggregated' : ''}`}>
                        <div class="stat-header">
                            <div class="stat-info">
                                <div class="stat-icon" style={{ 
                                    background: `linear-gradient(135deg, ${stat.background}, ${stat.background}dd)` 
                                }}>
                                    {stat.icon}
                                </div>
                                <div class="stat-title-section">
                                    <div class="stat-title">{stat.title}</div>
                                    <Show when={stat.aggregated}>
                                        <div class="stat-context">
                                            <span class="context-indicator">🔗</span>
                                            <span class="context-label">Combined</span>
                                        </div>
                                    </Show>
                                </div>
                            </div>
                            <div class="stat-trend">
                                <Show when={stat.positive !== undefined}>
                                    <div class={`trend-indicator ${stat.positive ? 'positive' : 'negative'}`}>
                                        {stat.positive ? '↗' : '↘'}
                                    </div>
                                </Show>
                                <div class="sparkline"></div>
                            </div>
                        </div>
                        
                        <div class={`stat-value ${stat.positive ? 'positive' : stat.positive === false ? 'negative' : ''}`}>
                            {stat.value}
                        </div>
                        
                        <div class={`stat-subtitle ${stat.positive ? 'positive' : stat.positive === false ? 'negative' : ''}`}>
                            {stat.subtitle}
                        </div>
                        
                        {/* Progress bar for positive values */}
                        <Show when={stat.positive}>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 75%"></div>
                            </div>
                        </Show>

                        {/* Aggregation details */}
                        <Show when={stat.aggregated && stat.details}>
                            <div class="stat-details">
                                <For each={stat.details}>
                                    {detail => (
                                        <div class="detail-item">
                                            <span class="detail-label">{detail.label}:</span>
                                            <span class="detail-value">{detail.value}</span>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </Show>

                        {/* Hover overlay for additional info */}
                        <div class="stat-overlay">
                            <Show when={isShowingAggregatedData()}>
                                <div class="overlay-content">
                                    <div class="overlay-title">Aggregated Data</div>
                                    <div class="overlay-text">
                                        {getAggregationNote()}
                                    </div>
                                </div>
                            </Show>
                        </div>
                    </div>
                )}
            </For>

            {/* Summary Card for Aggregated Views */}
            <Show when={isShowingAggregatedData() && enhancedStats().length > 0}>
                <div class="summary-card">
                    <div class="summary-header">
                        <span class="summary-icon">📊</span>
                        <span class="summary-title">Portfolio Summary</span>
                    </div>
                    <div class="summary-content">
                        <div class="summary-row">
                            <span class="summary-label">View Scope:</span>
                            <span class="summary-value">{getAccountContextText()}</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">Data Type:</span>
                            <span class="summary-value aggregated-text">
                                <span class="agg-icon">🔗</span>
                                Aggregated
                            </span>
                        </div>
                        <Show when={getAccountContext()?.viewMode === 'all'}>
                            <div class="summary-row">
                                <span class="summary-label">Coverage:</span>
                                <span class="summary-value">All persons & accounts</span>
                            </div>
                        </Show>
                    </div>
                </div>
            </Show>
        </div>
    );
}

export default StatsGrid;