import { createSignal, onMount, createMemo } from 'solid-js';
import Header from './components/Header';
import StatsGrid from './components/StatsGrid';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';
import { fetchPortfolioSummary, fetchPositions, fetchDividendCalendar, runPortfolioSync, fetchPortfolioAnalysis } from './api';


function App() {
    // Static data from original HTML
    const [statsData, setStatsData] = createSignal([
        { icon: '💰', background: '#f59e0b', title: 'TOTAL INVESTMENT', value: '$12,409.9', subtitle: '2 positions' },
        { icon: '📈', background: '#10b981', title: 'CURRENT VALUE', value: '$14,330.977', subtitle: 'Live pricing' },
        { icon: '📊', background: '#3b82f6', title: 'UNREALIZED P&L', value: '$1,921.077', subtitle: '+15.47% Capital gains', positive: true },
        // { icon: '📋', background: '#8b5cf6', title: 'YIELD ON COST', value: '5.02%', subtitle: '+5.02%', positive: true },
        { icon: '💎', background: '#ef4444', title: 'TOTAL RETURN', value: '$2,544.627', subtitle: '+20.51% Including dividends', positive: true }
    ]);

    const [stockData, setStockData] = createSignal([
        {
            symbol: 'HYLD.TO',
            company: 'Hamilton High Divide...',
            dotColor: '#10b981',
            shares: '370',
            avgCost: '$13.27',
            current: '$13.79',
            totalReturn: '13.23%',
            currentYield: '12.19%',
            marketValue: '$5,102.30',
            capitalGrowth: '+3.44%',
            dividendReturn: '9.77%',
            yieldOnCost: '12.66%',
            divAdjCost: '$11.97',
            divAdjYield: '14.03%',
            monthlyDiv: '$51.80',
            valueWoDiv: '$4599.29'
        },
        {
            symbol: 'AAPL',
            company: 'Apple Inc.',
            dotColor: '#3b82f6',
            shares: '50',
            avgCost: '$150.00',
            current: '$184.60',
            totalReturn: '26.58%',
            currentYield: '2.08%',
            marketValue: '$9,230.00',
            capitalGrowth: '+24.23%',
            dividendReturn: '1.92%',
            yieldOnCost: '7.68%',
            divAdjCost: '$147.12',
            divAdjYield: '7.83%',
            monthlyDiv: '$48.00',
            valueWoDiv: '$9173.48'
        }
    ]);

const [portfolioSummaryData, setPortfolioSummaryData] = createSignal([{
            title: 'Total Portfolio',
            rows: [
                { label: 'Investment:', value: '$12,409.9' },
                { label: 'Current Value:', value: '$14,330.312' },
                { label: 'Total Return:', value: '$2,609.962', positive: true }
            ]
        },
        {
            title: 'Monthly Income',
            rows: [
                { label: 'Current:', value: '$99.80' },
                { label: 'Annual Projected:', value: '$1197.60' }
            ]
        },
        {
            title: 'Dividend Metrics',
            rows: [
                { label: 'Avg Yield on Cost:', value: '10.17%' },
                { label: 'Avg Current Yield:', value: '7.13%' }
            ]
        },
        {
            title: 'Performance',
            rows: [
                { label: 'Total Return:', value: '21.03%', positive: true },
                { label: 'Positions:', value: '2' }
            ]
        }
    ]);

    const dividendCardsData = [
        { icon: '📈', background: '#f59e0b', title: 'DIVIDEND STOCKS', value: '2', subtitle: 'Active positions' },
        { icon: '💰', background: '#3b82f6', title: 'MONTHLY INCOME', value: '$99.80', subtitle: 'Current monthly' },
        { icon: '📊', background: '#8b5cf6', title: 'AVG CURRENT YIELD', value: '7.13%', subtitle: 'Real-time calculation' },
        { icon: '💎', background: '#8b5cf6', title: 'TOTAL DIVIDENDS', value: '$623.55', subtitle: 'All time received' }
    ];

    const yieldCalculatorData = [
        { symbol: 'HYLD.TO', dotColor: '#10b981', yield: '12.19%', price: '$13.79', dividend: '$1.68' },
        { symbol: 'AAPL', dotColor: '#3b82f6', yield: '2.08%', price: '$184.60', dividend: '$3.84' }
    ];

    const [dividendCalendarData, setDividendCalendarData] = createSignal([
        { symbol: 'HYLD.TO', amount: '$51.80', date: 'Aug 2025' },
        { symbol: 'AAPL', amount: '$48.00', date: 'Aug 2025' }
    ]);

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
                setStatsData([
                    { icon: '💰', background: '#f59e0b', title: 'TOTAL INVESTMENT', value: formatCurrency(summary.totalInvestment), subtitle: `${summary.positions || 0} positions` },
                    { icon: '📈', background: '#10b981', title: 'CURRENT VALUE', value: formatCurrency(summary.currentValue), subtitle: 'Live pricing' },
                    { icon: '📊', background: '#3b82f6', title: 'UNREALIZED P&L', value: formatCurrency(summary.unrealizedPnl), subtitle: formatPercent(summary.unrealizedPnlPercent), positive: (summary.unrealizedPnl || 0) >= 0 },
                    { icon: '💎', background: '#ef4444', title: 'TOTAL RETURN', value: formatCurrency(summary.totalReturn), subtitle: formatPercent(summary.totalReturnPercent), positive: (summary.totalReturn || 0) >= 0 }
                ]);
                setPortfolioSummaryData([
                    {
                        title: 'Total Portfolio',
                        rows: [
                            { label: 'Investment:', value: formatCurrency(summary.totalInvestment) },
                            { label: 'Current Value:', value: formatCurrency(summary.currentValue) },
                            { label: 'Total Return:', value: formatCurrency(summary.totalReturn), positive: (summary.totalReturn || 0) >= 0 }
                        ]
                    },
                    {
                        title: 'Monthly Income',
                        rows: [
                            { label: 'Current:', value: formatCurrency(summary.monthlyIncome?.current) },
                            { label: 'Annual Projected:', value: formatCurrency(summary.monthlyIncome?.annualProjected) }
                        ]
                    },
                    {
                        title: 'Dividend Metrics',
                        rows: [
                            { label: 'Avg Yield on Cost:', value: formatPercent(summary.dividendMetrics?.avgYieldOnCost) },
                            { label: 'Avg Current Yield:', value: formatPercent(summary.dividendMetrics?.avgCurrentYield) }
                        ]
                    },
                    {
                        title: 'Performance',
                        rows: [
                            { label: 'Total Return:', value: formatPercent(summary.performance?.totalReturnPercent), positive: (summary.performance?.totalReturnPercent || 0) >= 0 },
                            { label: 'Positions:', value: String(summary.positions ?? '') }
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
           const data = await fetchPositions();
            const positions = Array.isArray(data) ? data : Array.isArray(data?.holdings) ? data.holdings : [];
            setStockData(
                positions.map(pos => ({
                    symbol: pos.symbol,
                    company: pos.company || pos.symbol || '',
                    dotColor: '#10b981',
                    shares: String(pos.shares ?? pos.quantity ?? ''),
                    avgCost: formatCurrency(pos.avgCost ?? pos.averagePrice),
                    current: formatCurrency(pos.currentPrice ?? pos.marketPrice),
                    totalReturn: formatPercent(pos.totalReturnPercent ?? pos.unrealizedPnlPercent),
                    currentYield: formatPercent(pos.currentYieldPercent ?? pos.currentYield),
                    marketValue: formatCurrency(pos.marketValue),
                    capitalGrowth: formatPercent(pos.capitalGrowthPercent ?? pos.capitalGainPercent ?? pos.capitalGrowth),
                    dividendReturn: formatPercent(pos.dividendReturnPercent),
                    yieldOnCost: formatPercent(pos.yieldOnCostPercent ?? pos.yieldOnCost),
                    divAdjCost: formatCurrency(pos.dividendAdjustedCost ?? pos.divAdjCost),
                    divAdjYield: formatPercent(pos.dividendAdjustedYieldPercent ?? pos.divAdjYield),
                    monthlyDiv: formatCurrency(pos.monthlyDividend),
                    valueWoDiv: formatCurrency(pos.valueWithoutDividend ?? pos.valueWoDiv)
                }))
            );
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
                        symbol: d.symbol,
                        amount: formatCurrency(d.amount),
                        date: d.payDate || d.date
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

    onMount(async () => {
        await Promise.all([loadSummary(), loadPositions(), loadDividends(), loadAnalysis()]);
        setInterval(loadPositions, 5000);
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
            { label: 'TTM Yield', value: '12.45%' },
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
            await loadPositions();
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
                 <div class="spinner">$</div>
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