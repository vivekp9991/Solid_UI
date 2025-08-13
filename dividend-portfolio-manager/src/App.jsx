// src/App.jsx - COMPLETE FIXED VERSION WITH CORRECTED DIVIDEND CALCULATIONS
import { createSignal, onMount, onCleanup, createMemo, createEffect } from 'solid-js';
import Header from './components/Header';
import StatsGrid from './components/StatsGrid';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';
import NotificationSystem from './components/NotificationSystem';
import { 
    fetchPortfolioSummary, 
    fetchPositions, 
    fetchDividendCalendar, 
    syncAllPersons, 
    fetchPortfolioAnalysis,
    fetchDropdownOptions,
    syncPerson
} from './api';
import { startPollingQuotes, stopQuoteStream } from './streaming';

function App() {
    // Account selection state
    const [selectedAccount, setSelectedAccount] = createSignal({
        viewMode: 'all',
        personName: null,
        accountId: null,
        label: 'All Accounts',
        value: 'all',
        aggregate: true
    });

    // Existing states
    const [statsData, setStatsData] = createSignal([
        { icon: '💰', background: '#f59e0b', title: 'TOTAL INVESTMENT', value: '$0.00', subtitle: '0 positions' },
        { icon: '📈', background: '#10b981', title: 'CURRENT VALUE', value: '$0.00', subtitle: 'Live pricing' },
        { icon: '📊', background: '#3b82f6', title: 'UNREALIZED P&L', value: '$0.00', subtitle: '0%', positive: false },
        { icon: '💎', background: '#ef4444', title: 'TOTAL RETURN', value: '$0.00', subtitle: '0%', positive: false }
    ]);
    
    const [stockData, setStockData] = createSignal([]);
    const [portfolioSummaryData, setPortfolioSummaryData] = createSignal([]);
    const [dividendCalendarData, setDividendCalendarData] = createSignal([]);
    const [portfolioAnalysisData, setPortfolioAnalysisData] = createSignal(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = createSignal(false);
    const [isLoading, setIsLoading] = createSignal(false);
    const [lastQuestradeRun, setLastQuestradeRun] = createSignal('');
    const [activeTab, setActiveTab] = createSignal('holdings');
    
    let pollingCleanup = null;

    const formatCurrency = (num) => {
        const n = Number(num);
        return isNaN(n) ? '$0.00' : `$${n.toFixed(2)}`;
    };

    const formatPercent = (num) => {
        const n = Number(num);
        return isNaN(n) ? '0%' : `${n.toFixed(2)}%`;
    };

    // FIXED: Enhanced today's change formatting with proper signs
    const formatTodayChange = (valueChange, percentChange) => {
        if (valueChange === undefined && percentChange === undefined) return '$0.00 (0.00%)';
        
        const value = Number(valueChange) || 0;
        const percent = Number(percentChange) || 0;
        
        // Format with proper signs
        const valueStr = value >= 0 ? `+$${Math.abs(value).toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
        const percentStr = percent >= 0 ? `+${Math.abs(percent).toFixed(2)}%` : `-${Math.abs(percent).toFixed(2)}%`;
        
        return `${valueStr} (${percentStr})`;
    };

    // FIXED: Helper function to determine if a stock pays dividends
    const isDividendPayingStock = (position) => {
        const dividendData = position.dividendData || {};
        const totalReceived = Number(dividendData.totalReceived) || 0;
        const monthlyDividend = Number(dividendData.monthlyDividendPerShare) || 
                              Number(dividendData.monthlyDividend) || 0;
        const annualDividend = Number(dividendData.annualDividend) || 0;
        const dividendPerShare = Number(position.dividendPerShare) || 0;
        
        // A stock pays dividends if ANY of these conditions are true:
        // 1. Has received dividends in the past (totalReceived > 0)
        // 2. Has a current monthly dividend > 0
        // 3. Has an annual dividend > 0
        // 4. Has dividendPerShare > 0
        return totalReceived > 0 || monthlyDividend > 0 || annualDividend > 0 || dividendPerShare > 0;
    };

    // Handle account selection changes
    const handleAccountChange = (newSelection) => {
        console.log('App: Account selection changed to:', newSelection);
        setSelectedAccount(newSelection);
    };

    // Load data based on selected account
    createEffect(async () => {
        const account = selectedAccount();
        console.log('App: Account selection effect triggered:', account);
        
        // Reload all data when account selection changes
        await Promise.all([
            loadSummary(),
            loadPositions(),
            loadDividends(),
            loadAnalysis()
        ]);
    });

    const loadSummary = async () => {
        try {
            const account = selectedAccount();
            console.log('Loading summary for account:', account);
            const summary = await fetchPortfolioSummary(account);
            
            if (summary) {
                const unrealizedPnlPercent = summary.totalInvestment > 0
                    ? ((summary.unrealizedPnl || 0) / summary.totalInvestment) * 100
                    : 0;
                const totalReturnPercent = summary.totalReturnPercent ||
                    (summary.totalInvestment > 0
                        ? ((summary.totalReturnValue || 0) / summary.totalInvestment) * 100
                        : 0);
                        
                setStatsData([
                    {
                        icon: '💰',
                        background: '#f59e0b',
                        title: 'TOTAL INVESTMENT',
                        value: formatCurrency(summary.totalInvestment),
                        subtitle: `${summary.numberOfPositions || 0} positions`
                    },
                    {
                        icon: '📈',
                        background: '#10b981',
                        title: 'CURRENT VALUE',
                        value: formatCurrency(summary.currentValue),
                        subtitle: 'Live pricing'
                    },
                    {
                        icon: '📊',
                        background: '#3b82f6',
                        title: 'UNREALIZED P&L',
                        value: formatCurrency(summary.unrealizedPnl),
                        subtitle: `${formatPercent(unrealizedPnlPercent)} Capital gains`,
                        positive: (summary.unrealizedPnl || 0) >= 0
                    },
                    {
                        icon: '💎',
                        background: '#ef4444',
                        title: 'TOTAL RETURN',
                        value: formatCurrency(summary.totalReturnValue),
                        subtitle: `${formatPercent(totalReturnPercent)} Including dividends`,
                        positive: (summary.totalReturnValue || 0) >= 0
                    }
                ]);
                
                // Update portfolio summary for analysis tab
                setPortfolioSummaryData([
                    {
                        title: 'Total Portfolio',
                        rows: [
                            { label: 'Investment:', value: formatCurrency(summary.totalInvestment) },
                            { label: 'Current Value:', value: formatCurrency(summary.currentValue) },
                            { label: 'Total Return:', value: formatCurrency(summary.totalReturnValue), positive: (summary.totalReturnValue || 0) >= 0 }
                        ]
                    },
                    {
                        title: 'Monthly Income',
                        rows: [
                            { label: 'Current:', value: formatCurrency(summary.monthlyDividendIncome) },
                            { label: 'Annual Projected:', value: formatCurrency(summary.annualProjectedDividend) }
                        ]
                    },
                    {
                        title: 'Dividend Metrics',
                        rows: [
                            { label: 'Avg Yield on Cost:', value: formatPercent(summary.yieldOnCostPercent) },
                            { label: 'Avg Current Yield:', value: formatPercent(summary.averageYieldPercent) }
                        ]
                    },
                    {
                        title: 'Performance',
                        rows: [
                            { label: 'Total Return:', value: formatPercent(totalReturnPercent), positive: (totalReturnPercent || 0) >= 0 },
                            { label: 'Positions:', value: String(summary.numberOfPositions || 0) }
                        ]
                    }
                ]);
            }
        } catch (err) {
            console.error('Failed to fetch portfolio summary', err);
        }
    };

    const loadPositions = async () => {
        try {
            const account = selectedAccount();
            console.log('Loading positions for account:', account);
            const data = await fetchPositions(account, account.aggregate);
            const positions = Array.isArray(data) ? data : [];
            console.log('Loaded positions:', positions);

            if (positions.length > 0) {
                const formattedStocks = positions.map(pos => {
                    const sharesNum = Number(pos.openQuantity) || 0;
                    const avgCostNum = Number(pos.averageEntryPrice) || 0;
                    const currentPriceNum = Number(pos.currentPrice) || 0;
                    const openPriceNum = Number(pos.openPrice) || currentPriceNum; // Fallback to current if no open price
                    const marketValueNum = currentPriceNum * sharesNum;
                    const totalCostNum = avgCostNum * sharesNum;
                    
                    const dividendData = pos.dividendData || {};
                    
                    // FIXED: Determine if this stock actually pays dividends
                    const isDividendStock = isDividendPayingStock(pos);
                    
                    // FIXED: Only calculate dividend metrics for dividend-paying stocks
                    let dividendPerShare = 0;
                    let annualDividendPerShare = 0;
                    let monthlyDividendTotal = 0;
                    let annualDividendTotal = 0;
                    let currentYieldPercentNum = 0;
                    let yieldOnCostPercentNum = 0;
                    let dividendReturnPercentNum = 0;
                    let divAdjCostPerShare = avgCostNum;
                    let divAdjYieldPercentNum = 0;
                    
                    const totalReceivedNum = Number(dividendData.totalReceived) || 0;
                    
                    if (isDividendStock) {
                        dividendPerShare = pos.dividendPerShare !== undefined
                            ? Number(pos.dividendPerShare) || 0
                            : dividendData.monthlyDividendPerShare ||
                              (sharesNum > 0
                                  ? (dividendData.monthlyDividend || 0) / sharesNum
                                  : 0);

                        annualDividendPerShare = dividendPerShare * 12;
                        monthlyDividendTotal = dividendPerShare * sharesNum;
                        annualDividendTotal = annualDividendPerShare * sharesNum;
                        
                        currentYieldPercentNum = currentPriceNum > 0 && annualDividendPerShare > 0
                            ? (annualDividendPerShare / currentPriceNum) * 100
                            : 0;
                        
                        yieldOnCostPercentNum = avgCostNum > 0 && annualDividendPerShare > 0
                            ? (annualDividendPerShare / avgCostNum) * 100
                            : 0;
                        
                        dividendReturnPercentNum = totalCostNum > 0 && totalReceivedNum > 0
                            ? (totalReceivedNum / totalCostNum) * 100 
                            : 0;
                        
                        divAdjCostPerShare = sharesNum > 0 && totalReceivedNum > 0
                            ? avgCostNum - (totalReceivedNum / sharesNum) 
                            : avgCostNum;
                        
                        divAdjYieldPercentNum = divAdjCostPerShare > 0 && annualDividendPerShare > 0
                            ? (annualDividendPerShare / divAdjCostPerShare) * 100 
                            : 0;
                    }
                    
                    const capitalGainValue = marketValueNum - totalCostNum;
                    const capitalGainPercent = totalCostNum > 0 
                        ? (capitalGainValue / totalCostNum) * 100 
                        : 0;
                    
                    const totalReturnValue = capitalGainValue + totalReceivedNum;
                    const totalReturnPercent = totalCostNum > 0 
                        ? (totalReturnValue / totalCostNum) * 100 
                        : 0;

                    // FIXED: Calculate today's change properly
                    const todayChangeValueNum = currentPriceNum - openPriceNum;
                    const todayChangePercentNum = openPriceNum > 0 
                        ? (todayChangeValueNum / openPriceNum) * 100 
                        : 0;

                    // Handle aggregation data
                    const isAggregated = pos.isAggregated || false;
                    const sourceAccounts = pos.sourceAccounts || [];
                    const accountCount = pos.accountCount || 1;
                    const individualPositions = pos.individualPositions || [];

                    console.log(`Stock ${pos.symbol} - isDividendStock: ${isDividendStock}, totalReceived: ${totalReceivedNum}, dividendPerShare: ${dividendPerShare}`);

                    return {
                        symbol: pos.symbol || '',
                        company: pos.symbol || '',
                        dotColor: totalReturnPercent >= 0 ? '#10b981' : '#ef4444',
                        shares: String(sharesNum),
                        sharesNum,
                        avgCost: formatCurrency(avgCostNum),
                        avgCostNum,
                        current: formatCurrency(currentPriceNum),
                        currentPriceNum,
                        // FIXED: Add open price tracking
                        openPrice: formatCurrency(openPriceNum),
                        openPriceNum,
                        totalReturn: formatPercent(totalReturnPercent),
                        totalReturnPercentNum: totalReturnPercent,
                        // FIXED: Show proper values for non-dividend stocks
                        currentYield: isDividendStock ? formatPercent(currentYieldPercentNum) : '0.00%',
                        currentYieldPercentNum: isDividendStock ? currentYieldPercentNum : 0,
                        marketValue: formatCurrency(marketValueNum),
                        marketValueNum,
                        capitalGrowth: formatPercent(capitalGainPercent),
                        capitalGainPercentNum: capitalGainPercent,
                        dividendReturn: isDividendStock ? formatPercent(dividendReturnPercentNum) : '0.00%',
                        dividendReturnPercentNum: isDividendStock ? dividendReturnPercentNum : 0,
                        yieldOnCost: isDividendStock ? formatPercent(yieldOnCostPercentNum) : 'N/A',
                        yieldOnCostPercentNum: isDividendStock ? yieldOnCostPercentNum : 0,
                        divAdjCost: isDividendStock ? formatCurrency(divAdjCostPerShare) : 'N/A',
                        divAdjCostNum: isDividendStock ? divAdjCostPerShare : avgCostNum,
                        divAdjYield: isDividendStock ? formatPercent(divAdjYieldPercentNum) : 'N/A',
                        divAdjYieldPercentNum: isDividendStock ? divAdjYieldPercentNum : 0,
                        monthlyDiv: isDividendStock ? formatCurrency(monthlyDividendTotal) : '$0.00',
                        monthlyDividendNum: monthlyDividendTotal,
                        dividendPerShare: isDividendStock ? formatCurrency(dividendPerShare) : '$0.00',
                        dividendPerShareNum: dividendPerShare,
                        annualDividendPerShare,
                        // FIXED: Today's change calculation and formatting
                        todayChange: formatTodayChange(todayChangeValueNum, todayChangePercentNum),
                        todayChangeValueNum,
                        todayChangePercentNum,
                        valueWoDiv: formatCurrency(marketValueNum - totalReceivedNum),
                        annualDividendNum: annualDividendTotal,
                        totalReceivedNum,
                        totalCostNum,
                        isDividendStock,
                        // Add aggregation info
                        isAggregated,
                        sourceAccounts,
                        accountCount,
                        // FIXED: Add update tracking for animations
                        lastUpdateTime: null,
                        individualPositions: individualPositions.map(p => ({
                            accountName: p.accountName || 'Unknown Account',
                            accountType: p.accountType || 'Unknown Type',
                            shares: String(p.shares ?? p.openQuantity ?? 0),
                            avgCost: formatCurrency(p.avgCost ?? p.averageEntryPrice ?? 0),
                            marketValue: formatCurrency(p.marketValue ?? (p.currentPrice * (p.shares ?? p.openQuantity ?? 0)) ?? 0)
                        }))
                    };
                });

                console.log('Formatted stocks:', formattedStocks);
                setStockData(formattedStocks);

                // Start polling for live quotes
                const symbols = formattedStocks.map(s => s.symbol).filter(s => s);
                if (symbols.length > 0) {
                    if (pollingCleanup) {
                        pollingCleanup();
                    }
                    pollingCleanup = await startPollingQuotes(symbols, handleQuoteUpdate, 5000);
                }
            }
        } catch (err) {
            console.error('Failed to fetch positions', err);
        }
    };

    const loadDividends = async () => {
        try {
            const account = selectedAccount();
            const calendar = await fetchDividendCalendar(account);
            if (Array.isArray(calendar)) {
                setDividendCalendarData(
                    calendar.map(d => ({
                        symbol: d.symbol || '',
                        amount: formatCurrency(Math.abs(d.netAmount || d.amount || 0)),
                        date: d.transactionDate ? new Date(d.transactionDate).toLocaleDateString() : 'N/A'
                    }))
                );
            }
        } catch (err) {
            console.error('Failed to fetch dividend calendar', err);
        }
    };

    const loadAnalysis = async () => {
        try {
            const account = selectedAccount();
            const analysis = await fetchPortfolioAnalysis(account);
            if (analysis) {
                setPortfolioAnalysisData(analysis);
            }
        } catch (err) {
            console.error('Failed to fetch portfolio analysis', err);
        }
    };

    // FIXED: Enhanced quote update handler with proper immutability and update tracking
    const handleQuoteUpdate = (quote) => {
        const price = quote.lastTradePrice || quote.price;
        if (!price || !quote.symbol) return;

        console.log(`📈 Processing quote update for ${quote.symbol}: ${price}`);

        // CRITICAL: Create completely new array for SolidJS reactivity
        setStockData(prevStocks => {
            // Find if any stock actually changed
            let hasChanges = false;
            
            const newStocks = prevStocks.map(stock => {
                if (stock.symbol !== quote.symbol) return stock;

                const newPrice = price;
                const openPrice = quote.openPrice || stock.openPriceNum || newPrice;
                
                // Check if price actually changed (avoid unnecessary updates)
                if (Math.abs(newPrice - stock.currentPriceNum) < 0.001) {
                    return stock; // No change, return same object
                }

                hasChanges = true;
                console.log(`💰 Price change detected for ${stock.symbol}: ${stock.currentPriceNum} → ${newPrice}`);
                
                const newMarketValue = newPrice * stock.sharesNum;
                const totalCost = stock.totalCostNum || (stock.avgCostNum * stock.sharesNum);
                
                const newCapitalValue = newMarketValue - totalCost;
                const newCapitalPercent = totalCost > 0 ? (newCapitalValue / totalCost) * 100 : 0;
                
                const newTotalReturnValue = newCapitalValue + stock.totalReceivedNum;
                const newTotalPercent = totalCost > 0 ? (newTotalReturnValue / totalCost) * 100 : 0;
                
                // FIXED: Only calculate dividend yield for dividend-paying stocks
                const newCurrentYieldPercent = stock.isDividendStock && newPrice > 0 && stock.annualDividendPerShare > 0
                    ? (stock.annualDividendPerShare / newPrice) * 100 
                    : 0;
                
                const newValueWoDiv = newMarketValue - stock.totalReceivedNum;

                // FIXED: Calculate today's change properly
                const todayChangeValue = newPrice - openPrice;
                const todayChangePercent = openPrice > 0 ? (todayChangeValue / openPrice) * 100 : 0;

                // Return completely new object (immutable update for SolidJS)
                return {
                    ...stock,
                    currentPriceNum: newPrice,
                    openPriceNum: openPrice,
                    marketValueNum: newMarketValue,
                    capitalGainPercentNum: newCapitalPercent,
                    totalReturnPercentNum: newTotalPercent,
                    currentYieldPercentNum: newCurrentYieldPercent,
                    // FIXED: Update today's change values
                    todayChangeValueNum: todayChangeValue,
                    todayChangePercentNum: todayChangePercent,
                    // FIXED: Update timestamp for animation tracking
                    lastUpdateTime: Date.now(),
                    // Update formatted strings
                    current: formatCurrency(newPrice),
                    openPrice: formatCurrency(openPrice),
                    marketValue: formatCurrency(newMarketValue),
                    capitalGrowth: formatPercent(newCapitalPercent),
                    totalReturn: formatPercent(newTotalPercent),
                    // FIXED: Proper dividend yield display for non-dividend stocks
                    currentYield: stock.isDividendStock ? formatPercent(newCurrentYieldPercent) : '0.00%',
                    valueWoDiv: formatCurrency(newValueWoDiv),
                    // FIXED: Update today's change display with proper formatting
                    todayChange: formatTodayChange(todayChangeValue, todayChangePercent),
                    dotColor: newTotalPercent >= 0 ? '#10b981' : '#ef4444'
                };
            });

            // Only update if there were actual changes
            if (hasChanges) {
                console.log(`✅ Stock data updated with new prices`);
                updateStatsWithLivePrice();
                return newStocks;
            }
            
            return prevStocks; // No changes, return original array
        });
    };

    const updateStatsWithLivePrice = () => {
        const stocks = stockData();
        if (stocks.length === 0) return;

        const totalValue = stocks.reduce((sum, s) => sum + s.marketValueNum, 0);
        const totalCost = stocks.reduce((sum, s) => sum + (s.avgCostNum * s.sharesNum), 0);
        const unrealizedPnl = totalValue - totalCost;
        const unrealizedPnlPercent = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;
        const totalDividendsReceived = stocks.reduce((sum, s) => sum + s.totalReceivedNum, 0);
        const totalReturnValue = unrealizedPnl + totalDividendsReceived;
        const totalReturnPercent = totalCost > 0 ? (totalReturnValue / totalCost) * 100 : 0;

        setStatsData(prev => prev.map((stat, index) => {
            if (index === 1) {
                return { ...stat, value: formatCurrency(totalValue) };
            }
            if (index === 2) {
                return {
                    ...stat,
                    value: formatCurrency(unrealizedPnl),
                    subtitle: `${formatPercent(unrealizedPnlPercent)} Capital gains`,
                    positive: unrealizedPnl >= 0
                };
            }
            if (index === 3) {
                return {
                    ...stat,
                    value: formatCurrency(totalReturnValue),
                    subtitle: `${formatPercent(totalReturnPercent)} Including dividends`,
                    positive: totalReturnValue >= 0
                };
            }
            return stat;
        }));
    };

    const portfolioDividendMetrics = createMemo(() => {
        const data = stockData();
        if (!data || data.length === 0) return [];

        const dividendStocks = data.filter(s => s.isDividendStock);

        if (dividendStocks.length === 0) {
            return [
                { label: 'Current Yield', value: '0%' },
                { label: 'Yield on Cost', value: '0%' },
                { label: 'Div Adj. Avg Cost', value: '$0.00' },
                { label: 'Div Adj. Yield', value: '0%' },
                { label: 'TTM Yield', value: '0%' },
                { label: 'Monthly Average', value: '$0.00' },
                { label: 'Annual Projected', value: '$0.00' }
            ];
        }

        let totalValue = 0;
        let totalCost = 0;
        let totalMonthlyDiv = 0;
        let weightedYieldOnCost = 0;
        let weightedCurrentYield = 0;
        let totalDividendsReceived = 0;

        dividendStocks.forEach(s => {
            const positionCost = s.avgCostNum * s.sharesNum;
            const value = s.marketValueNum;
            const monthlyDiv = s.monthlyDividendNum;
            const yieldOnCost = s.yieldOnCostPercentNum;
            const currentYield = s.currentYieldPercentNum;

            totalCost += positionCost;
            totalValue += value;
            totalMonthlyDiv += monthlyDiv;

            if (positionCost > 0) {
                weightedYieldOnCost += yieldOnCost * positionCost;
            }
            if (value > 0) {
                weightedCurrentYield += currentYield * value;
            }

            totalDividendsReceived += s.totalReceivedNum;
        });

        const avgYieldOnCost = totalCost > 0 ? weightedYieldOnCost / totalCost : 0;
        const avgCurrentYield = totalValue > 0 ? weightedCurrentYield / totalValue : 0;
        const divAdjustedCost = totalCost - totalDividendsReceived;
        const annualProjected = totalMonthlyDiv * 12;
        const divAdjYield = divAdjustedCost > 0 ? (annualProjected / divAdjustedCost) * 100 : 0;

        return [
            { label: 'Current Yield', value: formatPercent(avgCurrentYield) },
            { label: 'Yield on Cost', value: formatPercent(avgYieldOnCost) },
            { label: 'Div Adj. Avg Cost', value: formatCurrency(divAdjustedCost / Math.max(1, dividendStocks.length)) },
            { label: 'Div Adj. Yield', value: formatPercent(divAdjYield) },
            { label: 'TTM Yield', value: formatPercent(avgCurrentYield) },
            { label: 'Monthly Average', value: formatCurrency(totalMonthlyDiv) },
            { label: 'Annual Projected', value: formatCurrency(annualProjected) }
        ];
    });

    const backtestParamsData = {
        symbol: 'HYLD.TO',
        timeframe: '1W',
        shares: '10',
        startDate: '2024-01-01',
        endDate: '2025-07-29'
    };

    const runQuestrade = async () => {
        if (isLoading()) return; // Prevent multiple simultaneous calls
        
        setIsLoading(true);
        try {
            const account = selectedAccount();
            
            // Sync based on account selection
            if (account.personName) {
                // Sync specific person
                await syncPerson(account.personName, false);
            } else {
                // Sync all persons
                await syncAllPersons(false);
            }
            
            // Reload all data after sync
            await Promise.all([loadSummary(), loadPositions(), loadDividends(), loadAnalysis()]);
            setLastQuestradeRun(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Failed to run sync:', err);
        } finally {
            setIsLoading(false);
        }
    };

    onMount(async () => {
        console.log('App mounted, loading initial data...');
        // Load initial data
        await Promise.all([loadSummary(), loadPositions(), loadDividends(), loadAnalysis()]);

        // Refresh positions every 30 seconds for less frequent updates
        const refreshInterval = setInterval(loadPositions, 30000);

        onCleanup(() => {
            clearInterval(refreshInterval);
            if (pollingCleanup) {
                pollingCleanup();
            }
            stopQuoteStream();
        });
    });

    return (
        <div>
            <Header 
                selectedAccount={selectedAccount}
                onAccountChange={handleAccountChange}
                runQuestrade={runQuestrade} 
                lastRun={lastQuestradeRun}
                isLoading={isLoading}
            />
            <NotificationSystem selectedAccount={selectedAccount} />
            {isLoading() && (
                <div class="spinner">⟲</div>
            )}
            <div class="container">
                <StatsGrid stats={statsData()} selectedAccount={selectedAccount} />
                <div class="main-content">
                    <Sidebar 
                        activeTab={activeTab} 
                        setActiveTab={setActiveTab}
                        isCollapsed={isSidebarCollapsed}
                        setIsCollapsed={setIsSidebarCollapsed}
                    />
                    <ContentArea
                        activeTab={activeTab}
                        stockData={stockData}
                        portfolioSummaryData={portfolioSummaryData()}
                        dividendCardsData={[]}
                        yieldCalculatorData={[]}
                        dividendCalendarData={dividendCalendarData()}
                        portfolioDividendMetrics={portfolioDividendMetrics}
                        backtestParamsData={backtestParamsData}
                        setLoading={setIsLoading}
                        portfolioAnalysisData={portfolioAnalysisData}
                        selectedAccount={selectedAccount}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;