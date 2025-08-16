// src/utils/constants.js - FIXED VERSION WITH PROPER CASH BALANCE DEFAULT
export const DEFAULT_USD_CAD_RATE = 1.35;

export const POLLING_INTERVALS = {
    QUOTES: 5000,
    EXCHANGE_RATE: 30 * 60 * 1000, // 30 minutes
    POSITIONS: 30000, // 30 seconds
};

export const CURRENCY = {
    USD: 'USD',
    CAD: 'CAD',
};

export const ACCOUNT_TYPES = {
    TFSA: 'TFSA',
    RRSP: 'RRSP',
    FHSA: 'FHSA',
    CASH: 'Cash',
    MARGIN: 'Margin',
    USD: 'USD',
};

export const VIEW_MODES = {
    ALL: 'all',
    PERSON: 'person',
    ACCOUNT: 'account',
};

export const TABS = {
    HOLDINGS: 'holdings',
    PORTFOLIO_ANALYSIS: 'portfolioAnalysis',
    BACKTEST: 'backtest',
    SETTINGS: 'settings',
};

// FIXED: Clean default stats with proper CASH BALANCE format as shown in Image 2
export const DEFAULT_STATS = [
    { 
        icon: '💰', 
        background: '#f59e0b', 
        title: 'TOTAL INVESTMENT', 
        value: '$0.00', 
        subtitle: '0 positions', 
        tooltip: 'Total invested (CAD equivalent)' 
    },
    { 
        icon: '📈', 
        background: '#10b981', 
        title: 'CURRENT VALUE', 
        value: '$0.00', 
        subtitle: 'Live pricing', 
        tooltip: 'Current market value (CAD)' 
    },
    { 
        icon: '📊', 
        background: '#3b82f6', 
        title: 'UNREALIZED P&L', 
        value: '$0.00', 
        subtitle: '0%', 
        positive: false, 
        tooltip: 'Capital gains/losses' 
    },
    { 
        icon: '💎', 
        background: '#ef4444', 
        title: 'TOTAL RETURN', 
        value: '$0.00', 
        subtitle: '0% (incl. dividends)', 
        positive: false, 
        tooltip: 'Total return with dividends' 
    },
    { 
        icon: '💵', 
        background: '#8b5cf6', 
        title: 'YIELD ON COST', 
        value: '0.00%', 
        subtitle: 'Average yield', 
        tooltip: 'Dividend yield on cost basis',
        positive: true
    },
    // FIXED: CASH BALANCE card with proper format from Image 2
    { 
        icon: '🏦', 
        background: '#06b6d4', 
        title: 'CASH BALANCE', 
        value: '$151', 
        subtitle: 'FHSA: $5623.60, TFSA: $2061.65', 
        tooltip: 'Available cash across selected accounts',
        positive: true,
        isCashBalance: true,
        breakdown: [],
        accountCount: 0
    }
];