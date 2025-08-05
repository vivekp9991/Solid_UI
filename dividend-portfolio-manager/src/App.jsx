import { createSignal } from 'solid-js';
import Header from './components/Header';
import StatsGrid from './components/StatsGrid';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';

function App() {
    // Static data from original HTML
    const statsData = [
        { icon: '💰', background: '#f59e0b', title: 'TOTAL INVESTMENT', value: '$12,409.9', subtitle: '2 positions' },
        { icon: '📈', background: '#10b981', title: 'CURRENT VALUE', value: '$14,330.977', subtitle: 'Live pricing' },
        { icon: '📊', background: '#3b82f6', title: 'UNREALIZED P&L', value: '$1,921.077', subtitle: 'Capital gains', positive: true },
        { icon: '📋', background: '#8b5cf6', title: 'YIELD ON COST', value: '5.02%', subtitle: '+5.02%', positive: true },
        { icon: '💎', background: '#ef4444', title: 'TOTAL RETURN', value: '$2,544.627', subtitle: 'Including dividends', positive: true }
    ];

    const stockData = [
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
    ];

    const portfolioSummaryData = [
        {
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
    ];

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

    const dividendCalendarData = [
        { symbol: 'HYLD.TO', amount: '$51.80', date: 'Aug 2025' },
        { symbol: 'AAPL', amount: '$48.00', date: 'Aug 2025' }
    ];

    // Calculate portfolio dividend metrics
    const portfolioDividendMetrics = [
        { label: 'Current Yield', value: ((parseFloat(stockData[0].currentYield) + parseFloat(stockData[1].currentYield)) / 2).toFixed(2) + '%' },
        { label: 'Yield on Cost', value: ((parseFloat(stockData[0].yieldOnCost) + parseFloat(stockData[1].yieldOnCost)) / 2).toFixed(2) + '%' },
        { label: 'Div Adj. Avg Cost', value: '$' + ((parseFloat(stockData[0].divAdjCost.replace('$', '')) + parseFloat(stockData[1].divAdjCost.replace('$', ''))) / 2).toFixed(2) },
        { label: 'Div Adj. Yield', value: ((parseFloat(stockData[0].divAdjYield) + parseFloat(stockData[1].divAdjYield)) / 2).toFixed(2) + '%' },
        { label: 'TTM Yield', value: '12.45%' }, // Assumed static or calculated if data available
        { label: 'Monthly Average', value: '$' + (parseFloat(stockData[0].monthlyDiv.replace('$', '')) + parseFloat(stockData[1].monthlyDiv.replace('$', ''))).toFixed(2) },
        { label: 'Annual Projected', value: '$' + ((parseFloat(stockData[0].monthlyDiv.replace('$', '')) + parseFloat(stockData[1].monthlyDiv.replace('$', ''))) * 12).toFixed(2) }
    ];

    const backtestParamsData = {
        symbol: 'HYLD.TO',
        timeframe: '1W',
        shares: '10',
        startDate: '2024-01-01',
        endDate: '2025-07-29'
    };

    const strategyPerformanceData = [
        { label: 'Success Rate', value: '44.05%', positive: true },
        { label: 'Red Candles', value: '37 / 84' },
        { label: 'Analysis Period', value: '18.9 months' },
        { label: 'Capital Growth', value: '4.43%', positive: true },
        { label: 'Dividend Return', value: '9.77%', positive: true },
        { label: 'Total Return', value: '14.20%', positive: true },
        { label: 'Yearly Average', value: '8.99%', positive: true }
    ];

    const advancedReturnsData = [
        { label: 'Capital Appreciation', value: '$217.65 (4.43%)' },
        { label: 'Dividend Income', value: '$479.55 (9.77%)', positive: true },
        { label: 'Total Return', value: '$697.20 (14.20%)', positive: true },
        { label: 'Yearly Average Return', value: '8.99%', positive: true },
        { label: 'Div Adjusted Return', value: '20.25%', positive: true }
    ];

    const dividendCalculationsData = [
        { label: 'Current Yield', value: '11.95%', positive: true },
        { label: 'Yield on Cost', value: '12.48%', positive: true },
        { label: 'Div Adj. Avg Cost', value: '$11.98', color: '#8b5cf6' },
        { label: 'Div Adj. Yield', value: '15.57%', positive: true },
        { label: 'TTM Yield', value: '12.45%', positive: true },
        { label: 'Monthly Average', value: '$25.37', positive: true },
        { label: 'Annual Projected', value: '$612.72', positive: true }
    ];

    const stockInfoData = [
        { label: 'Current Price', value: '$13.86' },
        { label: 'Average Cost', value: '$13.27' },
        { label: 'Div Adj. Avg Cost', value: '$11.98', color: '#8b5cf6' },
        { label: 'Price Difference', value: '+$0.59 (4.43%)', positive: true },
        { label: 'Total Shares', value: '370' },
        { label: 'Market Value', value: '$5,128.20' },
        { label: 'Cost Basis', value: '$4,910.55' }
    ];

    const paymentHistoryData = [
        {
            year: '2024',
            total: '$208.92',
            months: [
                'Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 'Jun 2024',
                'Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024'
            ].map(month => ({ month, filled: true }))
        },
        {
            year: '2025 YTD',
            total: '$270.63',
            months: [
                { month: 'Jan 2025', filled: true },
                { month: 'Feb 2025', filled: true },
                { month: 'Mar 2025', filled: true },
                { month: 'Apr 2025', filled: true },
                { month: 'May 2025', filled: true },
                { month: 'Jun 2025', filled: true },
                { month: 'Jul 2025', filled: true },
                { month: 'Aug 2025', filled: true },
                { month: 'Sep 2025', filled: false },
                { month: 'Oct 2025', filled: false },
                { month: 'Nov 2025', filled: false },
                { month: 'Dec 2025', filled: false }
            ]
        }
    ];

    const [activeTab, setActiveTab] = createSignal('holdings');

    return (
        <div>
            <Header />
            <div class="container">
                <StatsGrid stats={statsData} />
                <div class="main-content">
                    <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                    <ContentArea
                        activeTab={activeTab}
                        stockData={stockData}
                        portfolioSummaryData={portfolioSummaryData}
                        dividendCardsData={dividendCardsData}
                        yieldCalculatorData={yieldCalculatorData}
                        dividendCalendarData={dividendCalendarData}
                        portfolioDividendMetrics={portfolioDividendMetrics}
                        backtestParamsData={backtestParamsData}
                        strategyPerformanceData={strategyPerformanceData}
                        advancedReturnsData={advancedReturnsData}
                        dividendCalculationsData={dividendCalculationsData}
                        stockInfoData={stockInfoData}
                        paymentHistoryData={paymentHistoryData}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;

