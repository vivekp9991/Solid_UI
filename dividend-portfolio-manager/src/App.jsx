// src/App.jsx
import { createSignal, onMount, onCleanup, createMemo, createEffect } from 'solid-js';
import Header from './components/Header';
import StatsGrid from './components/StatsGrid';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';
import { 
    fetchPortfolioSummary, 
    fetchPositions, 
    fetchDividendCalendar, 
    syncAllPersons, 
    fetchPortfolioAnalysis,
    fetchDropdownOptions
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
        return isNaN(n) ? '$0.00' : `${n.toFixed(2)}`;
    };

    const formatPercent = (num) => {
        const n = Number(num);
        return isNaN(n) ? '0%' : `${n.toFixed(2)}%`;
    };

    // Handle account selection changes
    const handleAccountChange = (newSelection) => {
        setSelectedAccount(newSelection);
    };

    // Load data based on selected account
    createEffect(async () => {
        const account = selectedAccount();
        console.log('Account selection changed:', account);
        
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
            const data = await fetchPositions(account, account.aggregate);
            const positions = Array.isArray(data) ? data : [];

            if (positions.length > 0) {
                const formattedStocks = positions.map(pos => {
                    const sharesNum = Number(pos.openQuantity) || 0;
                    const avgCostNum = Number(pos.averageEntryPrice) || 0;
                    const currentPriceNum = Number(pos.currentPrice) || 0;
                    const marketValueNum = currentPriceNum * sharesNum;
                    const totalCostNum = avgCostNum * sharesNum;
                    
                    const dividendData = pos.dividendData || {};
                    
                    const dividendPerShare =
                        pos.dividendPerShare !== undefined
                            ? Number(pos.dividendPerShare) || 0
                            : dividendData.monthlyDividendPerShare ||
                              (sharesNum > 0
                                  ? (dividendData.monthlyDividend || 0) / sharesNum
                                  : 0);

                    const annualDividendPerShare = (dividendPerShare * 12);
                    const monthlyDividendTotal = dividendPerShare * sharesNum;
                    const annualDividendTotal = annualDividendPerShare * sharesNum;
                    const totalReceivedNum = Number(dividendData.totalReceived) || 0;
                    
                    const isDividendStock = totalReceivedNum > 0 || dividendPerShare > 0;
                    
                    const currentYieldPercentNum = currentPriceNum > 0
                        ? (annualDividendPerShare / currentPriceNum) * 100
                        : 0;
                    
                    const yieldOnCostPercentNum = avgCostNum > 0
                        ? (annualDividendPerShare / avgCostNum) * 100
                        : 0;
                    
                    const dividendReturnPercentNum = totalCostNum > 0 
                        ? (totalReceivedNum / totalCostNum) * 100 
                        : 0;
                    
                    const divAdjCostPerShare = sharesNum > 0 
                        ? avgCostNum - (totalReceivedNum / sharesNum) 
                        : avgCostNum;
                    
                    const divAdjYieldPercentNum = divAdjCostPerShare > 0 
                        ? (annualDividendPerShare / divAdjCostPerShare) * 100 
                        : 0;
                    
                    const capitalGainValue = marketValueNum - totalCostNum;
                    const capitalGainPercent = totalCostNum > 0 
                        ? (capitalGainValue / totalCostNum) * 100 
                        : 0;
                    
                    const totalReturnValue = capitalGainValue + totalReceivedNum;
                    const totalReturnPercent = totalCostNum > 0 
                        ? (totalReturnValue / totalCostNum) * 100 
                        : 0;

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
                        totalReturn: formatPercent(totalReturnPercent),
                        totalReturnPercentNum: totalReturnPercent,
                        currentYield: isDividendStock ? formatPercent(currentYieldPercentNum) : '0%',
                        currentYieldPercentNum: isDividendStock ? currentYieldPercentNum : 0,
                        marketValue: formatCurrency(marketValueNum),
                        marketValueNum,
                        capitalGrowth: formatPercent(capitalGainPercent),
                        capitalGainPercentNum: capitalGainPercent,
                        dividendReturn: isDividendStock ? formatPercent(dividendReturnPercentNum) : '0%',
                        dividendReturnPercentNum: isDividendStock ? dividendReturnPercentNum : 0,
                        yieldOnCost: isDividendStock ? formatPercent(yieldOnCostPercentNum) : '0%',
                        yieldOnCostPercentNum: isDividendStock ? yieldOnCostPercentNum : 0,
                        divAdjCost: isDividendStock ? formatCurrency(divAdjCostPerShare) : formatCurrency(avgCostNum),
                        divAdjCostNum: isDividendStock ? divAdjCostPerShare : avgCostNum,
                        divAdjYield: isDividendStock ? formatPercent(divAdjYieldPercentNum) : '0%',
                        divAdjYieldPercentNum: isDividendStock ? divAdjYieldPercentNum : 0,
                        monthlyDiv: isDividendStock ? formatCurrency(monthlyDividendTotal) : '$0.00',
                        monthlyDividendNum: monthlyDividendTotal,
                        dividendPerShare: formatCurrency(dividendPerShare),
                        dividendPerShareNum: dividendPerShare,
                        annualDividendPerShare,
                        openPriceNum: Number(pos.openPrice) || 0,
                        todayChange: '$0.00 (0.00%)',
                        todayChangeValueNum: 0,
                        todayChangePercentNum: 0,
                        valueWoDiv: formatCurrency(marketValueNum - totalReceivedNum),
                        annualDividendNum: annualDividendTotal,
                        totalReceivedNum,
                        totalCostNum,
                        isDividendStock,
                        // Add aggregation info if available
                        isAggregated: pos.isAggregated || false,
                        sourceAccounts: pos.sourceAccounts || [],
                        accountCount: pos.accountCount || 1,
                        individualPositions: (pos.individualPositions || []).map(p => ({
                            accountName: p.accountName,
                            accountType: p.accountType,
                            shares: String(p.shares ?? p.openQuantity ?? 0),
                            avgCost: formatCurrency(p.avgCost ?? p.averageEntryPrice ?? 0),
                            marketValue: formatCurrency(p.marketValue ?? 0)
                        }))
                    };
                });

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

    const handleQuoteUpdate = (quote) => {
        const price = quote.lastTradePrice || quote.price;
        if (!price || !quote.symbol) return;

        setStockData(prev => {
            return prev.map(s => {
                if (s.symbol !== quote.symbol) return s;

                const newPrice = price;
                const newMarketValue = newPrice * s.sharesNum;
                const totalCost = s.totalCostNum || (s.avgCostNum * s.sharesNum);
                
                const newCapitalValue = newMarketValue - totalCost;
                const newCapitalPercent = totalCost > 0 ? (newCapitalValue / totalCost) * 100 : 0;
                
                const newTotalReturnValue = newCapitalValue + s.totalReceivedNum;
                const newTotalPercent = totalCost > 0 ? (newTotalReturnValue / totalCost) * 100 : 0;
                
                const newCurrentYieldPercent = newPrice > 0 && s.annualDividendPerShare > 0
                    ? (s.annualDividendPerShare / newPrice) * 100 
                    : 0;
                
                const newValueWoDiv = newMarketValue - s.totalReceivedNum;

                return {
                    ...s,
                    currentPriceNum: newPrice,
                    marketValueNum: newMarketValue,
                    capitalGainPercentNum: newCapitalPercent,
                    totalReturnPercentNum: newTotalPercent,
                    currentYieldPercentNum: newCurrentYieldPercent,
                    current: formatCurrency(newPrice),
                    marketValue: formatCurrency(newMarketValue),
                    capitalGrowth: formatPercent(newCapitalPercent),
                    totalReturn: formatPercent(newTotalPercent),
                    currentYield: s.isDividendStock ? formatPercent(newCurrentYieldPercent) : '0%',
                    valueWoDiv: formatCurrency(newValueWoDiv),
                    dotColor: newTotalPercent >= 0 ? '#10b981' : '#ef4444'
                };
            });
        });

        updateStatsWithLivePrice();
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