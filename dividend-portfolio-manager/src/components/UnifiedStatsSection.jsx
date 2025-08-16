// src/components/UnifiedStatsSection.jsx - COMPACT VERSION
import { createSignal, onMount, onCleanup, For, Show, createMemo, createEffect } from 'solid-js';
import { fetchCashBalances } from '../api';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { formatCurrency, convertToCAD } from '../utils/helpers';

function UnifiedStatsSection(props) {
    const [cashData, setCashData] = createSignal(null);
    const [isExpanded, setIsExpanded] = createSignal(false);
    const [lastUpdate, setLastUpdate] = createSignal(null);
    const [hoveredCard, setHoveredCard] = createSignal(null);
    
    const { usdCadRate } = useExchangeRate();

    const formatCompactCurrency = (amount, currency = 'CAD') => {
        const value = Number(amount) || 0;
        if (value >= 1000000) {
            return `${currency === 'USD' ? '$' : 'C$'}${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${currency === 'USD' ? '$' : 'C$'}${(value / 1000).toFixed(0)}K`;
        }
        return `${currency === 'USD' ? '$' : 'C$'}${value.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const loadCashBalances = async () => {
        try {
            const data = await fetchCashBalances();
            setCashData(data || { accounts: [], summary: { totalAccounts: 0, totalPersons: 0, totalCAD: 0 } });
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Failed to load cash balances:', error);
            setCashData({ accounts: [], summary: { totalAccounts: 0, totalPersons: 0, totalCAD: 0 } });
        }
    };

    const processedCashData = createMemo(() => {
        const data = cashData();
        if (!data || !data.accounts) return null;

        let totalCAD = 0;
        let totalUSD = 0;

        data.accounts.forEach(account => {
            const currency = account.currency || 'CAD';
            const cashBalance = Number(account.cashBalance) || 0;

            if (currency === 'USD') {
                totalUSD += cashBalance;
            } else {
                totalCAD += cashBalance;
            }
        });

        const totalInCAD = totalCAD + convertToCAD(totalUSD, 'USD', usdCadRate());

        return {
            totalCAD,
            totalUSD,
            totalInCAD,
            accountCount: data.accounts?.length || 0
        };
    });

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

    const enhancedStats = createMemo(() => {
        const stats = props.stats || [];
        const cashInfo = processedCashData();
        const context = getAccountContext();
        
        return stats.map((stat, index) => {
            if (index === 0 && cashInfo) {
                return {
                    ...stat,
                    cashInfo: {
                        totalCash: cashInfo.totalInCAD,
                        breakdown: {
                            cad: cashInfo.totalCAD,
                            usd: cashInfo.totalUSD
                        }
                    },
                    showCashDetails: true
                };
            }
            
            return {
                ...stat,
                contextSensitive: true,
                aggregated: context?.isAggregated || false,
                showTrend: stat.positive !== undefined
            };
        });
    });

    onMount(() => {
        loadCashBalances();
        const interval = setInterval(loadCashBalances, 5 * 60 * 1000);
        
        onCleanup(() => {
            clearInterval(interval);
        });
    });

    return (
        <div class="compact-stats-section">
            {/* Compact Header - Single Row */}
            <div class="compact-stats-header">
                <div class="header-left">
                    <h3 class="compact-stats-title">Portfolio Overview</h3>
                    <div class="context-indicators">
                        <Show when={getAccountContext()?.isAggregated}>
                            <span class="compact-badge aggregated">🔗 Combined</span>
                        </Show>
                        <Show when={usdCadRate() && processedCashData()?.totalUSD > 0}>
                            <span class="compact-badge exchange">💱 {usdCadRate().toFixed(4)}</span>
                        </Show>
                    </div>
                </div>
                <div class="header-right">
                    <Show when={lastUpdate()}>
                        <span class="compact-update">
                            <span class="update-dot"></span>
                            {lastUpdate().toLocaleTimeString()}
                        </span>
                    </Show>
                    <button 
                        class="compact-toggle"
                        onClick={() => setIsExpanded(!isExpanded())}
                        title={isExpanded() ? 'Hide cash details' : 'Show cash details'}
                    >
                        {isExpanded() ? '💰' : '📊'}
                    </button>
                </div>
            </div>

            {/* Compact Stats Grid - Single Row */}
            <div class="compact-stats-grid">
                <For each={enhancedStats()}>
                    {(stat, index) => (
                        <div 
                            class={`compact-stat-card ${stat.aggregated ? 'aggregated' : ''} ${hoveredCard() === index() ? 'hovered' : ''}`}
                            onMouseEnter={() => setHoveredCard(index())}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div class="card-icon" style={{ background: stat.background }}>
                                {stat.icon}
                            </div>
                            
                            <div class="card-content">
                                <div class="card-header">
                                    <span class="card-title">{stat.title}</span>
                                    <Show when={stat.showTrend && stat.positive !== undefined}>
                                        <span class={`trend-icon ${stat.positive ? 'positive' : 'negative'}`}>
                                            {stat.positive ? '↗' : '↘'}
                                        </span>
                                    </Show>
                                </div>
                                
                                <div class={`card-value ${stat.positive ? 'positive' : stat.positive === false ? 'negative' : ''}`}>
                                    {stat.value}
                                </div>
                                
                                <div class="card-subtitle">
                                    {stat.subtitle}
                                </div>

                                {/* Compact Cash Integration */}
                                <Show when={stat.showCashDetails && stat.cashInfo}>
                                    <div class="compact-cash">
                                        <span class="cash-label">Cash:</span>
                                        <span class="cash-value">{formatCompactCurrency(stat.cashInfo.totalCash)}</span>
                                        <Show when={stat.cashInfo.breakdown.usd > 0}>
                                            <span class="cash-breakdown">
                                                (CAD: {formatCompactCurrency(stat.cashInfo.breakdown.cad)} + 
                                                USD: {formatCompactCurrency(stat.cashInfo.breakdown.usd, 'USD')})
                                            </span>
                                        </Show>
                                    </div>
                                </Show>
                            </div>

                            {/* Hover tooltip */}
                            <Show when={stat.tooltip}>
                                <div class="card-tooltip">{stat.tooltip}</div>
                            </Show>
                        </div>
                    )}
                </For>
            </div>

            {/* Expandable Cash Details - Only when expanded */}
            <Show when={isExpanded() && processedCashData()}>
                <div class="compact-cash-details">
                    <div class="cash-summary">
                        <span class="summary-label">Total Available Cash:</span>
                        <span class="summary-value">{formatCurrency(processedCashData().totalInCAD)}</span>
                        <span class="summary-accounts">({processedCashData().accountCount} accounts)</span>
                    </div>
                    
                    <Show when={processedCashData().totalUSD > 0}>
                        <div class="currency-split">
                            <span class="split-item">CAD: {formatCurrency(processedCashData().totalCAD)}</span>
                            <span class="split-divider">•</span>
                            <span class="split-item">USD: {formatCurrency(processedCashData().totalUSD)} 
                                (≈ {formatCurrency(convertToCAD(processedCashData().totalUSD, 'USD', usdCadRate()))} CAD)
                            </span>
                        </div>
                    </Show>
                </div>
            </Show>
        </div>
    );
}

export default UnifiedStatsSection;