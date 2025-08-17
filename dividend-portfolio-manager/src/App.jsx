// src/App.jsx - FIXED: Enhanced Cash Balance Integration and Account Change Handling
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
        cashBalanceData,
        processedCashBalance,
        isLoadingCash,
        setStockData,
        loadAllData,
        loadPositions,
        loadCashBalances
    } = usePortfolioData(selectedAccount, usdCadRate);

    const updateStatsWithLivePrice = () => {
        PortfolioService.updateStatsWithLivePrice(stockData, statsData, formatCurrency, formatPercent);
    };

    const {
        updatedStocks,
        startQuotePolling,
        stopQuotePolling
    } = useQuoteStreaming(stockData, setStockData, usdCadRate, updateStatsWithLivePrice);

    // FIXED: Enhanced account change handler with cash balance reloading
    const handleAccountChange = async (newSelection) => {
        console.log('App: Account selection changed to:', newSelection);
        
        // Update the selected account
        setSelectedAccount(newSelection);
        
        // Show notification
        showNotification(`Viewing: ${newSelection.label}`, 'info');
        
        // FIXED: Trigger immediate cash balance reload for new account
        try {
            console.log('App: Triggering immediate cash balance reload for new account');
            await loadCashBalances();
        } catch (error) {
            console.error('App: Failed to reload cash balances after account change:', error);
            showNotification('Failed to update cash balances', 'error');
        }
    };

    // FIXED: Load data when account selection changes with better error handling
    createEffect(async () => {
        const account = selectedAccount();
        console.log('App: Account selection effect triggered:', account);
        
        try {
            setIsLoading(true);
            await loadAllData();
            console.log('App: Data loading completed for account:', account.label);
        } catch (error) {
            console.error('App: Failed to load data for account:', error);
            showNotification('Failed to load portfolio data', 'error');
        } finally {
            setIsLoading(false);
        }
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

    // FIXED: Enhanced Questrade sync handler with cash balance refresh
    const runQuestrade = async () => {
        try {
            setIsLoading(true);
            
            await PortfolioService.runQuestrade(
                selectedAccount,
                isLoading,
                setIsLoading,
                setLastQuestradeRun,
                loadExchangeRate,
                loadAllData
            );
            
            // FIXED: Explicitly reload cash balances after sync
            console.log('App: Reloading cash balances after Questrade sync');
            await loadCashBalances();
            
            showNotification('Data sync completed successfully', 'success');
        } catch (err) {
            console.error('Sync failed:', err);
            showNotification('Data sync failed. Please try again.', 'error');
        } finally {
            setIsLoading(false);
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
        
        try {
            setIsLoading(true);
            await loadAllData();
            console.log('App: Initial data loading completed');
        } catch (error) {
            console.error('App: Failed to load initial data:', error);
            showNotification('Failed to load initial data', 'error');
        } finally {
            setIsLoading(false);
        }

        // Refresh positions every 30 seconds
        const refreshInterval = setInterval(() => {
            console.log('App: Periodic position refresh');
            loadPositions();
        }, POLLING_INTERVALS.POSITIONS);

        // FIXED: Refresh cash balances every 5 minutes
        const cashRefreshInterval = setInterval(() => {
            console.log('App: Periodic cash balance refresh');
            loadCashBalances();
        }, 5 * 60 * 1000);

        onCleanup(() => {
            clearInterval(refreshInterval);
            clearInterval(cashRefreshInterval);
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
                {/* FIXED: UnifiedStatsSection with enhanced cash balance support */}
                <UnifiedStatsSection 
                    stats={statsData()} 
                    selectedAccount={selectedAccount}
                    onAccountChange={handleAccountChange}
                    usdCadRate={usdCadRate}
                    runQuestrade={runQuestrade}
                    lastRun={lastQuestradeRun}
                    isLoading={isLoading}
                    cashBalanceData={cashBalanceData}
                    processedCashBalance={processedCashBalance}
                    isLoadingCash={isLoadingCash}
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