// src/components/HoldingsTab.jsx - FIXED TODAY CHANGE DISPLAY
import { createSignal, createEffect, For, createMemo, Show, onMount } from 'solid-js';
import AccountDetailsModal from './AccountDetailsModal';

function HoldingsTab(props) {
    const [searchTerm, setSearchTerm] = createSignal('');
    const [showColumns, setShowColumns] = createSignal(false);
    const [columnVisibility, setColumnVisibility] = createSignal({
        stock: true,
        shares: true,
        'avg-cost': true,
        current: true,
        'today-change': true, // FIXED: Make sure today-change is visible by default
        'total-return': true,
        'current-yield': true,
        'dividend-per-share': false,
        'market-value': true,
        'capital-growth': false,
        'dividend-return': false,
        'yield-on-cost': false,
        'div-adj-cost': false,
        'div-adj-yield': false,
        'monthly-div': false,
        'value-wo-div': false,
        'source-accounts': false
    });
    const [sortColumn, setSortColumn] = createSignal(0);
    const [sortDirection, setSortDirection] = createSignal('asc');
    
    // Pagination states
    const [currentPage, setCurrentPage] = createSignal(1);
    const [entriesPerPage, setEntriesPerPage] = createSignal(5);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = createSignal(false);
    const [selectedStock, setSelectedStock] = createSignal(null);

    // Track updated stocks for animation
    const [updatedStocks, setUpdatedStocks] = createSignal(new Set());

    // Debug on mount
    onMount(() => {
        console.log('HoldingsTab mounted');
        console.log('Stock data:', props.stockData());
    });

    const columns = [
        { id: 'stock', label: 'STOCK', key: 'symbol' },
        { id: 'shares', label: 'SHARES', key: 'shares' },
        { id: 'avg-cost', label: 'AVG COST', key: 'avgCost' },
        { id: 'current', label: 'CURRENT', key: 'current' },
        { id: 'today-change', label: 'TODAY CHANGE', key: 'todayChange' },
        { id: 'total-return', label: 'TOTAL RETURN', key: 'totalReturn' },
        { id: 'current-yield', label: 'CURRENT YIELD', key: 'currentYield' },
        { id: 'dividend-per-share', label: 'DIV/SHARE', key: 'dividendPerShare' },
        { id: 'market-value', label: 'MARKET VALUE', key: 'marketValue' },
        { id: 'capital-growth', label: 'CAPITAL GROWTH', key: 'capitalGrowth' },
        { id: 'dividend-return', label: 'DIVIDEND RETURN', key: 'dividendReturn' },
        { id: 'yield-on-cost', label: 'YIELD ON COST', key: 'yieldOnCost' },
        { id: 'div-adj-cost', label: 'DIV ADJ COST', key: 'divAdjCost' },
        { id: 'div-adj-yield', label: 'DIV ADJ YIELD', key: 'divAdjYield' },
        { id: 'monthly-div', label: 'MONTHLY DIV', key: 'monthlyDiv' },
        { id: 'value-wo-div', label: 'VALUE W/O DIV', key: 'valueWoDiv' },
        { id: 'source-accounts', label: 'SOURCE ACCOUNTS', key: 'sourceAccounts' }
    ];

    const visibleColumns = createMemo(() => columns.filter(col => columnVisibility()[col.id]));

    // Show source accounts column when viewing aggregated data
    createEffect(() => {
        const account = props.selectedAccount?.();
        const hasAggregatedData = props.stockData().some(stock => stock.isAggregated);
        
        if (account && (account.viewMode === 'all' || account.viewMode === 'person') && hasAggregatedData) {
            setColumnVisibility(prev => ({ ...prev, 'source-accounts': true }));
        } else {
            setColumnVisibility(prev => ({ ...prev, 'source-accounts': false }));
        }
    });

    // FIXED: Track stock updates for animation
    createEffect(() => {
        const stocks = props.stockData();
        const currentTime = Date.now();
        const recentlyUpdated = new Set();
        
        stocks.forEach(stock => {
            // If stock has been updated in the last 2 seconds, mark it
            if (stock.lastUpdateTime && (currentTime - stock.lastUpdateTime) < 2000) {
                recentlyUpdated.add(stock.symbol);
            }
        });
        
        setUpdatedStocks(recentlyUpdated);
        
        // Clear the updates after animation completes
        setTimeout(() => {
            setUpdatedStocks(new Set());
        }, 1000);
    });

    // Handle column dropdown close on outside click
    createEffect(() => {
        const handleClickOutside = (event) => {
            if (showColumns() && !event.target.closest('.columns-btn-container')) {
                setShowColumns(false);
            }
        };
        
        if (showColumns()) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    });

    // Compute filtered and sorted stocks
    const filteredAndSortedStocks = createMemo(() => {
        const term = searchTerm().toLowerCase();
        let filtered = props.stockData().filter(stock =>
            stock.symbol.toLowerCase().includes(term) ||
            stock.company.toLowerCase().includes(term)
        );

        // Apply sorting
        const colIndex = sortColumn();
        const direction = sortDirection();
        
        if (colIndex >= 0 && colIndex < columns.length) {
            const keys = columns.map(c => c.key);
            filtered = [...filtered].sort((a, b) => {
                let aValue = a[keys[colIndex]];
                let bValue = b[keys[colIndex]];

                // Special handling for today change sorting
                if (keys[colIndex] === 'todayChange') {
                    aValue = a.todayChangePercentNum || 0;
                    bValue = b.todayChangePercentNum || 0;
                } else {
                    // Attempt to parse as number after cleaning
                    const cleanA = (aValue ?? '').toString().replace(/[\$,%+]/g, '');
                    const cleanB = (bValue ?? '').toString().replace(/[\$,%+]/g, '');
                    const numA = parseFloat(cleanA);
                    const numB = parseFloat(cleanB);

                    if (!isNaN(numA) && !isNaN(numB)) {
                        aValue = numA;
                        bValue = numB;
                    } else {
                        aValue = (aValue ?? '').toString();
                        bValue = (bValue ?? '').toString();
                    }
                }

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return direction === 'asc' ? aValue - bValue : bValue - aValue;
                } else {
                    return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }
            });
        }

        return filtered;
    });

    const totalEntries = createMemo(() => filteredAndSortedStocks().length);
    const totalPages = createMemo(() => Math.ceil(totalEntries() / entriesPerPage()));
    const startIndex = createMemo(() => (currentPage() - 1) * entriesPerPage());
    const endIndex = createMemo(() => Math.min(startIndex() + entriesPerPage(), totalEntries()));
    
    const currentPageData = createMemo(() => {
        return filteredAndSortedStocks().slice(startIndex(), endIndex());
    });

    const toggleColumn = (column) => {
        if (column !== 'stock') {
            setColumnVisibility(prev => ({
                ...prev,
                [column]: !prev[column]
            }));
        }
    };

    const sortTable = (columnIndex) => {
        const currentDir = sortColumn() === columnIndex ? sortDirection() : 'asc';
        const newDir = currentDir === 'asc' ? 'desc' : 'asc';
        setSortColumn(columnIndex);
        setSortDirection(newDir);
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages()) {
            setCurrentPage(page);
        }
    };

    const handleEntriesPerPageChange = (e) => {
        setEntriesPerPage(parseInt(e.target.value));
        setCurrentPage(1);
    };

    // Modal handling functions
    const openModal = (stock) => {
        console.log('Opening modal for stock:', stock?.symbol);
        
        if (!stock) {
            console.error('No stock provided to openModal');
            return;
        }

        // Ensure we have the individual positions data
        if (!stock.individualPositions || stock.individualPositions.length === 0) {
            console.warn('No individual positions for stock:', stock.symbol);
            // Create mock data if missing
            const accountCount = stock.accountCount || stock.sourceAccounts?.length || 2;
            stock.individualPositions = [];
            
            for (let i = 0; i < accountCount; i++) {
                stock.individualPositions.push({
                    accountName: `Account ${i + 1}`,
                    accountType: stock.sourceAccounts?.[i] || (i === 0 ? 'TFSA' : 'RRSP'),
                    shares: Math.floor(stock.sharesNum / accountCount),
                    avgCost: stock.avgCost,
                    marketValue: formatCurrency(stock.marketValueNum / accountCount)
                });
            }
        }

        setSelectedStock(stock);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        console.log('Closing modal');
        setIsModalOpen(false);
        setSelectedStock(null);
    };

    const formatCurrency = (num) => {
        const n = Number(num);
        return isNaN(n) ? '$0.00' : `${n.toFixed(2)}`;
    };

    // Function to handle account details button click
    const handleAccountDetailsClick = (e, stock) => {
        console.log('Account details button clicked for:', stock.symbol);
        e.preventDefault();
        e.stopPropagation();
        openModal(stock);
    };

    // FIXED: Enhanced function to get TD props based on column ID and value
    const getTdProps = (colId, value, stock) => {
        if (colId === 'today-change') {
            const changeValue = stock.todayChangePercentNum || 0;
            const isUpdated = updatedStocks().has(stock.symbol);
            
            return { 
                class: `today-change ${changeValue > 0 ? 'positive' : changeValue < 0 ? 'negative' : 'neutral'} ${isUpdated ? 'live-update updated' : 'live-update'}`,
                style: { 
                    color: changeValue > 0 ? 'var(--success-700)' : changeValue < 0 ? 'var(--error-700)' : 'var(--neutral-600)',
                    fontWeight: '600'
                }
            };
        }
        if (colId === 'current') {
            const isUpdated = updatedStocks().has(stock.symbol);
            return { 
                class: `price-update ${isUpdated ? (stock.todayChangePercentNum > 0 ? 'price-up' : 'price-down') : ''}` 
            };
        }
        if (['capital-growth', 'dividend-return', 'yield-on-cost', 'div-adj-yield'].includes(colId)) {
            return { class: 'positive' };
        } else if (colId === 'div-adj-cost') {
            return { style: { color: '#8b5cf6' } };
        }
        return {};
    };

    // FIXED: Enhanced cell content rendering with today change styling
    const getCellContent = (colId, value, stock) => {
        if (colId === 'stock') {
            // Determine if we should show the account details button
            const shouldShowButton = stock.isAggregated || 
                                    stock.accountCount > 1 || 
                                    (stock.individualPositions && stock.individualPositions.length > 0) ||
                                    (stock.sourceAccounts && stock.sourceAccounts.length > 0);
            
            const buttonCount = stock.accountCount || 
                              stock.individualPositions?.length || 
                              stock.sourceAccounts?.length || 
                              2;

            return (
                <div class="stock-info">
                    {stock.dotColor && <div class="stock-dot" style={{ background: stock.dotColor }}></div>}
                    <div class="stock-details">
                        <div class="stock-name">
                            {stock.symbol}
                            {stock.isAggregated && <span class="aggregated-badge">AGG</span>}
                            
                            {shouldShowButton && (
                                <button
                                    class="account-details-btn"
                                    type="button"
                                    onClick={(e) => handleAccountDetailsClick(e, stock)}
                                    title={`View ${buttonCount} accounts for ${stock.symbol}`}
                                    style={{
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.65rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        marginLeft: '0.5rem',
                                        boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(59, 130, 246, 0.3)';
                                    }}
                                >
                                    📊 {buttonCount}
                                </button>
                            )}
                        </div>
                        <div class="stock-company">{stock.company}</div>
                        {shouldShowButton && (
                            <div class="account-count-info">
                                {buttonCount} accounts
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // FIXED: Enhanced today change display
        if (colId === 'today-change') {
            const changeValue = stock.todayChangePercentNum || 0;
            const changeType = changeValue > 0 ? 'positive' : changeValue < 0 ? 'negative' : 'neutral';
            const isUpdated = updatedStocks().has(stock.symbol);
            
            return (
                <div class={`today-change ${changeType} ${isUpdated ? 'live-update updated' : 'live-update'}`}>
                    {value || '$0.00 (0.00%)'}
                </div>
            );
        }

        if (colId === 'current') {
            const isUpdated = updatedStocks().has(stock.symbol);
            return (
                <div class={`price-update ${isUpdated ? (stock.todayChangePercentNum > 0 ? 'price-up' : 'price-down') : ''}`}>
                    {value}
                    {isUpdated && <span class="update-indicator">●</span>}
                </div>
            );
        }

        if (colId === 'source-accounts' && stock.isAggregated) {
            return (
                <div class="source-accounts">
                    {stock.sourceAccounts?.slice(0, 2).map(acc => (
                        <span class="account-tag">{acc}</span>
                    )) || []}
                    {stock.sourceAccounts?.length > 2 && (
                        <span class="more-accounts">+{stock.sourceAccounts.length - 2}</span>
                    )}
                </div>
            );
        }

        if (['total-return', 'current-yield'].includes(colId)) {
            return <span class="performance-badge">{value}</span>;
        }

        return value;
    };

    // Get context label for current view
    const getViewContext = () => {
        const account = props.selectedAccount?.();
        if (!account) return 'All Accounts';
        
        if (account.viewMode === 'all') return 'All Accounts (Everyone)';
        if (account.viewMode === 'person') return `${account.personName} (All Accounts)`;
        if (account.viewMode === 'account') return account.label;
        
        return account.label || 'All Accounts';
    };

    // Check if we should show aggregation info
    const shouldShowAggregationInfo = () => {
        const account = props.selectedAccount?.();
        return account && (account.viewMode === 'all' || account.viewMode === 'person') && account.aggregate;
    };

    // Get aggregation stats
    const getAggregationStats = () => {
        const stocks = props.stockData();
        const aggregatedStocks = stocks.filter(s => s.isAggregated);
        const totalAccounts = stocks.reduce((sum, s) => sum + (s.accountCount || s.individualPositions?.length || 1), 0);
        return {
            totalStocks: stocks.length,
            aggregatedStocks: aggregatedStocks.length,
            totalAccounts: totalAccounts
        };
    };

    // FIXED: Get market status indicator
    const getMarketStatus = () => {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        
        // Simple market hours check (9:30 AM - 4:00 PM ET, Mon-Fri)
        if (day === 0 || day === 6) return 'closed'; // Weekend
        if (hour < 9 || (hour === 9 && now.getMinutes() < 30)) return 'pre-market';
        if (hour >= 16) return 'closed';
        return 'open';
    };

    return (
        <div id="holdings-tab">
            <div class="content-header">
                <h2 class="content-title">
                    Portfolio Holdings
                    <span class="view-context">- {getViewContext()}</span>
                </h2>
                <div class="header-controls">
                    <div class="search-box">
                        <input
                            type="text"
                            placeholder="Search stocks..."
                            value={searchTerm()}
                            onInput={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div class={`market-status ${getMarketStatus()}`}>
                        <span class="status-dot"></span>
                        Market {getMarketStatus() === 'open' ? 'Open' : getMarketStatus() === 'pre-market' ? 'Pre-Market' : 'Closed'}
                    </div>
                    <div class="auto-refresh">Auto-refresh: 5s</div>
                    <div class="columns-btn-container">
                        <button class="btn" onClick={() => setShowColumns(!showColumns())}>🔧 Columns</button>
                        <div class={`column-settings ${showColumns() ? '' : 'hidden'}`}>
                            <div class="column-checkboxes">
                                <label class="disabled">
                                    <input
                                        type="checkbox"
                                        checked={true}
                                        disabled={true}
                                    />
                                    Stock
                                </label>
                                <For each={columns.filter(col => col.id !== 'stock')}>
                                    {col => (
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={columnVisibility()[col.id]}
                                                onChange={() => toggleColumn(col.id)}
                                            />
                                            {col.label}
                                        </label>
                                    )}
                                </For>
                            </div>
                        </div>
                    </div>
                    <button class="btn">📤 Export</button>
                </div>
            </div>

            {/* Aggregation Info Banner */}
            <Show when={shouldShowAggregationInfo()}>
                <div class="aggregation-info-banner">
                    <div class="aggregation-stats">
                        <span class="stat-item">
                            <span class="stat-icon">📊</span>
                            <span class="stat-text">{getAggregationStats().totalStocks} unique positions</span>
                        </span>
                        <span class="stat-item">
                            <span class="stat-icon">🔗</span>
                            <span class="stat-text">{getAggregationStats().aggregatedStocks} aggregated</span>
                        </span>
                        <span class="stat-item">
                            <span class="stat-icon">🏦</span>
                            <span class="stat-text">{getAggregationStats().totalAccounts} total accounts</span>
                        </span>
                    </div>
                    <div class="aggregation-note">
                        <span class="note-icon">💡</span>
                        <span class="note-text">Same stocks from multiple accounts are combined. Click 📊 to view details.</span>
                    </div>
                </div>
            </Show>

            <div class="table-container">
                <div class="table-wrapper">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <For each={visibleColumns()}>
                                    {col => {
                                        const colIndex = columns.findIndex(c => c.id === col.id);
                                        return (
                                            <th onClick={() => sortTable(colIndex)}>
                                                {col.label} <span class="sort-indicator">{sortColumn() === colIndex ? (sortDirection() === 'asc' ? '↑' : '↓') : '↕'}</span>
                                            </th>
                                        );
                                    }}
                                </For>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            <For each={currentPageData()}>
                                {stock => (
                                    <tr class={stock.isAggregated ? 'aggregated-row' : ''}>
                                        <For each={visibleColumns()}>
                                            {col => {
                                                const cellValue = stock[col.key];
                                                const tdProps = getTdProps(col.id, cellValue, stock);
                                                const content = getCellContent(col.id, cellValue, stock);
                                                return <td {...tdProps}>{content}</td>;
                                            }}
                                        </For>
                                        <td>
                                            <div class="action-buttons">
                                                <button class="action-btn" title="View Details">📊</button>
                                                <button class="action-btn" title="More Actions">⋮</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </For>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="pagination-controls">
                <div class="entries-per-page">
                    <span>Show </span>
                    <select value={entriesPerPage()} onChange={handleEntriesPerPageChange}>
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                    </select>
                    <span> of {totalEntries()} entries</span>
                </div>
                <div class="pagination-info">
                    <span>Page {currentPage()} of {totalPages()}</span>
                    <div class="pagination-buttons">
                        <button
                            class="pagination-btn"
                            disabled={currentPage() === 1}
                            onClick={() => goToPage(currentPage() - 1)}
                        >
                            ‹ Previous
                        </button>
                        <button
                            class="pagination-btn"
                            disabled={currentPage() === totalPages()}
                            onClick={() => goToPage(currentPage() + 1)}
                        >
                            Next ›
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal component - Always rendered */}
            <AccountDetailsModal
                isOpen={isModalOpen()}
                stock={selectedStock()}
                onClose={closeModal}
            />
        </div>
    );
}

export default HoldingsTab;