// src/App.jsx - CORRECTED VERSION WITH RED OUTLINE REMOVED
import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import Header from './components/Header';
import UnifiedStatsSection from './components/UnifiedStatsSection';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';
import NotificationSystem from './components/NotificationSystem';

// Hooks
import { useExchangeRate } from './hooks/useExchangeRate';
import { usePortfolioData } from './hooks/usePortfolioData';
import { useQuoteStreaming } from './hooks/useQuoteStreaming';
import { useNotifications } from './hooks/useNotifications';

// Services
import { PortfolioService } from './services/portfolioService';

// Utils
import { TABS, POLLING_INTERVALS } from './utils/constants';
import { formatCurrency, formatPercent } from './utils/helpers';

function App() {
    // UI State
    const [selectedAccount, setSelectedAccount] = createSignal({
        viewMode: 'all',
        personName: null,
        accountId: null,
        label: 'All Accounts',
        value: 'all',
        aggregate: true
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = createSignal(false);
    const [isLoading, setIsLoading] = createSignal(false);
    const [lastQuestradeRun, setLastQuestradeRun] = createSignal('');
    const [activeTab, setActiveTab] = createSignal(TABS.HOLDINGS);

    // Custom Hooks
    const { usdCadRate, loadExchangeRate } = useExchangeRate();
    const { notifications, showNotification } = useNotifications();
    
    const {
        stockData,
        portfolioSummaryData,
        dividendCalendarData,
        portfolioAnalysisData,
        statsData,
        portfolioDividendMetrics,
        setStockData,
        loadAllData,
        loadPositions
    } = usePortfolioData(selectedAccount, usdCadRate);

    const updateStatsWithLivePrice = () => {
        PortfolioService.updateStatsWithLivePrice(stockData, statsData, formatCurrency, formatPercent);
    };

    const {
        updatedStocks,
        startQuotePolling,
        stopQuotePolling
    } = useQuoteStreaming(stockData, setStockData, usdCadRate, updateStatsWithLivePrice);

    // Handle account selection changes
    const handleAccountChange = (newSelection) => {
        console.log('App: Account selection changed to:', newSelection);
        setSelectedAccount(newSelection);
        showNotification(`Viewing: ${newSelection.label}`, 'info');
    };

    // Load data when account selection changes
    createEffect(async () => {
        const account = selectedAccount();
        console.log('App: Account selection effect triggered:', account);
        
        await loadAllData();
    });

    // Start quote polling when stock data changes
    createEffect(() => {
        const stocks = stockData();
        if (stocks.length > 0) {
            const symbols = stocks.map(s => s.symbol).filter(s => s);
            if (symbols.length > 0) {
                startQuotePolling(symbols);
            }
        }
    });

    // Questrade sync handler
    const runQuestrade = async () => {
        try {
            await PortfolioService.runQuestrade(
                selectedAccount,
                isLoading,
                setIsLoading,
                setLastQuestradeRun,
                loadExchangeRate,
                loadAllData
            );
            showNotification('Data sync completed successfully', 'success');
        } catch (err) {
            console.error('Sync failed:', err);
            showNotification('Data sync failed. Please try again.', 'error');
        }
    };

    // Backtesting params data
    const backtestParamsData = {
        symbol: 'HYLD.TO',
        timeframe: '1W',
        shares: '10',
        startDate: '2024-01-01',
        endDate: '2025-07-29'
    };

    // Initialize app
    onMount(async () => {
        console.log('App mounted, loading initial data...');
        await loadAllData();

        // Refresh positions every 30 seconds
        const refreshInterval = setInterval(loadPositions, POLLING_INTERVALS.POSITIONS);

        onCleanup(() => {
            clearInterval(refreshInterval);
            stopQuotePolling();
        });
    });

    return (
        <div>
            {/* Header */}
            <Header />
            
            <NotificationSystem 
                selectedAccount={selectedAccount}
                notifications={notifications}
            />
            
            {isLoading() && (
                <div class="spinner">⟲</div>
            )}
            
            <div class="container">
                {/* UnifiedStatsSection with controls in green border */}
                <UnifiedStatsSection 
                    stats={statsData()} 
                    selectedAccount={selectedAccount}
                    onAccountChange={handleAccountChange}
                    usdCadRate={usdCadRate}
                    runQuestrade={runQuestrade}
                    lastRun={lastQuestradeRun}
                    isLoading={isLoading}
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
                        updatedStocks={updatedStocks}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;