// src/utils/helpers.js
import { CURRENCY, DEFAULT_USD_CAD_RATE } from './constants';

export const formatCurrency = (num) => {
    const n = Number(num);
    return isNaN(n) ? '$0.00' : `$${n.toFixed(2)}`;
};

export const formatPercent = (num) => {
    const n = Number(num);
    return isNaN(n) ? '0.00%' : `${n.toFixed(2)}%`;
};

export const convertToCAD = (amount, currency, usdCadRate = DEFAULT_USD_CAD_RATE) => {
    if (currency === CURRENCY.USD) {
        return amount * usdCadRate;
    }
    return amount;
};

export const formatTodayChange = (valueChange, percentChange) => {
    if (valueChange === undefined && percentChange === undefined) return '$0.00 (0.00%)';
    
    const value = Number(valueChange) || 0;
    const percent = Number(percentChange) || 0;
    
    const valueStr = value >= 0 ? `+$${Math.abs(value).toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
    const percentStr = percent >= 0 ? `+${Math.abs(percent).toFixed(2)}%` : `-${Math.abs(percent).toFixed(2)}%`;
    
    return `${valueStr} (${percentStr})`;
};

/**
 * Detects if dividend payments follow a regular pattern (monthly, quarterly, semi-annual, annual)
 * @param {Array} dividendHistory - Array of dividend payment objects with date and amount
 * @returns {Object} - { isRegular: boolean, frequency: string, confidence: number }
 */
export const detectDividendFrequency = (dividendHistory) => {
    if (!dividendHistory || !Array.isArray(dividendHistory) || dividendHistory.length < 2) {
        return { isRegular: false, frequency: 'none', confidence: 0 };
    }

    // Sort dividend history by date (newest first)
    const sortedDividends = dividendHistory
        .filter(div => div.date && div.amount && Number(div.amount) > 0)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedDividends.length < 2) {
        return { isRegular: false, frequency: 'irregular', confidence: 0 };
    }

    // Calculate intervals between payments in days
    const intervals = [];
    for (let i = 0; i < sortedDividends.length - 1; i++) {
        const current = new Date(sortedDividends[i].date);
        const next = new Date(sortedDividends[i + 1].date);
        const daysDiff = Math.abs((current - next) / (1000 * 60 * 60 * 24));
        intervals.push(daysDiff);
    }

    if (intervals.length === 0) {
        return { isRegular: false, frequency: 'irregular', confidence: 0 };
    }

    // Define frequency patterns (days ± tolerance)
    const patterns = {
        monthly: { target: 30, tolerance: 7, name: 'monthly' },
        quarterly: { target: 90, tolerance: 15, name: 'quarterly' },
        semiAnnual: { target: 180, tolerance: 30, name: 'semi-annual' },
        annual: { target: 365, tolerance: 60, name: 'annual' }
    };

    // Check each pattern
    for (const [key, pattern] of Object.entries(patterns)) {
        let matches = 0;
        for (const interval of intervals) {
            if (Math.abs(interval - pattern.target) <= pattern.tolerance) {
                matches++;
            }
        }

        const confidence = matches / intervals.length;
        
        // Require at least 60% of intervals to match for regular pattern
        // and at least 3 data points for reliable detection
        if (confidence >= 0.6 && intervals.length >= 2) {
            return { 
                isRegular: true, 
                frequency: pattern.name, 
                confidence: Math.round(confidence * 100) 
            };
        }
    }

    // Check for bi-monthly pattern (every 2 months = ~60 days)
    let biMonthlyMatches = 0;
    for (const interval of intervals) {
        if (Math.abs(interval - 60) <= 10) {
            biMonthlyMatches++;
        }
    }
    
    const biMonthlyConfidence = biMonthlyMatches / intervals.length;
    if (biMonthlyConfidence >= 0.6 && intervals.length >= 2) {
        return { 
            isRegular: true, 
            frequency: 'bi-monthly', 
            confidence: Math.round(biMonthlyConfidence * 100) 
        };
    }

    return { isRegular: false, frequency: 'irregular', confidence: 0 };
};

/**
 * FIXED: Relaxed dividend detection that properly handles all dividend stocks
 * @param {Object} position - Position object with dividend data
 * @returns {boolean} - True if position pays dividends
 */
export const isDividendPayingStock = (position) => {
    const dividendData = position.dividendData || {};
    
    // Check various dividend indicators
    const totalReceived = Number(dividendData.totalReceived) || 0;
    const monthlyDividend = Number(dividendData.monthlyDividendPerShare) || 
                          Number(dividendData.monthlyDividend) || 0;
    const annualDividend = Number(dividendData.annualDividend) || 0;
    const dividendPerShare = Number(position.dividendPerShare) || 0;
    const yieldOnCost = Number(dividendData.yieldOnCost) || 0;
    const currentYield = Number(dividendData.currentYield) || 0;
    
    // FIXED: If ANY dividend indicator is positive, consider it a dividend stock
    // This ensures we don't miss dividend stocks that might have irregular patterns
    if (totalReceived > 0 || 
        monthlyDividend > 0 || 
        annualDividend > 0 || 
        dividendPerShare > 0 ||
        yieldOnCost > 0 ||
        currentYield > 0) {
        
        // Optional: Check frequency if history exists, but don't exclude based on it
        if (dividendData.dividendHistory && Array.isArray(dividendData.dividendHistory)) {
            const frequencyAnalysis = detectDividendFrequency(dividendData.dividendHistory);
            
            // Log the analysis but don't exclude stocks
            if (frequencyAnalysis.isRegular) {
                console.log(`${position.symbol}: Regular dividend pattern - ${frequencyAnalysis.frequency} (${frequencyAnalysis.confidence}% confidence)`);
            } else {
                console.log(`${position.symbol}: Irregular pattern but still pays dividends`);
            }
        }
        
        return true; // Include all stocks that have paid any dividends
    }
    
    // Only exclude if there's absolutely no dividend data
    console.log(`${position.symbol}: No dividend data found`);
    return false;
};

export const getAccountIcon = (accountType) => {
    const icons = {
        'TFSA': '🔒',
        'RRSP': '📈',
        'FHSA': '🏠',
        'Cash': '💰',
        'Margin': '⚡',
        'USD': '💵',
        'default': '🏦'
    };
    return icons[accountType] || icons.default;
};

export const getAccountColor = (accountType) => {
    const colors = {
        'TFSA': '#10b981',
        'RRSP': '#3b82f6',
        'FHSA': '#8b5cf6',
        'Cash': '#f59e0b',
        'Margin': '#ef4444',
        'USD': '#06b6d4',
        'default': '#64748b'
    };
    return colors[accountType] || colors.default;
};