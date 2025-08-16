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

export const isDividendPayingStock = (position) => {
    const dividendData = position.dividendData || {};
    const totalReceived = Number(dividendData.totalReceived) || 0;
    const monthlyDividend = Number(dividendData.monthlyDividendPerShare) || 
                          Number(dividendData.monthlyDividend) || 0;
    const annualDividend = Number(dividendData.annualDividend) || 0;
    const dividendPerShare = Number(position.dividendPerShare) || 0;
    
    return totalReceived > 0 || monthlyDividend > 0 || annualDividend > 0 || dividendPerShare > 0;
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