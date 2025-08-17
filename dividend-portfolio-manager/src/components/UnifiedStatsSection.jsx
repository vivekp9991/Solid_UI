// src/components/UnifiedStatsSection.jsx - FIXED: Account Change Detection and Cash Balance Integration
import { createSignal, onMount, onCleanup, For, Show, createMemo, createEffect } from 'solid-js';
import AccountSelector from './AccountSelector';
import { fetchCashBalances } from '../api';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { formatCurrency, convertToCAD } from '../utils/helpers';

function UnifiedStatsSection(props) {
    const [cashData, setCashData] = createSignal(null);
    const [lastUpdate, setLastUpdate] = createSignal(null);
    const [cashError, setCashError] = createSignal(null);
    const [isLoadingCash, setIsLoadingCash] = createSignal(false);

    const formatCompactCurrency = (amount, currency = 'CAD') => {
        const value = Number(amount) || 0;
        if (value >= 1000000) {
            return `${currency === 'USD' ? '$' : 'C$'}${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${currency === 'USD' ? '$' : 'C$'}${(value / 1000).toFixed(0)}K`;
        }
        return `${currency === 'USD' ? '$' : 'C$'}${value.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    // FIXED: Enhanced cash balance loading with better error handling and debugging
    const loadCashBalances = async () => {
        setIsLoadingCash(true);
        setCashError(null);
        
        try {
            const account = props.selectedAccount?.();
            console.log('🏦 UnifiedStatsSection: Loading cash balances for account:', account);
            
            if (!account) {
                console.log('🏦 No account selected, skipping cash balance load');
                return;
            }
            
            const data = await fetchCashBalances(account);
            console.log('🏦 UnifiedStatsSection: Cash balance API response:', data);
            
            setCashData(data || { accounts: [], summary: { totalAccounts: 0, totalPersons: 0, totalCAD: 0, totalUSD: 0 } });
            setLastUpdate(new Date());
            
            console.log('🏦 UnifiedStatsSection: Cash data set successfully');
        } catch (error) {
            console.error('🏦 UnifiedStatsSection: Failed to load cash balances:', error);
            setCashError(error.message);
            setCashData({ accounts: [], summary: { totalAccounts: 0, totalPersons: 0, totalCAD: 0, totalUSD: 0 } });
        } finally {
            setIsLoadingCash(false);
        }
    };

    // FIXED: Process cash balance data with better error handling and debugging
    const processedCashBalance = createMemo(() => {
        const data = cashData();
        const account = props.selectedAccount?.();
        const rate = props.usdCadRate?.() || 1.35;
        
        console.log('🏦 UnifiedStatsSection: Processing cash balance data:', { 
            hasData: !!data, 
            hasAccount: !!account, 
            accountsCount: data?.accounts?.length || 0,
            rate 
        });
        
        if (!data || !data.accounts || !account) {
            console.log('🏦 UnifiedStatsSection: No data or account, returning defaults');
            return {
                totalCAD: 0,
                totalUSD: 0,
                totalInCAD: 0,
                breakdown: [],
                displayText: 'No Cash Data',
                accountCount: 0
            };
        }

        // FIXED: Use the summary data from backend which already handles filtering
        const totalCAD = data.summary?.totalCAD || 0;
        const totalUSD = data.summary?.totalUSD || 0;
        
        // Process individual accounts for breakdown
        const aggregation = {};
        
        data.accounts.forEach(acc => {
            const accountType = acc.accountType || 'Cash';
            
            // FIXED: Extract cash from nested cashBalances array
            const cadBalance = acc.cashBalances?.find(cb => cb.currency === 'CAD')?.cash || 0;
            const usdBalance = acc.cashBalances?.find(cb => cb.currency === 'USD')?.cash || 0;
            
            console.log(`🏦 Processing account ${acc.accountName}: CAD=${cadBalance}, USD=${usdBalance}`);
            
            if (!aggregation[accountType]) {
                aggregation[accountType] = { CAD: 0, USD: 0 };
            }
            
            aggregation[accountType].CAD += cadBalance;
            aggregation[accountType].USD += usdBalance;
        });

        const totalInCAD = totalCAD + convertToCAD(totalUSD, 'USD', rate);

        console.log('🏦 UnifiedStatsSection: Aggregation result:', { aggregation, totalCAD, totalUSD, totalInCAD });

        // Create breakdown array for display
        const breakdown = Object.entries(aggregation)
            .filter(([_, balances]) => balances.CAD > 0 || balances.USD > 0)
            .map(([accountType, balances]) => {
                const cadBalance = balances.CAD;
                const usdBalance = balances.USD;
                const totalInCAD = cadBalance + convertToCAD(usdBalance, 'USD', rate);
                
                return {
                    accountType,
                    cadBalance,
                    usdBalance,
                    totalInCAD
                };
            })
            .sort((a, b) => b.totalInCAD - a.totalInCAD);

        // Create display text in the format "Cash: $5000, FHSA: $452, TFSA: $5263"
        let displayText = '';
        if (breakdown.length === 0) {
            displayText = 'No Cash';
        } else {
            const formattedBreakdown = breakdown.map(item => {
                const cadBalance = item.cadBalance;
                const usdBalance = item.usdBalance;
                
                if (cadBalance > 0 && usdBalance > 0) {
                    // Show CAD + USD combined in CAD equivalent
                    const totalCAD = cadBalance + convertToCAD(usdBalance, 'USD', rate);
                    return `${item.accountType}: ${formatCurrency(totalCAD)}`;
                } else if (cadBalance > 0) {
                    return `${item.accountType}: ${formatCurrency(cadBalance)}`;
                } else if (usdBalance > 0) {
                    // Convert USD to CAD for consistent display
                    const cadEquivalent = convertToCAD(usdBalance, 'USD', rate);
                    return `${item.accountType}: ${formatCurrency(cadEquivalent)}`;
                }
                return '';
            }).filter(text => text.length > 0);
            
            displayText = formattedBreakdown.join(', ');
        }

        const result = {
            totalCAD,
            totalUSD,
            totalInCAD,
            breakdown,
            displayText,
            accountCount: data.accounts.length
        };

        console.log('🏦 UnifiedStatsSection: Final processed cash balance:', result);
        return result;
    });

    // Enhanced stats with proper CASH BALANCE formatting - NO ICON
    const enhancedStats = createMemo(() => {
        const stats = props.stats || [];
        const cashBalance = processedCashBalance();
        
        console.log('🏦 UnifiedStatsSection: Enhancing stats with cash balance:', cashBalance);
        
        return stats.map((stat, index) => {
            // Update CASH BALANCE card with proper format and REMOVE ICON
            if (stat.title === 'CASH BALANCE' || stat.isCashBalance) {
                const updatedStat = {
                    ...stat,
                    icon: '', // REMOVED: Cash balance icon as requested
                    value: formatCurrency(cashBalance.totalInCAD),
                    subtitle: cashBalance.displayText,
                    contextSensitive: true,
                    showTrend: false,
                    isCashBalance: true,
                    breakdown: cashBalance.breakdown,
                    accountCount: cashBalance.accountCount
                };
                console.log('🏦 UnifiedStatsSection: Updated cash balance stat:', updatedStat);
                return updatedStat;
            }
            
            return {
                ...stat,
                contextSensitive: true,
                showTrend: stat.positive !== undefined
            };
        });
    });

    // FIXED: Create effect to load cash balances when account changes
    createEffect(() => {
        const account = props.selectedAccount?.();
        if (account) {
            console.log('🏦 UnifiedStatsSection: Account changed, reloading cash balances:', account);
            loadCashBalances();
        }
    });

    // FIXED: Create effect to reload cash balances when USD/CAD rate changes
    createEffect(() => {
        const rate = props.usdCadRate?.();
        if (rate && cashData()) {
            console.log('🏦 UnifiedStatsSection: Exchange rate changed, triggering cash balance recalculation:', rate);
            // The processedCashBalance memo will automatically recalculate when rate changes
        }
    });

    onMount(() => {
        console.log('🏦 UnifiedStatsSection mounted');
        loadCashBalances();
        
        // Reload cash balances every 5 minutes
        const interval = setInterval(() => {
            console.log('🏦 UnifiedStatsSection: Periodic cash balance reload');
            loadCashBalances();
        }, 5 * 60 * 1000);
        
        onCleanup(() => {
            clearInterval(interval);
        });
    });

    return (
        <div class="stats-section-with-controls">
            {/* Control Bar - positioned above the stats grid */}
            <div class="stats-control-bar">
                <div class="control-left">
                    <AccountSelector
                        selectedAccount={props.selectedAccount}
                        onAccountChange={props.onAccountChange}
                        disabled={props.isLoading?.()}
                    />
                    <div class="exchange-rate-display">
                        <span class="rate-label">USD/CAD:</span>
                        <span class="rate-value">{props.usdCadRate?.()?.toFixed(4) || '1.3500'}</span>
                    </div>
                </div>
                
                <div class="control-right">
                    <div class="live-indicator">
                        <div class="live-dot"></div>
                        <span class="live-text">Live</span>
                    </div>
                    <button 
                        class="sync-data-btn" 
                        onClick={props.runQuestrade}
                        disabled={props.isLoading?.()}
                    >
                        {props.isLoading?.() ? 'Syncing...' : 'Sync Data'}
                    </button>
                    <div class="last-sync-time">
                        Last sync: {props.lastRun?.() || 'Never'}
                    </div>
                </div>
            </div>

            {/* Debug info for cash balance - only show in development */}
            <Show when={import.meta.env.DEV && (cashError() || isLoadingCash())}>
                <div style="background: #fee; border: 1px solid #fcc; padding: 0.5rem; margin: 0.5rem 0; border-radius: 4px; font-size: 0.875rem;">
                    {isLoadingCash() && <span>Loading cash balances...</span>}
                    {cashError() && <span>Cash Balance Error: {cashError()}</span>}
                </div>
            </Show>

            {/* 6 Stats Cards - clean without overlay controls */}
            <div class="stats-grid-container">
                <div class="stats-grid">
                    <For each={enhancedStats()}>
                        {(stat, index) => (
                            <div class={`stat-card ${stat.isCashBalance ? 'cash-balance-card' : ''}`}>
                                {/* Original card content without overlay controls */}
                                <div class="stat-header">
                                    <div class="stat-info">
                                        {/* FIXED: Only show icon if it exists (cash balance icon removed) */}
                                        <Show when={stat.icon}>
                                            <div class="stat-icon" style={{ 
                                                background: `linear-gradient(135deg, ${stat.background}, ${stat.background}dd)` 
                                            }}>
                                                {stat.icon}
                                            </div>
                                        </Show>
                                        <div class="stat-title-section">
                                            <div class="stat-title">{stat.title}</div>
                                        </div>
                                    </div>
                                    <div class="stat-trend">
                                        <Show when={stat.showTrend && stat.positive !== undefined}>
                                            <div class={`trend-indicator ${stat.positive ? 'positive' : 'negative'}`}>
                                                {stat.positive ? '↗' : '↘'}
                                            </div>
                                        </Show>
                                    </div>
                                </div>
                                
                                <div class={`stat-value ${stat.positive ? 'positive' : stat.positive === false ? 'negative' : ''}`}>
                                    {stat.value}
                                </div>
                                
                                <div class={`stat-subtitle ${stat.positive ? 'positive' : stat.positive === false ? 'negative' : ''}`}>
                                    {stat.subtitle}
                                </div>

                                {/* Cash Balance Breakdown - only for cash balance card */}
                                <Show when={stat.isCashBalance && stat.breakdown && stat.breakdown.length > 0}>
                                    <div class="cash-balance-breakdown">
                                        <div class="breakdown-header">
                                            <span class="breakdown-title">Account Breakdown:</span>
                                            <span class="account-count">{stat.accountCount} accounts</span>
                                        </div>
                                        <div class="breakdown-items">
                                            <For each={stat.breakdown.slice(0, 3)}>
                                                {item => (
                                                    <div class="breakdown-item">
                                                        <span class="account-type">{item.accountType}</span>
                                                        <span class="account-value">{formatCurrency(item.totalInCAD)}</span>
                                                    </div>
                                                )}
                                            </For>
                                            <Show when={stat.breakdown.length > 3}>
                                                <div class="breakdown-more">
                                                    +{stat.breakdown.length - 3} more types
                                                </div>
                                            </Show>
                                        </div>
                                    </div>
                                </Show>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </div>
    );
}

export default UnifiedStatsSection;