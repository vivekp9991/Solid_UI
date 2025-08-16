// src/hooks/usePortfolioData.js
import { createSignal, createMemo, createEffect } from 'solid-js';
import { 
    fetchPortfolioSummary, 
    fetchPositions, 
    fetchDividendCalendar, 
    fetchPortfolioAnalysis 
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
            loadAnalysis()
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
        setStockData,
        loadAllData,
        loadSummary,
        loadPositions,
        loadDividends,
        loadAnalysis
    };
}