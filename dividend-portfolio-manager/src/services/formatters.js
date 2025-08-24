// src/services/formatters.js - UPDATED WITH ALL CALCULATED FIELDS
import { formatCurrency, formatPercent, formatTodayChange, convertToCAD, isDividendPayingStock, detectDividendFrequency } from '../utils/helpers';

export const formatStockData = (positions, usdCadRate) => {
    if (!Array.isArray(positions)) return [];

    return positions.map(pos => {
        const currency = pos.currency || 'CAD';
        
        // Base values from backend
        const sharesNum = Number(pos.openQuantity) || Number(pos.shares) || 0;
        const avgCostNum = Number(pos.averageEntryPrice) || Number(pos.avgCost) || 0;
        const currentPriceNum = Number(pos.currentPrice) || 0;
        const openPriceNum = Number(pos.openPrice) || currentPriceNum;
        const divPerShareNum = Number(pos.dividendPerShare) || 0;
        const totalDivReceivedNum = Number(pos.totalDividendsReceived) || 0;
        
        // Convert to CAD for calculations
        const avgCostCAD = convertToCAD(avgCostNum, currency, usdCadRate);
        const currentPriceCAD = convertToCAD(currentPriceNum, currency, usdCadRate);
        const openPriceCAD = convertToCAD(openPriceNum, currency, usdCadRate);
        const divPerShareCAD = convertToCAD(divPerShareNum, currency, usdCadRate);
        const totalDivReceivedCAD = convertToCAD(totalDivReceivedNum, currency, usdCadRate);
        
        // Calculate today's changes
        const todayChangeValue = currentPriceCAD - openPriceCAD;
        const todayChangePercent = openPriceCAD > 0 ? ((currentPriceCAD - openPriceCAD) / openPriceCAD) * 100 : 0;
        
        // Calculate yields
        const annualDivPerShare = divPerShareCAD * 12; // Assuming monthly dividends
        const currentYieldNum = currentPriceCAD > 0 && annualDivPerShare > 0
            ? (annualDivPerShare / currentPriceCAD) * 100
            : 0;
        const monthlyYieldNum = currentYieldNum / 12;
        const yieldOnCostNum = avgCostCAD > 0 && annualDivPerShare > 0
            ? (annualDivPerShare / avgCostCAD) * 100
            : 0;
        
        // Calculate investment and market values
        const investmentValueNum = avgCostCAD * sharesNum;
        const marketValueNum = currentPriceCAD * sharesNum;
        
        // Calculate today's return
        const todayReturnValue = todayChangeValue * sharesNum;
        const todayReturnPercent = investmentValueNum > 0 
            ? (todayReturnValue / investmentValueNum) * 100 
            : 0;
        
        // Calculate dividend income
        const monthlyDivIncomeNum = sharesNum * divPerShareCAD;
        
        // Calculate dividend adjusted metrics
        const divAdjCostPerShare = sharesNum > 0 
            ? avgCostCAD - (totalDivReceivedCAD / sharesNum)
            : avgCostCAD;
        const divAdjCostNum = divAdjCostPerShare > 0 ? divAdjCostPerShare : 0;
        
        const divAdjYieldNum = divAdjCostNum > 0 && annualDivPerShare > 0
            ? (annualDivPerShare / divAdjCostNum) * 100
            : 0;
        
        // Get source accounts
        const sourceAccounts = pos.sourceAccounts || pos.accounts || [];
        
        // Determine dot color based on total return
        const totalReturn = marketValueNum - investmentValueNum + totalDivReceivedCAD;
        const totalReturnPercent = investmentValueNum > 0 ? (totalReturn / investmentValueNum) * 100 : 0;
        const dotColor = totalReturnPercent >= 0 ? '#10b981' : '#ef4444';
        
        // Format today change and today return strings
        const todayChangeStr = `${todayChangeValue >= 0 ? '+' : ''}$${Math.abs(todayChangeValue).toFixed(2)} (${todayChangePercent >= 0 ? '+' : ''}${todayChangePercent.toFixed(2)}%)`;
        const todayReturnStr = `${todayReturnValue >= 0 ? '+' : ''}$${Math.abs(todayReturnValue).toFixed(2)} (${todayReturnPercent >= 0 ? '+' : ''}${todayReturnPercent.toFixed(2)}%)`;
        
        return {
            // Stock info
            symbol: pos.symbol || '',
            company: pos.companyName || pos.symbol || '',
            currency: currency,
            dotColor: dotColor,
            
            // Raw numeric values for calculations and sorting
            sharesNum,
            avgCostNum: avgCostCAD,
            currentPriceNum: currentPriceCAD,
            openPriceNum: openPriceCAD,
            todayChangeNum: todayChangePercent,
            todayChangeValueNum: todayChangeValue,
            currentYieldNum,
            monthlyYieldNum,
            yieldOnCostNum,
            investmentValueNum,
            marketValueNum,
            todayReturnNum: todayReturnPercent,
            todayReturnValueNum: todayReturnValue,
            divPerShareNum: divPerShareCAD,
            monthlyDivIncomeNum,
            totalDivReceivedNum: totalDivReceivedCAD,
            divAdjCostNum,
            divAdjYieldNum,
            
            // Formatted display values
            shares: String(sharesNum),
            avgCost: formatCurrency(avgCostCAD),
            currentPrice: formatCurrency(currentPriceCAD),
            todayChange: todayChangeStr,
            currentYield: formatPercent(currentYieldNum),
            monthlyYield: formatPercent(monthlyYieldNum),
            yieldOnCost: formatPercent(yieldOnCostNum),
            investmentValue: formatCurrency(investmentValueNum),
            marketValue: formatCurrency(marketValueNum),
            todayReturn: todayReturnStr,
            divPerShare: formatCurrency(divPerShareCAD),
            monthlyDivIncome: formatCurrency(monthlyDivIncomeNum),
            totalDivReceived: formatCurrency(totalDivReceivedCAD),
            divAdjCost: formatCurrency(divAdjCostNum),
            divAdjYield: formatPercent(divAdjYieldNum),
            
            // Additional metadata
            sourceAccounts,
            isAggregated: pos.isAggregated || false,
            accountCount: pos.accountCount || sourceAccounts.length || 1,
            lastUpdateTime: null,
            
            // Original position data (for reference)
            originalData: pos
        };
    });
};

// Function to update stock data with live prices from WebSocket
export const updateStockWithLiveData = (stock, quoteData, usdCadRate) => {
    const currency = stock.currency || 'CAD';
    
    // Update prices from quote
    const newCurrentPrice = Number(quoteData.lastTradePrice || quoteData.price || stock.currentPriceNum);
    const newCurrentPriceCAD = convertToCAD(newCurrentPrice, currency, usdCadRate);
    
    // Recalculate all dependent fields
    const todayChangeValue = newCurrentPriceCAD - stock.openPriceNum;
    const todayChangePercent = stock.openPriceNum > 0 
        ? ((newCurrentPriceCAD - stock.openPriceNum) / stock.openPriceNum) * 100 
        : 0;
    
    // Recalculate yields with new price
    const annualDivPerShare = stock.divPerShareNum * 12;
    const currentYieldNum = newCurrentPriceCAD > 0 && annualDivPerShare > 0
        ? (annualDivPerShare / newCurrentPriceCAD) * 100
        : 0;
    const monthlyYieldNum = currentYieldNum / 12;
    
    // Recalculate market value and today's return
    const marketValueNum = newCurrentPriceCAD * stock.sharesNum;
    const todayReturnValue = todayChangeValue * stock.sharesNum;
    const todayReturnPercent = stock.investmentValueNum > 0 
        ? (todayReturnValue / stock.investmentValueNum) * 100 
        : 0;
    
    // Format strings
    const todayChangeStr = `${todayChangeValue >= 0 ? '+' : ''}$${Math.abs(todayChangeValue).toFixed(2)} (${todayChangePercent >= 0 ? '+' : ''}${todayChangePercent.toFixed(2)}%)`;
    const todayReturnStr = `${todayReturnValue >= 0 ? '+' : ''}$${Math.abs(todayReturnValue).toFixed(2)} (${todayReturnPercent >= 0 ? '+' : ''}${todayReturnPercent.toFixed(2)}%)`;
    
    return {
        ...stock,
        // Update numeric values
        currentPriceNum: newCurrentPriceCAD,
        todayChangeNum: todayChangePercent,
        todayChangeValueNum: todayChangeValue,
        currentYieldNum,
        monthlyYieldNum,
        marketValueNum,
        todayReturnNum: todayReturnPercent,
        todayReturnValueNum: todayReturnValue,
        
        // Update formatted values
        currentPrice: formatCurrency(newCurrentPriceCAD),
        todayChange: todayChangeStr,
        currentYield: formatPercent(currentYieldNum),
        monthlyYield: formatPercent(monthlyYieldNum),
        marketValue: formatCurrency(marketValueNum),
        todayReturn: todayReturnStr,
        
        // Update metadata
        lastUpdateTime: Date.now()
    };
};

export const formatDividendCalendar = (calendar, usdCadRate) => {
    if (!Array.isArray(calendar)) return [];
    
    return calendar.map(d => ({
        symbol: d.symbol || '',
        amount: formatCurrency(Math.abs(convertToCAD(d.netAmount || d.amount || 0, d.currency || 'CAD', usdCadRate))),
        date: d.transactionDate ? new Date(d.transactionDate).toLocaleDateString() : 'N/A',
        currency: d.currency || 'CAD'
    }));
};