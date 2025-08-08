import { createSignal, onMount, createMemo } from 'solid-js';
import Header from './components/Header';
import StatsGrid from './components/StatsGrid';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';
import { fetchPortfolioSummary, fetchPositions, fetchDividendCalendar, runPortfolioSync, fetchPortfolioAnalysis } from './api';
import { startQuoteStream } from './streaming';

function App() {
    // Static data from original HTML
    const [statsData, setStatsData] = createSignal([
        { icon: '💰', background: '#f59e0b', title: 'TOTAL INVESTMENT', value: '$0.00', subtitle: '0 positions' },
        { icon: '📈', background: '#10b981', title: 'CURRENT VALUE', value: '$0.00', subtitle: 'Live pricing' },
        { icon: '📊', background: '#3b82f6', title: 'UNREALIZED P&L', value: '$0.00', subtitle: '0%', positive: false },
        { icon: '💎', background: '#ef4444', title: 'TOTAL RETURN', value: '$0.00', subtitle: '0%', positive: false }
    ]);

    const [stockData, setStockData] = createSignal([]);

    const [portfolioSummaryData, setPortfolioSummaryData] = createSignal([
        {
            title: 'Total Portfolio',
            rows: [
                { label: 'Investment:', value: '$0.00' },
                { label: 'Current Value:', value: '$0.00' },
                { label: 'Total Return:', value: '$0.00', positive: false }
            ]
        },
        {
            title: 'Monthly Income',
            rows: [
                { label: 'Current:', value: '$0.00' },
                { label: 'Annual Projected:', value: '$0.00' }
            ]
        },
        {
            title: 'Dividend Metrics',
            rows: [
                { label: 'Avg Yield on Cost:', value: '0%' },
                { label: 'Avg Current Yield:', value: '0%' }
            ]
        },
        {
            title: 'Performance',
            rows: [
                { label: 'Total Return:', value: '0%', positive: false },
                { label: 'Positions:', value: '0' }
            ]
        }
    ]);

    const dividendCardsData = [
        { icon: '📈', background: '#f59e0b', title: 'DIVIDEND STOCKS', value: '0', subtitle: 'Active positions' },
        { icon: '💰', background: '#3b82f6', title: 'MONTHLY INCOME', value: '$0.00', subtitle: 'Current monthly' },
        { icon: '📊', background: '#8b5cf6', title: 'AVG CURRENT YIELD', value: '0%', subtitle: 'Real-time calculation' },
        { icon: '💎', background: '#8b5cf6', title: 'TOTAL DIVIDENDS', value: '$0.00', subtitle: 'All time received' }
    ];

    const yieldCalculatorData = [];

    const [dividendCalendarData, setDividendCalendarData] = createSignal([]);
    const [portfolioAnalysisData, setPortfolioAnalysisData] = createSignal(null);

    const formatCurrency = (num) => {
        const n = Number(num);
        return isNaN(n) ? '$0.00' : `$${n.toFixed(2)}`;
    };

    const formatPercent = (num) => {
        const n = Number(num);
        return isNaN(n) ? '0%' : `${n.toFixed(2)}%`;
    };

    const loadSummary = async () => {
        try {
            const summary = await fetchPortfolioSummary();
            if (summary) {
                // Calculate percentages
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

                // Update portfolio analysis data
                setPortfolioAnalysisData({
                    currentGainPercent: unrealizedPnlPercent,
                    dividendsYieldPercent: summary.averageYieldPercent || 0,
                    totalReturnsValue: summary.totalReturnValue || 0,
                    overview: {
                        totalInvestment: summary.totalInvestment || 0,
                        currentValue: summary.currentValue || 0,
                        totalReturnValue: summary.totalReturnValue || 0,
                        returnPercent: totalReturnPercent,
                        numberOfPositions: summary.numberOfPositions || 0,
                        averagePositionSize: (summary.totalInvestment || 0) / Math.max(1, summary.numberOfPositions || 1),
                        largestPosition: { value: 0, symbol: 'N/A' }
                    },
                    dividendAnalysis: {
                        currentYieldPercent: summary.averageYieldPercent || 0,
                        yieldOnCostPercent: summary.yieldOnCostPercent || 0,
                        dividendAdjustedAverageCost: 0,
                        dividendAdjustedYieldPercent: 0,
                        ttmYieldPercent: 0,
                        monthlyAverage: summary.monthlyDividendIncome || 0,
                        annualProjected: summary.annualProjectedDividend || 0
                    },
                    performanceBreakdown: {
                        capitalGainsValue: summary.unrealizedPnl || 0,
                        dividendIncomeValue: summary.totalDividends || 0,
                        capitalGainsPercent: unrealizedPnlPercent,
                        dividendReturnPercent: (summary.totalDividends || 0) / Math.max(1, summary.totalInvestment || 1) * 100,
                        bestPerformingStock: null,
                        monthlyIncome: summary.monthlyDividendIncome || 0,
                        annualProjectedIncome: summary.annualProjectedDividend || 0
                    },
                    riskMetrics: {
                        portfolioConcentration: 'N/A',
                        largestPositionWeight: 'N/A',
                        sectorConcentration: 'N/A',
                        geographicExposure: 'N/A',
                        dividendDependency: 'N/A',
                        yieldStability: 'N/A'
                    },
                    allocationAnalysis: {
                        assetWeights: {},
                        sectorWeights: {},
                        highYieldAssetsPercent: 0,
                        growthAssetsPercent: 0,
                        averageYieldPercent: summary.averageYieldPercent || 0
                    }
                });
            }
        } catch (err) {
            console.error('Failed to fetch portfolio summary', err);
        }
    };

    const loadPositions = async () => {
        try {
            const data = await fetchPositions();
            const positions = Array.isArray(data) ? data : [];
            
            if (positions.length > 0) {
                setStockData(
                    positions.map(pos => {
                        // Calculate derived values
                        const totalReturnPercent = pos.totalReturnPercent || 0;
                        const capitalGainPercent = pos.capitalGainPercent || totalReturnPercent;
                        const dividendReturnPercent = pos.dividendData?.dividendReturnPercent || 0;
                        
                        return {
                            symbol: pos.symbol || '',
                            company: pos.symbol || '', // Use symbol as company name if not provided
                            dotColor: totalReturnPercent >= 0 ? '#10b981' : '#ef4444',
                            shares: String(pos.openQuantity || 0),
                            avgCost: formatCurrency(pos.averageEntryPrice),
                            current: formatCurrency(pos.currentPrice),
                            totalReturn: formatPercent(totalReturnPercent),
                            currentYield: formatPercent(pos.dividendData?.yieldOnCost || 0),
                            marketValue: formatCurrency(pos.currentMarketValue),
                            capitalGrowth: formatPercent(capitalGainPercent),
                            dividendReturn: formatPercent(dividendReturnPercent),
                            yieldOnCost: formatPercent(pos.dividendData?.yieldOnCost || 0),
                            divAdjCost: formatCurrency(pos.dividendData?.dividendAdjustedCost || pos.averageEntryPrice),
                            divAdjYield: formatPercent(pos.dividendData?.yieldOnCost || 0),
                            monthlyDiv: formatCurrency(pos.dividendData?.monthlyDividend || 0),
                            valueWoDiv: formatCurrency((pos.currentMarketValue || 0) - (pos.dividendData?.totalReceived || 0))
                        };
                    })
                );
            }
        } catch (err) {
            console.error('Failed to fetch positions', err);
        }
    };

    const loadDividends = async () => {
        try {
            const calendar = await fetchDividendCalendar();
            if (Array.isArray(calendar)) {
                setDividendCalendarData(
                    calendar.map(d => ({
                        symbol: d.symbol || '',
                        amount: formatCurrency(d.netAmount || d.amount || 0),
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
            const analysis = await fetchPortfolioAnalysis();
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
        setStockData(prev =>
            prev.map(s =>
                s.symbol === quote.symbol
                    ? {
                        ...s,
                        current: formatCurrency(price),
                        marketValue: formatCurrency(price * parseFloat(s.shares || 0)),
                    }
                    : s
            )
        );
    };

    onMount(async () => {
        await Promise.all([loadSummary(), loadPositions(), loadDividends()]);
        startQuoteStream(stockData().map(s => s.symbol), handleQuoteUpdate);
        // Refresh positions every 10 seconds
        setInterval(loadPositions, 10000);
    });

    // Calculate portfolio dividend metrics based on current stock data
    const portfolioDividendMetrics = createMemo(() => {
        const data = stockData();
        if (!data || data.length === 0) return [];
        const avg = (key) => {
            const values = data
                .map(s => parseFloat((s[key] || '0').toString().replace(/[\$,%+]/g, '')))
                .filter(v => !isNaN(v));
            return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        };
        const sum = (key) => {
            const values = data
                .map(s => parseFloat((s[key] || '0').toString().replace(/[\$,%+]/g, '')))
                .filter(v => !isNaN(v));
            return values.length ? values.reduce((a, b) => a + b, 0) : 0;
        };
        const monthly = sum('monthlyDiv');
        return [
            { label: 'Current Yield', value: avg('currentYield').toFixed(2) + '%' },
            { label: 'Yield on Cost', value: avg('yieldOnCost').toFixed(2) + '%' },
            { label: 'Div Adj. Avg Cost', value: '$' + avg('divAdjCost').toFixed(2) },
            { label: 'Div Adj. Yield', value: avg('divAdjYield').toFixed(2) + '%' },
            { label: 'TTM Yield', value: '0%' },
            { label: 'Monthly Average', value: '$' + monthly.toFixed(2) },
            { label: 'Annual Projected', value: '$' + (monthly * 12).toFixed(2) }
        ];
    });

    const backtestParamsData = {
        symbol: 'HYLD.TO',
        timeframe: '1W',
        shares: '10',
        startDate: '2024-01-01',
        endDate: '2025-07-29'
    };

    const [isLoading, setIsLoading] = createSignal(false);
    const [lastQuestradeRun, setLastQuestradeRun] = createSignal('');

    const runQuestrade = async () => {
        setIsLoading(true);
        try {
            await runPortfolioSync();
            // Reload all data after sync
            await Promise.all([loadSummary(), loadPositions(), loadDividends()]);
            setLastQuestradeRun(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Failed to run questrade sync', err);
        } finally {
            setIsLoading(false);
        }
    };

    const [activeTab, setActiveTab] = createSignal('holdings');

    return (
        <div>
            <Header runQuestrade={runQuestrade} lastRun={lastQuestradeRun} />
            {isLoading() && (
                <div class="spinner">⟲</div>
            )}
            <div class="container">
                <StatsGrid stats={statsData()} />
                <div class="main-content">
                    <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                    <ContentArea
                        activeTab={activeTab}
                        stockData={stockData}
                        portfolioSummaryData={portfolioSummaryData()}
                        dividendCardsData={dividendCardsData}
                        yieldCalculatorData={yieldCalculatorData}
                        dividendCalendarData={dividendCalendarData()}
                        portfolioDividendMetrics={portfolioDividendMetrics}
                        backtestParamsData={backtestParamsData}
                        setLoading={setIsLoading}
                        portfolioAnalysisData={portfolioAnalysisData}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;