import { createSignal, createEffect, For, createMemo } from 'solid-js';

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
        'value-wo-div': false
    });
    const [sortColumn, setSortColumn] = createSignal(0);
    const [sortDirection, setSortDirection] = createSignal('asc');
    
    // Pagination states
    const [currentPage, setCurrentPage] = createSignal(1);
    const [entriesPerPage, setEntriesPerPage] = createSignal(5);

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
        { id: 'value-wo-div', label: 'VALUE W/O DIV', key: 'valueWoDiv' }
    ];

    const visibleColumns = createMemo(() => columns.filter(col => columnVisibility()[col.id]));

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

   // Function to get cell content based on column ID
   const getCellContent = (colId, value, stock) => {
       if (colId === 'stock') {
           return (
               <div class="stock-info">
                   {stock.dotColor && <div class="stock-dot" style={{ background: stock.dotColor }}></div>}
                   <div class="stock-details">
                       <div class="stock-name">{stock.symbol}</div>
                       <div class="stock-company">{stock.company}</div>
                   </div>
               </div>
           );
       }
       if (['total-return', 'current-yield'].includes(colId)) {
           return <span class="performance-badge">{value}</span>;
       }
       return value;
   };

   return (
       <div id="holdings-tab">
           <div class="content-header">
               <h2 class="content-title">Portfolio Holdings</h2>
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
               </div>
           </div>

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
                                   <tr>
                                       <For each={visibleColumns()}>
                                           {col => {
                                               const cellValue = stock[col.key];
                                               const props = getTdProps(col.id, cellValue);
                                               const content = getCellContent(col.id, cellValue, stock);
                                               return <td {...props}>{content}</td>;
                                           }}
                                       </For>
                                       <td>⋮</td>
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
       </div>
   );
}

export default HoldingsTab;