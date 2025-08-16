// src/App.jsx - COMPLETE FIXED VERSION WITH USD/CAD CONVERSION
import { createSignal, onMount, onCleanup, createMemo, createEffect } from 'solid-js';
import Header from './components/Header';
import StatsGrid from './components/StatsGrid';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';
import NotificationSystem from './components/NotificationSystem';
import CashBalanceBar from './components/CashBalanceBar';
import { 
    fetchPortfolioSummary, 
    fetchPositions, 
    fetchDividendCalendar, 
    syncAllPersons, 
    fetchPortfolioAnalysis,
    fetchDropdownOptions,
    syncPerson,
    fetchExchangeRate, // This was already there
    fetchCashBalances   // ADD THIS LINE
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

    // Exchange rate state
    const [usdCadRate, setUsdCadRate] = createSignal(1.35); // Default rate

    // UPDATED: Enhanced stats data structure
    const [statsData, setStatsData] = createSignal([
        { icon: '💰', background: '#f59e0b', title: 'TOTAL INVESTMENT', value: '$0.00', subtitle: '0 positions', tooltip: 'Total invested (CAD equivalent)' },
        { icon: '📈', background: '#10b981', title: 'CURRENT VALUE', value: '$0.00', subtitle: 'Live pricing', tooltip: 'Current market value (CAD)' },
        { icon: '📊', background: '#3b82f6', title: 'UNREALIZED P&L', value: '$0.00', subtitle: '0%', positive: false, tooltip: 'Capital gains/losses' },
        { icon: '💎', background: '#ef4444', title: 'TOTAL RETURN', value: '$0.00', subtitle: '0% (incl. dividends)', positive: false, tooltip: 'Total return with dividends' },
        { icon: '💵', background: '#8b5cf6', title: 'YIELD ON COST', value: '0.00%', subtitle: 'Average yield', tooltip: 'Dividend yield on cost basis' }
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
        return isNaN(n) ? '0.00%' : `${n.toFixed(2)}%`;
    };

    // Helper to convert USD to CAD
    const convertToCAD = (amount, currency) => {
        if (currency === 'USD') {
            return amount * usdCadRate();
        }
        return amount;
    };

    // Load exchange rate on mount and refresh periodically
    const loadExchangeRate = async () => {
        const rate = await fetchExchangeRate('USD', 'CAD');
        setUsdCadRate(rate);
        console.log('USD/CAD Exchange Rate:', rate);
    };

    // Enhanced today's change formatting with proper signs
    const formatTodayChange = (valueChange, percentChange) => {
        if (valueChange === undefined && percentChange === undefined) return '$0.00 (0.00%)';
        
        const value = Number(valueChange) || 0;
        const percent = Number(percentChange) || 0;
        
        // Format with proper signs
        const valueStr = value >= 0 ? `+$${Math.abs(value).toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
        const percentStr = percent >= 0 ? `+${Math.abs(percent).toFixed(2)}%` : `-${Math.abs(percent).toFixed(2)}%`;
        
        return `${valueStr} (${percentStr})`;
    };

    // Helper function to determine if a stock pays dividends
    const isDividendPayingStock = (position) => {
        const dividendData = position.dividendData || {};
        const totalReceived = Number(dividendData.totalReceived) || 0;
        const monthlyDividend = Number(dividendData.monthlyDividendPerShare) || 
                              Number(dividendData.monthlyDividend) || 0;
        const annualDividend = Number(dividendData.annualDividend) || 0;
        const dividendPerShare = Number(position.dividendPerShare) || 0;
        
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
        
        // Load exchange rate first
        await loadExchangeRate();
        
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
                // FIXED: Convert USD amounts to CAD for aggregation
                let totalInvestmentCAD = 0;
                let currentValueCAD = 0;
                let unrealizedPnlCAD = 0;
                let totalDividendsReceivedCAD = 0;
                let monthlyDividendIncomeCAD = 0;
                let annualProjectedDividendCAD = 0;

                // Check if summary has account-specific data with currency info
                if (summary.accounts && Array.isArray(summary.accounts)) {
                    summary.accounts.forEach(acc => {
                        const currency = acc.currency || 'CAD';
                        totalInvestmentCAD += convertToCAD(acc.totalInvestment || 0, currency);
                        currentValueCAD += convertToCAD(acc.currentValue || 0, currency);
                        unrealizedPnlCAD += convertToCAD(acc.unrealizedPnl || 0, currency);
                        totalDividendsReceivedCAD += convertToCAD(acc.totalDividendsReceived || 0, currency);
                        monthlyDividendIncomeCAD += convertToCAD(acc.monthlyDividendIncome || 0, currency);
                        annualProjectedDividendCAD += convertToCAD(acc.annualProjectedDividend || 0, currency);
                    });
                } else {
                    // Fallback to summary totals (assume they need conversion if account is USD)
                    const currency = summary.currency || 'CAD';
                    totalInvestmentCAD = convertToCAD(summary.totalInvestment || 0, currency);
                    currentValueCAD = convertToCAD(summary.currentValue || 0, currency);
                    unrealizedPnlCAD = convertToCAD(summary.unrealizedPnl || 0, currency);
                    totalDividendsReceivedCAD = convertToCAD(summary.totalDividendsReceived || 0, currency);
                    monthlyDividendIncomeCAD = convertToCAD(summary.monthlyDividendIncome || 0, currency);
                    annualProjectedDividendCAD = convertToCAD(summary.annualProjectedDividend || 0, currency);
                }

                const totalReturnValueCAD = unrealizedPnlCAD + totalDividendsReceivedCAD;
                
                // Calculate percentages
                const unrealizedPnlPercent = totalInvestmentCAD > 0
                    ? (unrealizedPnlCAD / totalInvestmentCAD) * 100
                    : 0;
                const totalReturnPercent = totalInvestmentCAD > 0
                    ? (totalReturnValueCAD / totalInvestmentCAD) * 100
                    : 0;
                const yieldOnCostPercent = totalInvestmentCAD > 0 && annualProjectedDividendCAD > 0
                    ? (annualProjectedDividendCAD / totalInvestmentCAD) * 100
                    : 0;

                // UPDATED: Set enhanced stats with all required fields
                setStatsData([
                    {
                        icon: '💰',
                        background: '#f59e0b',
                        title: 'TOTAL INVESTMENT',
                        value: formatCurrency(totalInvestmentCAD),
                        subtitle: `${summary.numberOfPositions || 0} positions`,
                        tooltip: 'Total invested (CAD equivalent)',
                        rawValue: totalInvestmentCAD
                    },
                    {
                        icon: '📈',
                        background: '#10b981',
                        title: 'CURRENT VALUE',
                        value: formatCurrency(currentValueCAD),
                        subtitle: 'Live pricing (CAD)',
                        tooltip: 'Current market value in CAD',
                        rawValue: currentValueCAD
                    },
                    {
                        icon: '📊',
                        background: '#3b82f6',
                        title: 'UNREALIZED P&L',
                        value: formatCurrency(unrealizedPnlCAD),
                        subtitle: `${formatPercent(unrealizedPnlPercent)}`,
                        positive: unrealizedPnlCAD >= 0,
                        tooltip: 'Capital gains/losses',
                        rawValue: unrealizedPnlCAD,
                        percentValue: unrealizedPnlPercent
                    },
                    {
                        icon: '💎',
                        background: '#ef4444',
                        title: 'TOTAL RETURN',
                        value: formatCurrency(totalReturnValueCAD),
                        subtitle: `${formatPercent(totalReturnPercent)} (incl. dividends)`,
                        positive: totalReturnValueCAD >= 0,
                        tooltip: 'Total return including dividends',
                        rawValue: totalReturnValueCAD,
                        percentValue: totalReturnPercent
                    },
                    {
                        icon: '💵',
                        background: '#8b5cf6',
                        title: 'YIELD ON COST',
                        value: formatPercent(yieldOnCostPercent),
                        subtitle: `$${monthlyDividendIncomeCAD.toFixed(2)}/month`,
                        tooltip: 'Average dividend yield on cost basis',
                        rawValue: yieldOnCostPercent,
                        positive: true
                    }
                ]);
                
                // Update portfolio summary for analysis tab
                setPortfolioSummaryData([
                    {
                        title: 'Total Portfolio',
                        rows: [
                            { label: 'Investment (CAD):', value: formatCurrency(totalInvestmentCAD) },
                            { label: 'Current Value (CAD):', value: formatCurrency(currentValueCAD) },
                            { label: 'Total Return:', value: formatCurrency(totalReturnValueCAD), positive: totalReturnValueCAD >= 0 }
                        ]
                    },
                    {
                        title: 'Monthly Income',
                        rows: [
                            { label: 'Current:', value: formatCurrency(monthlyDividendIncomeCAD) },
                            { label: 'Annual Projected:', value: formatCurrency(annualProjectedDividendCAD) }
                        ]
                    },
                    {
                        title: 'Dividend Metrics',
                        rows: [
                            { label: 'Yield on Cost:', value: formatPercent(yieldOnCostPercent) },
                            { label: 'Avg Current Yield:', value: formatPercent(summary.averageYieldPercent) }
                        ]
                    },
                    {
                        title: 'Performance',
                        rows: [
                            { label: 'Total Return:', value: formatPercent(totalReturnPercent), positive: totalReturnPercent >= 0 },
                            { label: 'Positions:', value: String(summary.numberOfPositions || 0) },
                            { label: 'USD/CAD Rate:', value: usdCadRate().toFixed(4) }
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
                    const currency = pos.currency || 'CAD';
                    const sharesNum = Number(pos.openQuantity) || 0;
                    const avgCostNum = Number(pos.averageEntryPrice) || 0;
                    const currentPriceNum = Number(pos.currentPrice) || 0;
                    const openPriceNum = Number(pos.openPrice) || currentPriceNum;
                    
                    // Convert to CAD for aggregation
                    const avgCostCAD = convertToCAD(avgCostNum, currency);
                    const currentPriceCAD = convertToCAD(currentPriceNum, currency);
                    const openPriceCAD = convertToCAD(openPriceNum, currency);
                    
                    const marketValueCAD = currentPriceCAD * sharesNum;
                    const totalCostCAD = avgCostCAD * sharesNum;
                    
                    const dividendData = pos.dividendData || {};
                    
                    // Determine if this stock actually pays dividends
                    const isDividendStock = isDividendPayingStock(pos);
                    
                    // Calculate dividend metrics
                    let dividendPerShare = 0;
                    let annualDividendPerShare = 0;
                    let monthlyDividendTotal = 0;
                    let annualDividendTotal = 0;
                    let currentYieldPercentNum = 0;
                    let yieldOnCostPercentNum = 0;
                    let dividendReturnPercentNum = 0;
                    let divAdjCostPerShare = avgCostCAD;
                    let divAdjYieldPercentNum = 0;
                    
                    const totalReceivedNum = convertToCAD(Number(dividendData.totalReceived) || 0, currency);
                    
                    if (isDividendStock) {
                        dividendPerShare = pos.dividendPerShare !== undefined
                            ? convertToCAD(Number(pos.dividendPerShare) || 0, currency)
                            : convertToCAD(dividendData.monthlyDividendPerShare || 0, currency);

                        annualDividendPerShare = dividendPerShare * 12;
                        monthlyDividendTotal = dividendPerShare * sharesNum;
                        annualDividendTotal = annualDividendPerShare * sharesNum;
                        
                        currentYieldPercentNum = currentPriceCAD > 0 && annualDividendPerShare > 0
                            ? (annualDividendPerShare / currentPriceCAD) * 100
                            : 0;
                        
                        yieldOnCostPercentNum = avgCostCAD > 0 && annualDividendPerShare > 0
                            ? (annualDividendPerShare / avgCostCAD) * 100
                            : 0;
                        
                        dividendReturnPercentNum = totalCostCAD > 0 && totalReceivedNum > 0
                            ? (totalReceivedNum / totalCostCAD) * 100 
                            : 0;
                        
                        divAdjCostPerShare = sharesNum > 0 && totalReceivedNum > 0
                            ? avgCostCAD - (totalReceivedNum / sharesNum) 
                            : avgCostCAD;
                        
                        divAdjYieldPercentNum = divAdjCostPerShare > 0 && annualDividendPerShare > 0
                            ? (annualDividendPerShare / divAdjCostPerShare) * 100 
                            : 0;
                    }
                    
                    const capitalGainValue = marketValueCAD - totalCostCAD;
                    const capitalGainPercent = totalCostCAD > 0 
                        ? (capitalGainValue / totalCostCAD) * 100 
                        : 0;
                    
                    const totalReturnValue = capitalGainValue + totalReceivedNum;
                    const totalReturnPercent = totalCostCAD > 0 
                        ? (totalReturnValue / totalCostCAD) * 100 
                        : 0;

                    // Calculate today's change
                    const todayChangeValueNum = (currentPriceCAD - openPriceCAD) * sharesNum;
                    const todayChangePercentNum = openPriceCAD > 0 
                        ? ((currentPriceCAD - openPriceCAD) / openPriceCAD) * 100 
                        : 0;

                    // Handle aggregation data
                    const isAggregated = pos.isAggregated || false;
                    const sourceAccounts = pos.sourceAccounts || [];
                    const accountCount = pos.accountCount || 1;
                    const individualPositions = pos.individualPositions || [];

                    return {
                        symbol: pos.symbol || '',
                        company: pos.symbol || '',
                        currency: currency,
                        dotColor: totalReturnPercent >= 0 ? '#10b981' : '#ef4444',
                        shares: String(sharesNum),
                        sharesNum,
                        avgCost: formatCurrency(avgCostCAD),
                        avgCostNum: avgCostCAD,
                        current: formatCurrency(currentPriceCAD),
                        currentPriceNum: currentPriceCAD,
                        openPrice: formatCurrency(openPriceCAD),
                        openPriceNum: openPriceCAD,
                        totalReturn: formatPercent(totalReturnPercent),
                        totalReturnPercentNum: totalReturnPercent,
                        currentYield: isDividendStock ? formatPercent(currentYieldPercentNum) : '0.00%',
                        currentYieldPercentNum: isDividendStock ? currentYieldPercentNum : 0,
                        marketValue: formatCurrency(marketValueCAD),
                        marketValueNum: marketValueCAD,
                        capitalGrowth: formatPercent(capitalGainPercent),
                        capitalGainPercentNum: capitalGainPercent,
                        dividendReturn: isDividendStock ? formatPercent(dividendReturnPercentNum) : '0.00%',
                        dividendReturnPercentNum: isDividendStock ? dividendReturnPercentNum : 0,
                        yieldOnCost: isDividendStock ? formatPercent(yieldOnCostPercentNum) : 'N/A',
                        yieldOnCostPercentNum: isDividendStock ? yieldOnCostPercentNum : 0,
                        divAdjCost: isDividendStock ? formatCurrency(divAdjCostPerShare) : 'N/A',
                        divAdjCostNum: isDividendStock ? divAdjCostPerShare : avgCostCAD,
                        divAdjYield: isDividendStock ? formatPercent(divAdjYieldPercentNum) : 'N/A',
                        divAdjYieldPercentNum: isDividendStock ? divAdjYieldPercentNum : 0,
                        monthlyDiv: isDividendStock ? formatCurrency(monthlyDividendTotal) : '$0.00',
                        monthlyDividendNum: monthlyDividendTotal,
                        dividendPerShare: isDividendStock ? formatCurrency(dividendPerShare) : '$0.00',
                        dividendPerShareNum: dividendPerShare,
                        annualDividendPerShare,
                        todayChange: formatTodayChange(todayChangeValueNum, todayChangePercentNum),
                        todayChangeValueNum,
                        todayChangePercentNum,
                        valueWoDiv: formatCurrency(marketValueCAD - totalReceivedNum),
                        annualDividendNum: annualDividendTotal,
                        totalReceivedNum,
                        totalCostNum: totalCostCAD,
                        isDividendStock,
                        isAggregated,
                        sourceAccounts,
                        accountCount,
                        lastUpdateTime: null,
                        individualPositions: individualPositions.map(p => ({
                            accountName: p.accountName || 'Unknown Account',
                            accountType: p.accountType || 'Unknown Type',
                            shares: String(p.shares ?? p.openQuantity ?? 0),
                            avgCost: formatCurrency(convertToCAD(p.avgCost ?? p.averageEntryPrice ?? 0, p.currency || 'CAD')),
                            marketValue: formatCurrency(convertToCAD(p.marketValue ?? (p.currentPrice * (p.shares ?? p.openQuantity ?? 0)) ?? 0, p.currency || 'CAD'))
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
                        amount: formatCurrency(Math.abs(convertToCAD(d.netAmount || d.amount || 0, d.currency || 'CAD'))),
                        date: d.transactionDate ? new Date(d.transactionDate).toLocaleDateString() : 'N/A',
                        currency: d.currency || 'CAD'
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

    // Enhanced quote update handler with CAD conversion
    const handleQuoteUpdate = (quote) => {
        const price = quote.lastTradePrice || quote.price;
        if (!price || !quote.symbol) return;

        console.log(`📈 Processing quote update for ${quote.symbol}: ${price}`);

        setStockData(prevStocks => {
            let hasChanges = false;
            
            const newStocks = prevStocks.map(stock => {
                if (stock.symbol !== quote.symbol) return stock;

                const currency = stock.currency || 'CAD';
                const newPrice = convertToCAD(price, currency);
                const openPrice = convertToCAD(quote.openPrice || stock.openPriceNum || newPrice, currency);
                
                if (Math.abs(newPrice - stock.currentPriceNum) < 0.001) {
                    return stock;
                }

                hasChanges = true;
                console.log(`💰 Price change detected for ${stock.symbol}: ${stock.currentPriceNum} → ${newPrice}`);
                
                const newMarketValue = newPrice * stock.sharesNum;
                const totalCost = stock.totalCostNum || (stock.avgCostNum * stock.sharesNum);
                
                const newCapitalValue = newMarketValue - totalCost;
                const newCapitalPercent = totalCost > 0 ? (newCapitalValue / totalCost) * 100 : 0;
                
                const newTotalReturnValue = newCapitalValue + stock.totalReceivedNum;
                const newTotalPercent = totalCost > 0 ? (newTotalReturnValue / totalCost) * 100 : 0;
                
                const newCurrentYieldPercent = stock.isDividendStock && newPrice > 0 && stock.annualDividendPerShare > 0
                    ? (stock.annualDividendPerShare / newPrice) * 100 
                    : 0;
                
                const newValueWoDiv = newMarketValue - stock.totalReceivedNum;

                const todayChangeValue = (newPrice - openPrice) * stock.sharesNum;
                const todayChangePercent = openPrice > 0 ? ((newPrice - openPrice) / openPrice) * 100 : 0;

                return {
                    ...stock,
                    currentPriceNum: newPrice,
                    openPriceNum: openPrice,
                    marketValueNum: newMarketValue,
                    capitalGainPercentNum: newCapitalPercent,
                    totalReturnPercentNum: newTotalPercent,
                    currentYieldPercentNum: newCurrentYieldPercent,
                    todayChangeValueNum: todayChangeValue,
                    todayChangePercentNum: todayChangePercent,
                    lastUpdateTime: Date.now(),
                    current: formatCurrency(newPrice),
                    openPrice: formatCurrency(openPrice),
                    marketValue: formatCurrency(newMarketValue),
                    capitalGrowth: formatPercent(newCapitalPercent),
                    totalReturn: formatPercent(newTotalPercent),
                    currentYield: stock.isDividendStock ? formatPercent(newCurrentYieldPercent) : '0.00%',
                    valueWoDiv: formatCurrency(newValueWoDiv),
                    todayChange: formatTodayChange(todayChangeValue, todayChangePercent),
                    dotColor: newTotalPercent >= 0 ? '#10b981' : '#ef4444'
                };
            });

            if (hasChanges) {
                console.log(`✅ Stock data updated with new prices`);
                updateStatsWithLivePrice();
                return newStocks;
            }
            
            return prevStocks;
        });
    };

    const updateStatsWithLivePrice = () => {
        const stocks = stockData();
        if (stocks.length === 0) return;

        const totalValue = stocks.reduce((sum, s) => sum + s.marketValueNum, 0);
        const totalCost = stocks.reduce((sum, s) => sum + s.totalCostNum, 0);
        const unrealizedPnl = totalValue - totalCost;
        const unrealizedPnlPercent = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;
        const totalDividendsReceived = stocks.reduce((sum, s) => sum + s.totalReceivedNum, 0);
        const totalReturnValue = unrealizedPnl + totalDividendsReceived;
        const totalReturnPercent = totalCost > 0 ? (totalReturnValue / totalCost) * 100 : 0;
        
        // Calculate yield on cost
        const totalAnnualDividends = stocks.reduce((sum, s) => sum + s.annualDividendNum, 0);
        const yieldOnCostPercent = totalCost > 0 && totalAnnualDividends > 0
           ? (totalAnnualDividends / totalCost) * 100
           : 0;

       setStatsData(prev => [
           { ...prev[0], value: formatCurrency(totalCost) },
           { ...prev[1], value: formatCurrency(totalValue) },
           {
               ...prev[2],
               value: formatCurrency(unrealizedPnl),
               subtitle: formatPercent(unrealizedPnlPercent),
               positive: unrealizedPnl >= 0,
               rawValue: unrealizedPnl,
               percentValue: unrealizedPnlPercent
           },
           {
               ...prev[3],
               value: formatCurrency(totalReturnValue),
               subtitle: `${formatPercent(totalReturnPercent)} (incl. dividends)`,
               positive: totalReturnValue >= 0,
               rawValue: totalReturnValue,
               percentValue: totalReturnPercent
           },
           {
               ...prev[4],
               value: formatPercent(yieldOnCostPercent),
               subtitle: `$${(totalAnnualDividends / 12).toFixed(2)}/month`,
               rawValue: yieldOnCostPercent
           }
       ]);
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
           const positionCost = s.totalCostNum;
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
       if (isLoading()) return;
       
       setIsLoading(true);
       try {
           const account = selectedAccount();
           
           if (account.personName) {
               await syncPerson(account.personName, false);
           } else {
               await syncAllPersons(false);
           }
           
           // Reload exchange rate and all data after sync
           await loadExchangeRate();
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
       // Load exchange rate first
       await loadExchangeRate();
       // Load initial data
       await Promise.all([loadSummary(), loadPositions(), loadDividends(), loadAnalysis()]);

       // Refresh exchange rate every 30 minutes
       const exchangeRateInterval = setInterval(loadExchangeRate, 30 * 60 * 1000);

       // Refresh positions every 30 seconds
       const refreshInterval = setInterval(loadPositions, 30000);

       onCleanup(() => {
           clearInterval(exchangeRateInterval);
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
        <CashBalanceBar /> {/* ADD THIS LINE - Cash balance bar below header */}
        <NotificationSystem selectedAccount={selectedAccount} />
        {isLoading() && (
            <div class="spinner">⟲</div>
        )}
        <div class="container">
            <StatsGrid 
                stats={statsData()} 
                selectedAccount={selectedAccount}
                usdCadRate={usdCadRate}
            />
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