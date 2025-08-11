// src/components/HoldingsTab.jsx - COMPLETE FIX
import { createSignal, createEffect, For, createMemo, Show } from 'solid-js';
import AccountDetailsModal from './AccountDetailsModal';

function HoldingsTab(props) {
    const [searchTerm, setSearchTerm] = createSignal('');
    const [showColumns, setShowColumns] = createSignal(false);
    const [columnVisibility, setColumnVisibility] = createSignal({
        stock: true,
        shares: true,
        'avg-cost': true,
        current: true,
        'today-change': true,
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
    
    // Modal states - FIXED with debugging
    const [isModalOpen, setIsModalOpen] = createSignal(false);
    const [selectedStock, setSelectedStock] = createSignal(null);

    // Debug modal state changes
    createEffect(() => {
        console.log('🔍 Modal state changed:', {
            isOpen: isModalOpen(),
            selectedStock: selectedStock()?.symbol || 'none'
        });
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

                // Attempt to parse as number after cleaning
                const cleanA = (aValue ?? '').toString().replace(/[\$,%+]/g, '');
                const cleanB = (bValue ?? '').toString().replace(/[\$,%+]/g, '');
                const numA = parseFloat(cleanA);
                const numB = parseFloat(cleanB);

                if (!isNaN(numA) && !isNaN(numB)) {
                    return direction === 'asc' ? numA - numB : numB - numA;
                } else {
                    const strA = (aValue ?? '').toString();
                    const strB = (bValue ?? '').toString();
                    return direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
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

   // COMPLETELY REWRITTEN: Modal handling functions
   const openModal = (stock) => {
       console.log('🚀 openModal called with:', stock?.symbol);
       
       if (!stock) {
           console.error('❌ No stock provided to openModal');
           return;
       }

       console.log('📊 Stock details:', {
           symbol: stock.symbol,
           isAggregated: stock.isAggregated,
           individualPositions: stock.individualPositions?.length || 0
       });

       setSelectedStock(stock);
       setIsModalOpen(true);
       
       console.log('✅ Modal state set:', {
           isOpen: true,
           stock: stock.symbol
       });
   };

   const closeModal = () => {
       console.log('🔒 closeModal called');
       setIsModalOpen(false);
       setSelectedStock(null);
   };

   // FIXED: Test function to ensure modal works
   const testModal = () => {
       console.log('🧪 Testing modal with dummy data');
       const dummyStock = {
           symbol: 'TEST',
           isAggregated: true,
           individualPositions: [
               { accountName: 'Test Account 1', accountType: 'TFSA', shares: '100', avgCost: '$50.00', marketValue: '$5500.00' },
               { accountName: 'Test Account 2', accountType: 'RRSP', shares: '200', avgCost: '$48.00', marketValue: '$11000.00' }
           ]
       };
       openModal(dummyStock);
   };

   // Function to get TD props based on column ID and value
   const getTdProps = (colId, value) => {
       if (colId === 'today-change') {
           const numeric = parseFloat((value ?? '').toString().replace(/[\$,%\(\)]/g, ''));
           if (!isNaN(numeric)) {
               return { style: { color: numeric >= 0 ? 'var(--success-600)' : '#ef4444' } };
           }
       }
       if (['capital-growth', 'dividend-return', 'yield-on-cost', 'div-adj-yield'].includes(colId)) {
           return { class: 'positive' };
       } else if (colId === 'div-adj-cost') {
           return { style: { color: '#8b5cf6' } };
       }
       return {};
   };

   // COMPLETELY REWRITTEN: Cell content rendering
   const getCellContent = (colId, value, stock) => {
       if (colId === 'stock') {
           return (
               <div class="stock-info">
                   {stock.dotColor && <div class="stock-dot" style={{ background: stock.dotColor }}></div>}
                   <div class="stock-details">
                       <div class="stock-name">
                           {stock.symbol}
                           {stock.isAggregated && <span class="aggregated-badge">AGG</span>}
                           
                           {/* COMPLETELY REWRITTEN: Account details button */}
                           {stock.isAggregated && stock.individualPositions && stock.individualPositions.length > 0 && (
                               <button
                                   class="account-details-btn"
                                   type="button"
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
                                       zIndex: '10'
                                   }}
                                   onClick={(e) => {
                                       console.log('🖱️ Button clicked!', stock.symbol);
                                       e.preventDefault();
                                       e.stopPropagation();
                                       e.stopImmediatePropagation();
                                       openModal(stock);
                                   }}
                                   title={`View ${stock.individualPositions.length} accounts for ${stock.symbol}`}
                               >
                                   📊 {stock.individualPositions.length}
                               </button>
                           )}
                       </div>
                       <div class="stock-company">{stock.company}</div>
                       {stock.isAggregated && (
                           <div class="account-count-info">
                               {stock.accountCount || stock.individualPositions?.length || 1} accounts
                           </div>
                       )}
                   </div>
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
                   {/* TEST BUTTON for debugging */}
                   <button 
                       class="btn" 
                       onClick={testModal}
                       style={{ background: '#ef4444', color: 'white' }}
                   >
                       🧪 Test Modal
                   </button>
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
                                               const tdProps = getTdProps(col.id, cellValue);
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

           {/* FIXED: Modal - Always rendered with proper debugging */}
           <div style={{ display: isModalOpen() ? 'block' : 'none' }}>
               <AccountDetailsModal
                   isOpen={isModalOpen()}
                   stock={selectedStock()}
                   onClose={closeModal}
               />
           </div>
           
           {/* Debug info */}
           <div style={{ 
               position: 'fixed', 
               bottom: '10px', 
               right: '10px', 
               background: '#000', 
               color: '#fff', 
               padding: '10px', 
               borderRadius: '5px',
               fontSize: '12px',
               zIndex: 9999
           }}>
               Modal: {isModalOpen() ? 'OPEN' : 'CLOSED'} | 
               Stock: {selectedStock()?.symbol || 'NONE'}
           </div>
       </div>
   );
}

export default HoldingsTab;