// src/components/UnifiedStatsSection.jsx - FIXED: Cash Balance Data Loading and Debug
import { createSignal, onMount, onCleanup, For, Show, createMemo, createEffect } from 'solid-js';
import AccountSelector from './AccountSelector';
import { fetchCashBalances } from '../api';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { formatCurrency, convertToCAD } from '../utils/helpers';

function UnifiedStatsSection(props) {
    const [cashData, setCashData] = createSignal(null);
    const [lastUpdate, setLastUpdate] = createSignal(null);
    const [cashError, setCashError] = createSignal(null);

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
            setCashError(null);
            console.log('🏦 Loading cash balances...');
            
            const account = props.selectedAccount?.();
            console.log('🏦 Selected account:', account);
            
            const data = await fetchCashBalances(account);
            console.log('🏦 Raw cash balance data:', data);
            
            setCashData(data || { accounts: [], summary: { totalAccounts: 0, totalPersons: 0, totalCAD: 0 } });
            setLastUpdate(new Date());
            
            console.log('🏦 Cash data set successfully');
        } catch (error) {
            console.error('🏦 Failed to load cash balances:', error);
            setCashError(error.message);
            setCashData({ accounts: [], summary: { totalAccounts: 0, totalPersons: 0, totalCAD: 0 } });
        }
    };

    // FIXED: Process cash balance data with better error handling and debugging
    const processedCashBalance = createMemo(() => {
        const data = cashData();
        const account = props.selectedAccount?.();
        
        console.log('🏦 Processing cash balance data:', { data, account });
        
        if (!data || !data.accounts || !account) {
            console.log('🏦 No data or account, returning defaults');
            return {
                totalCAD: 0,
                totalUSD: 0,
                totalInCAD: 0,
                breakdown: [],
                displayText: 'No Cash Data'
            };
        }

        const rate = props.usdCadRate?.() || 1.35;
        let filteredAccounts = [];

        // Filter accounts based on selected view mode
        if (account.viewMode === 'all') {
            filteredAccounts = data.accounts;
        } else if (account.viewMode === 'person') {
            filteredAccounts = data.accounts.filter(acc => 
                acc.personName === account.personName
            );
        } else if (account.viewMode === 'account') {
            filteredAccounts = data.accounts.filter(acc => 
                acc.accountId === account.accountId
            );
        }

        console.log('🏦 Filtered accounts:', filteredAccounts);

        // Aggregate by account type
        const aggregation = {};
        let totalCAD = 0;
        let totalUSD = 0;

        filteredAccounts.forEach(acc => {
            const currency = acc.currency || 'CAD';
            const balance = Number(acc.cashBalance) || 0;
            const accountType = acc.accountType || 'Cash';

            console.log(`🏦 Processing account: ${accountType}, Currency: ${currency}, Balance: ${balance}`);

            if (!aggregation[accountType]) {
                aggregation[accountType] = { CAD: 0, USD: 0 };
            }

            aggregation[accountType][currency] += balance;

            if (currency === 'CAD') {
                totalCAD += balance;
            } else if (currency === 'USD') {
                totalUSD += balance;
            }
        });

        const totalInCAD = totalCAD + convertToCAD(totalUSD, 'USD', rate);

        console.log('🏦 Aggregation result:', { aggregation, totalCAD, totalUSD, totalInCAD });

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

        // FIXED: Create display text in the format "Cash: $5000, FHSA: $452, TFSA: $5263"
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
            accountCount: filteredAccounts.length
        };

        console.log('🏦 Final processed cash balance:', result);
        return result;
    });

    // Enhanced stats with proper CASH BALANCE formatting
    const enhancedStats = createMemo(() => {
        const stats = props.stats || [];
        const cashBalance = processedCashBalance();
        
        console.log('🏦 Enhancing stats with cash balance:', cashBalance);
        
        return stats.map((stat, index) => {
            // Update CASH BALANCE card with proper format
            if (stat.title === 'CASH BALANCE' || stat.isCashBalance) {
                const updatedStat = {
                    ...stat,
                    value: formatCurrency(cashBalance.totalInCAD),
                    subtitle: cashBalance.displayText,
                    contextSensitive: true,
                    showTrend: false,
                    isCashBalance: true,
                    breakdown: cashBalance.breakdown,
                    accountCount: cashBalance.accountCount
                };
                console.log('🏦 Updated cash balance stat:', updatedStat);
                return updatedStat;
            }
            
            return {
                ...stat,
                contextSensitive: true,
                showTrend: stat.positive !== undefined
            };
        });
    });

    // Load cash balances when account changes
    createEffect(() => {
        const account = props.selectedAccount?.();
        if (account) {
            console.log('🏦 Account changed, reloading cash balances:', account);
            loadCashBalances();
        }
    });

    onMount(() => {
        console.log('🏦 UnifiedStatsSection mounted');
        loadCashBalances();
        
        // Reload cash balances every 5 minutes
        const interval = setInterval(() => {
            console.log('🏦 Periodic cash balance reload');
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

            {/* Debug info for cash balance */}
            <Show when={cashError()}>
                <div style="background: #fee; border: 1px solid #fcc; padding: 0.5rem; margin: 0.5rem 0; border-radius: 4px; font-size: 0.875rem;">
                    Cash Balance Error: {cashError()}
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
                                        <div class="stat-icon" style={{ 
                                            background: `linear-gradient(135deg, ${stat.background}, ${stat.background}dd)` 
                                        }}>
                                            {stat.icon}
                                        </div>
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
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </div>
    );
}

export default UnifiedStatsSection;