// src/components/UnifiedStatsSection.jsx - PREMIUM UNIFIED STATS DESIGN
import { createSignal, onMount, onCleanup, For, Show, createMemo, createEffect } from 'solid-js';
import { fetchCashBalances, fetchExchangeRate } from '../api';

function UnifiedStatsSection(props) {
    const [cashData, setCashData] = createSignal(null);
    const [usdCadRate, setUsdCadRate] = createSignal(1.35);
    const [isExpanded, setIsExpanded] = createSignal(false);
    const [lastUpdate, setLastUpdate] = createSignal(null);
    const [hoveredCard, setHoveredCard] = createSignal(null);

    const formatCurrency = (amount, currency = 'CAD', compact = false) => {
        const value = Number(amount) || 0;
        if (compact && value >= 1000000) {
            return `${currency === 'USD' ? 'US$' : 'C$'}${(value / 1000000).toFixed(1)}M`;
        } else if (compact && value >= 1000) {
            return `${currency === 'USD' ? 'US$' : 'C$'}${(value / 1000).toFixed(0)}K`;
        }
        const symbol = currency === 'USD' ? 'US$' : 'C$';
        return `${symbol}${value.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const convertToCAD = (amount, currency) => {
        if (currency === 'USD') {
            return amount * usdCadRate();
        }
        return amount;
    };

    const loadCashBalances = async () => {
        try {
            const [rate, data] = await Promise.all([
                fetchExchangeRate('USD', 'CAD'),
                fetchCashBalances()
            ]);
            
            setUsdCadRate(rate);
            setCashData(data || { accounts: [], summary: { totalAccounts: 0, totalPersons: 0, totalCAD: 0 } });
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Failed to load cash balances:', error);
            setCashData({ accounts: [], summary: { totalAccounts: 0, totalPersons: 0, totalCAD: 0 } });
        }
    };

    // Process cash data for display
    const processedCashData = createMemo(() => {
        const data = cashData();
        if (!data || !data.accounts) return null;

        let totalCAD = 0;
        let totalUSD = 0;
        const personGroups = {};

        data.accounts.forEach(account => {
            const personName = account.personName || 'Unknown';
            const currency = account.currency || 'CAD';
            const cashBalance = Number(account.cashBalance) || 0;

            if (!personGroups[personName]) {
                personGroups[personName] = {
                    personName,
                    accounts: [],
                    totalCAD: 0,
                    totalUSD: 0,
                    totalInCAD: 0
                };
            }

            personGroups[personName].accounts.push({
                accountType: account.accountType,
                cashBalance,
                currency
            });

            if (currency === 'USD') {
                personGroups[personName].totalUSD += cashBalance;
                totalUSD += cashBalance;
            } else {
                personGroups[personName].totalCAD += cashBalance;
                totalCAD += cashBalance;
            }
            
            const cadEquivalent = convertToCAD(cashBalance, currency);
            personGroups[personName].totalInCAD += cadEquivalent;
        });

        const totalInCAD = totalCAD + convertToCAD(totalUSD, 'USD');

        return {
            totalCAD,
            totalUSD,
            totalInCAD,
            personGroups: Object.values(personGroups),
            accountCount: data.accounts?.length || 0
        };
    });

    // Get account context
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

    // Enhanced stats with cash integration
    const enhancedStats = createMemo(() => {
        const stats = props.stats || [];
        const cashInfo = processedCashData();
        const context = getAccountContext();
        
        return stats.map((stat, index) => {
            // Add cash information to the first stat card (Total Investment)
            if (index === 0 && cashInfo) {
                return {
                    ...stat,
                    cashInfo: {
                        totalCash: cashInfo.totalInCAD,
                        breakdown: {
                            cad: cashInfo.totalCAD,
                            usd: cashInfo.totalUSD
                        },
                        personGroups: cashInfo.personGroups
                    },
                    showCashDetails: true
                };
            }
            
            return {
                ...stat,
                contextSensitive: true,
                aggregated: context?.isAggregated || false,
                showPercentChange: stat.percentValue !== undefined,
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
        <div class="unified-stats-section">
            {/* Context Header */}
            <div class="stats-header">
                <div class="header-info">
                    <h3 class="stats-title">Portfolio Overview</h3>
                    <div class="context-badges">
                        <Show when={getAccountContext()?.isAggregated}>
                            <div class="context-badge aggregated">
                                <span class="badge-icon">🔗</span>
                                <span class="badge-text">Combined Data</span>
                            </div>
                        </Show>
                        <Show when={usdCadRate() && processedCashData()?.totalUSD > 0}>
                            <div class="context-badge exchange-rate">
                                <span class="badge-icon">💱</span>
                                <span class="badge-text">USD/CAD: {usdCadRate().toFixed(4)}</span>
                            </div>
                        </Show>
                    </div>
                </div>
                <div class="header-actions">
                    <Show when={lastUpdate()}>
                        <div class="last-update">
                            <span class="update-dot"></span>
                            <span class="update-text">Updated {lastUpdate().toLocaleTimeString()}</span>
                        </div>
                    </Show>
                    <button 
                        class="expand-toggle"
                        onClick={() => setIsExpanded(!isExpanded())}
                    >
                        <span class="toggle-icon">{isExpanded() ? '📊' : '💰'}</span>
                        <span class="toggle-text">{isExpanded() ? 'Portfolio' : 'Cash'}</span>
                    </button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div class="premium-stats-grid">
                <For each={enhancedStats()}>
                    {(stat, index) => (
                        <div 
                            class={`premium-stat-card ${stat.aggregated ? 'aggregated' : ''} ${hoveredCard() === index() ? 'hovered' : ''}`}
                            onMouseEnter={() => setHoveredCard(index())}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            {/* Card Header */}
                            <div class="card-header">
                                <div class="icon-section">
                                    <div class="stat-icon" style={{ 
                                        background: `linear-gradient(135deg, ${stat.background}dd, ${stat.background})` 
                                    }}>
                                        {stat.icon}
                                    </div>
                                    <Show when={stat.showTrend && stat.positive !== undefined}>
                                        <div class={`trend-arrow ${stat.positive ? 'positive' : 'negative'}`}>
                                            {stat.positive ? '↗' : '↘'}
                                        </div>
                                    </Show>
                                </div>
                                <div class="title-section">
                                    <h4 class="stat-title">{stat.title}</h4>
                                    <Show when={stat.aggregated}>
                                        <span class="aggregation-indicator">Combined</span>
                                    </Show>
                                </div>
                            </div>

                            {/* Primary Value */}
                            <div class={`primary-value ${stat.positive ? 'positive' : stat.positive === false ? 'negative' : ''}`}>
                                {stat.value}
                            </div>

                            {/* Secondary Info */}
                            <div class="secondary-info">
                                <span class={`subtitle ${stat.positive ? 'positive' : stat.positive === false ? 'negative' : ''}`}>
                                    {stat.subtitle}
                                </span>
                                <Show when={stat.showPercentChange && stat.percentValue !== undefined}>
                                    <div class={`percent-badge ${stat.positive ? 'positive' : 'negative'}`}>
                                        {Math.abs(stat.percentValue).toFixed(1)}%
                                    </div>
                                </Show>
                            </div>

                            {/* Cash Integration for Investment Card */}
                            <Show when={stat.showCashDetails && stat.cashInfo}>
                                <div class="cash-integration">
                                    <div class="cash-summary">
                                        <div class="cash-label">Available Cash</div>
                                        <div class="cash-amount">{formatCurrency(stat.cashInfo.totalCash, 'CAD', true)}</div>
                                    </div>
                                    <Show when={stat.cashInfo.breakdown.usd > 0}>
                                        <div class="currency-breakdown">
                                            <span class="breakdown-item">
                                                CAD: {formatCurrency(stat.cashInfo.breakdown.cad, 'CAD', true)}
                                            </span>
                                            <span class="breakdown-divider">•</span>
                                            <span class="breakdown-item">
                                                USD: {formatCurrency(stat.cashInfo.breakdown.usd, 'USD', true)}
                                            </span>
                                        </div>
                                    </Show>
                                </div>
                            </Show>

                            {/* Progress Indicator */}
                            <Show when={stat.positive && stat.percentValue}>
                                <div class="progress-indicator">
                                    <div 
                                        class="progress-fill" 
                                        style={`width: ${Math.min(100, Math.abs(stat.percentValue))}%; background: ${stat.background}`}
                                    ></div>
                                </div>
                            </Show>

                            {/* Hover Overlay */}
                            <div class="hover-overlay">
                                <Show when={stat.tooltip}>
                                    <div class="tooltip-content">
                                        <div class="tooltip-title">{stat.title}</div>
                                        <div class="tooltip-text">{stat.tooltip}</div>
                                        <Show when={stat.aggregated}>
                                            <div class="tooltip-context">
                                                Data combined across accounts
                                            </div>
                                        </Show>
                                    </div>
                                </Show>
                            </div>
                        </div>
                    )}
                </For>
            </div>

            {/* Expandable Cash Details */}
            <Show when={isExpanded() && processedCashData()}>
                <div class="cash-details-section">
                    <div class="details-header">
                        <h4>Cash Distribution by Account</h4>
                        <div class="total-summary">
                            Total: {formatCurrency(processedCashData().totalInCAD)}
                            <Show when={processedCashData().personGroups.length > 1}>
                                <span class="account-count">
                                    ({processedCashData().personGroups.length} persons)
                                </span>
                            </Show>
                        </div>
                    </div>

                    <div class="person-grid">
                        <For each={processedCashData().personGroups}>
                            {(person, index) => (
                                <div class="person-card">
                                    <div class="person-header">
                                        <div class="person-info">
                                            <span class="person-icon">👤</span>
                                            <span class="person-name">{person.personName}</span>
                                        </div>
                                        <div class="person-total">
                                            {formatCurrency(person.totalInCAD)}
                                        </div>
                                    </div>
                                    <div class="account-list">
                                        <For each={person.accounts}>
                                            {account => (
                                                <div class="account-item">
                                                    <span class="account-type">{account.accountType}</span>
                                                    <span class="account-balance">
                                                        {formatCurrency(account.cashBalance, account.currency, true)}
                                                    </span>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
            </Show>
        </div>
    );
}

export default UnifiedStatsSection;