// src/hooks/usePortfolioData.js - UPDATED WITH CASH BALANCE
import { createSignal, createMemo, createEffect } from 'solid-js';
import { 
    fetchPortfolioSummary, 
    fetchPositions, 
    fetchDividendCalendar, 
    fetchPortfolioAnalysis,
    fetchCashBalances 
} from '../api';
import { formatStockData, formatDividendCalendar } from '../services/formatters';
import { formatCurrency, formatPercent, convertToCAD } from '../utils/helpers';
import { DEFAULT_STATS } from '../utils/constants';

export function usePortfolioData(selectedAccount, usdCadRate) {
    const [stockData, setStockData] = createSignal([]);
    const [portfolioSummaryData, setPortfolioSummaryData] = createSignal([]);
    const [dividendCalendarData, setDividendCalendarData] = createSignal([]);
    const [portfolioAnalysisData, setPortfolioAnalysisData] = createSignal(null);
    const [statsData, setStatsData] = createSignal(DEFAULT_STATS);
    const [cashBalanceData, setCashBalanceData] = createSignal(null);

    // Process cash balance data based on selected account
    const processedCashBalance = createMemo(() => {
        const cashData = cashBalanceData();
        const account = selectedAccount();
        
        if (!cashData || !cashData.accounts || !account) {
            return {
                totalCAD: 0,
                totalUSD: 0,
                totalInCAD: 0,
                breakdown: [],
                displayText: 'No Cash Data'
            };
        }

        console.log('Processing cash balance for account:', account);
        console.log('Cash data:', cashData);

        const rate = usdCadRate();
        let filteredAccounts = [];

        // Filter accounts based on selected view mode
        if (account.viewMode === 'all') {
            // Show all accounts for all persons
            filteredAccounts = cashData.accounts;
        } else if (account.viewMode === 'person') {
            // Show accounts for specific person
            filteredAccounts = cashData.accounts.filter(acc => 
                acc.personName === account.personName
            );
        } else if (account.viewMode === 'account') {
            // Show specific account
            filteredAccounts = cashData.accounts.filter(acc => 
                acc.accountId === account.accountId
            );
        }

        console.log('Filtered accounts:', filteredAccounts);

        // Aggregate by account type
        const aggregation = {};
        let totalCAD = 0;
        let totalUSD = 0;

        filteredAccounts.forEach(acc => {
            const currency = acc.currency || 'CAD';
            const balance = Number(acc.cashBalance) || 0;
            const accountType = acc.accountType || 'Cash';

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

        // Create breakdown array for display
        const breakdown = Object.entries(aggregation)
            .filter(([_, balances]) => balances.CAD > 0 || balances.USD > 0)
            .map(([accountType, balances]) => {
                let displayValue = '';
                const cadBalance = balances.CAD;
                const usdBalance = balances.USD;
                
                if (cadBalance > 0 && usdBalance > 0) {
                    displayValue = `${formatCurrency(cadBalance)} + ${formatCurrency(usdBalance)} USD`;
                } else if (cadBalance > 0) {
                    displayValue = formatCurrency(cadBalance);
                } else if (usdBalance > 0) {
                    displayValue = `${formatCurrency(usdBalance)} USD`;
                }

                return {
                    accountType,
                    value: displayValue,
                    totalInCAD: cadBalance + convertToCAD(usdBalance, 'USD', rate)
                };
            })
            .sort((a, b) => b.totalInCAD - a.totalInCAD); // Sort by total value

        // Create display text
        let displayText = '';
        if (breakdown.length === 0) {
            displayText = 'No Cash';
        } else if (breakdown.length === 1) {
            displayText = `${breakdown[0].accountType}: ${breakdown[0].value}`;
        } else {
            displayText = breakdown.slice(0, 2)
                .map(item => `${item.accountType}: ${formatCurrency(item.totalInCAD)}`)
                .join(', ');
            if (breakdown.length > 2) {
                displayText += ` +${breakdown.length - 2} more`;
            }
        }

        return {
            totalCAD,
            totalUSD,
            totalInCAD,
            breakdown,
            displayText,
            accountCount: filteredAccounts.length
        };
    });

    const loadCashBalances = async () => {
        try {
            const account = selectedAccount();
            console.log('Loading cash balances for:', account);
            const cashData = await fetchCashBalances(account);
            console.log('Received cash data:', cashData);
            setCashBalanceData(cashData);
        } catch (error) {
            console.error('Failed to load cash balances:', error);
            setCashBalanceData({ accounts: [], summary: {} });
        }
    };

    const loadSummary = async () => {
        try {
            const account = selectedAccount();
            const summary = await fetchPortfolioSummary(account);
            
            if (summary) {
                let totalInvestmentCAD = 0;
                let currentValueCAD = 0;
                let unrealizedPnlCAD = 0;
                let totalDividendsReceivedCAD = 0;
                let monthlyDividendIncomeCAD = 0;
                let annualProjectedDividendCAD = 0;

                if (summary.accounts && Array.isArray(summary.accounts)) {
                    summary.accounts.forEach(acc => {
                        const currency = acc.currency || 'CAD';
                        totalInvestmentCAD += convertToCAD(acc.totalInvestment || 0, currency, usdCadRate());
                        currentValueCAD += convertToCAD(acc.currentValue || 0, currency, usdCadRate());
                        unrealizedPnlCAD += convertToCAD(acc.unrealizedPnl || 0, currency, usdCadRate());
                        totalDividendsReceivedCAD += convertToCAD(acc.totalDividendsReceived || 0, currency, usdCadRate());
                        monthlyDividendIncomeCAD += convertToCAD(acc.monthlyDividendIncome || 0, currency, usdCadRate());
                        annualProjectedDividendCAD += convertToCAD(acc.annualProjectedDividend || 0, currency, usdCadRate());
                    });
                } else {
                    const currency = summary.currency || 'CAD';
                    totalInvestmentCAD = convertToCAD(summary.totalInvestment || 0, currency, usdCadRate());
                    currentValueCAD = convertToCAD(summary.currentValue || 0, currency, usdCadRate());
                    unrealizedPnlCAD = convertToCAD(summary.unrealizedPnl || 0, currency, usdCadRate());
                    totalDividendsReceivedCAD = convertToCAD(summary.totalDividendsReceived || 0, currency, usdCadRate());
                    monthlyDividendIncomeCAD = convertToCAD(summary.monthlyDividendIncome || 0, currency, usdCadRate());
                    annualProjectedDividendCAD = convertToCAD(summary.annualProjectedDividend || 0, currency, usdCadRate());
                }

                const totalReturnValueCAD = unrealizedPnlCAD + totalDividendsReceivedCAD;
                
                const unrealizedPnlPercent = totalInvestmentCAD > 0
                    ? (unrealizedPnlCAD / totalInvestmentCAD) * 100
                    : 0;
                const totalReturnPercent = totalInvestmentCAD > 0
                    ? (totalReturnValueCAD / totalInvestmentCAD) * 100
                    : 0;
                const yieldOnCostPercent = totalInvestmentCAD > 0 && annualProjectedDividendCAD > 0
                    ? (annualProjectedDividendCAD / totalInvestmentCAD) * 100
                    : 0;

                // Get processed cash balance for the new card
                const cashBalance = processedCashBalance();

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
                    },
                    // NEW CASH BALANCE CARD
                    {
                        icon: '🏦',
                        background: '#06b6d4',
                        title: 'CASH BALANCE',
                        value: formatCurrency(cashBalance.totalInCAD),
                        subtitle: cashBalance.displayText,
                        tooltip: 'Available cash across selected accounts',
                        rawValue: cashBalance.totalInCAD,
                        positive: true,
                        isCashBalance: true,
                        breakdown: cashBalance.breakdown,
                        accountCount: cashBalance.accountCount
                    }
                ]);
                
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
            const data = await fetchPositions(account, account.aggregate);
            const positions = Array.isArray(data) ? data : [];
            
            if (positions.length > 0) {
                const formattedStocks = formatStockData(positions, usdCadRate());
                setStockData(formattedStocks);
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
                const formattedCalendar = formatDividendCalendar(calendar, usdCadRate());
                setDividendCalendarData(formattedCalendar);
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

    const loadAllData = async () => {
        await Promise.all([
            loadSummary(),
            loadPositions(),
            loadDividends(),
            loadAnalysis(),
            loadCashBalances()
        ]);
    };

    // Portfolio dividend metrics computed value
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

    return {
        stockData,
        portfolioSummaryData,
        dividendCalendarData,
        portfolioAnalysisData,
        statsData,
        portfolioDividendMetrics,
        cashBalanceData,
        processedCashBalance,
        setStockData,
        loadAllData,
        loadSummary,
        loadPositions,
        loadDividends,
        loadAnalysis,
        loadCashBalances
    };
}