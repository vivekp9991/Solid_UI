// src/services/formatters.js - FIXED: DIVIDEND RETURN now shows total dollar amount
import { formatCurrency, formatPercent, formatTodayChange, convertToCAD, isDividendPayingStock, detectDividendFrequency } from '../utils/helpers';

export const formatStockData = (positions, usdCadRate) => {
    if (!Array.isArray(positions)) return [];

    return positions.map(pos => {
        const currency = pos.currency || 'CAD';
        const sharesNum = Number(pos.openQuantity) || 0;
        const avgCostNum = Number(pos.averageEntryPrice) || 0;
        const currentPriceNum = Number(pos.currentPrice) || 0;
        const openPriceNum = Number(pos.openPrice) || currentPriceNum;
        
        // Convert to CAD for aggregation
        const avgCostCAD = convertToCAD(avgCostNum, currency, usdCadRate);
        const currentPriceCAD = convertToCAD(currentPriceNum, currency, usdCadRate);
        const openPriceCAD = convertToCAD(openPriceNum, currency, usdCadRate);
        
        const marketValueCAD = currentPriceCAD * sharesNum;
        const totalCostCAD = avgCostCAD * sharesNum;
        
        const dividendData = pos.dividendData || {};
        
        // ENHANCED: Use improved dividend detection with frequency analysis
        const isDividendStock = isDividendPayingStock(pos);
        
        // Log dividend frequency analysis for debugging
        if (dividendData.dividendHistory && Array.isArray(dividendData.dividendHistory)) {
            const frequencyAnalysis = detectDividendFrequency(dividendData.dividendHistory);
            console.log(`${pos.symbol} dividend analysis:`, {
                isRegular: frequencyAnalysis.isRegular,
                frequency: frequencyAnalysis.frequency,
                confidence: frequencyAnalysis.confidence,
                historyLength: dividendData.dividendHistory.length,
                isDividendStock
            });
        }
        
        // Calculate dividend metrics ONLY for stocks with regular dividend patterns
        let dividendPerShare = 0;
        let annualDividendPerShare = 0;
        let monthlyDividendTotal = 0;
        let annualDividendTotal = 0;
        let currentYieldPercentNum = 0;
        let yieldOnCostPercentNum = 0;
        let dividendReturnPercentNum = 0;
        let divAdjCostPerShare = avgCostCAD;
        let divAdjYieldPercentNum = 0;
        
        const totalReceivedNum = convertToCAD(Number(dividendData.totalReceived) || 0, currency, usdCadRate);
        
        if (isDividendStock) {
            dividendPerShare = pos.dividendPerShare !== undefined
                ? convertToCAD(Number(pos.dividendPerShare) || 0, currency, usdCadRate)
                : convertToCAD(dividendData.monthlyDividendPerShare || 0, currency, usdCadRate);

            annualDividendPerShare = dividendData.annualDividendPerShare || (dividendPerShare * 12);
            monthlyDividendTotal = dividendPerShare * sharesNum;
            annualDividendTotal = annualDividendPerShare * sharesNum;
            
            currentYieldPercentNum = currentPriceCAD > 0 && annualDividendPerShare > 0
                ? (annualDividendPerShare / currentPriceCAD) * 100
                : dividendData.currentYield || 0;
            
            yieldOnCostPercentNum = avgCostCAD > 0 && annualDividendPerShare > 0
                ? (annualDividendPerShare / avgCostCAD) * 100
                : dividendData.yieldOnCost || 0;
            
            // FIXED: Calculate percentage for internal use, but display will show dollar amount
            dividendReturnPercentNum = totalCostCAD > 0 && totalReceivedNum > 0
                ? (totalReceivedNum / totalCostCAD) * 100 
                : 0;
            
            divAdjCostPerShare = sharesNum > 0 && totalReceivedNum > 0
                ? avgCostCAD - (totalReceivedNum / sharesNum) 
                : avgCostCAD;
            
            divAdjYieldPercentNum = divAdjCostPerShare > 0 && annualDividendPerShare > 0
                ? (annualDividendPerShare / divAdjCostPerShare) * 100 
                : 0;
        }
        
        const capitalGainValue = marketValueCAD - totalCostCAD;
        const capitalGainPercent = totalCostCAD > 0 
            ? (capitalGainValue / totalCostCAD) * 100 
            : 0;
        
        const totalReturnValue = capitalGainValue + totalReceivedNum;
        const totalReturnPercent = totalCostCAD > 0 
            ? (totalReturnValue / totalCostCAD) * 100 
            : 0;

        // Calculate today's change
        const todayChangeValueNum = (currentPriceCAD - openPriceCAD) * sharesNum;
        const todayChangePercentNum = openPriceCAD > 0 
            ? ((currentPriceCAD - openPriceCAD) / openPriceCAD) * 100 
            : 0;

        // Handle aggregation data - using the new structure
        const isAggregated = pos.isAggregated || false;
        const sourceAccounts = pos.sourceAccounts || [];
        const accountCount = pos.accountCount || 1;
        
        // Map individualPositions to match expected structure
        const individualPositions = (pos.individualPositions || []).map(p => ({
            accountName: p.accountName || 'Unknown Account',
            accountType: p.accountType || 'Unknown Type',
            personName: p.personName || 'Unknown',
            shares: String(p.shares || 0),
            avgCost: formatCurrency(convertToCAD(p.avgCost || 0, p.currency || currency, usdCadRate)),
            marketValue: formatCurrency(convertToCAD(p.marketValue || 0, p.currency || currency, usdCadRate)),
            currency: p.currency || currency
        }));

        return {
            symbol: pos.symbol || '',
            company: pos.symbol || '', // Use symbol as company name if not provided
            currency: currency,
            dotColor: totalReturnPercent >= 0 ? '#10b981' : '#ef4444',
            shares: String(sharesNum),
            sharesNum,
            avgCost: formatCurrency(avgCostCAD),
            avgCostNum: avgCostCAD,
            current: formatCurrency(currentPriceCAD),
            currentPriceNum: currentPriceCAD,
            openPrice: formatCurrency(openPriceCAD),
            openPriceNum: openPriceCAD,
            totalReturn: formatPercent(totalReturnPercent),
            totalReturnPercentNum: totalReturnPercent,
            currentYield: isDividendStock ? formatPercent(currentYieldPercentNum) : '0.00%',
            currentYieldPercentNum: isDividendStock ? currentYieldPercentNum : 0,
            marketValue: formatCurrency(marketValueCAD),
            marketValueNum: marketValueCAD,
            capitalGrowth: formatPercent(capitalGainPercent),
            capitalGainPercentNum: capitalGainPercent,
            // FIXED: DIVIDEND RETURN now shows total dollar amount received, not percentage
            dividendReturn: isDividendStock ? formatCurrency(totalReceivedNum) : '$0.00',
            dividendReturnPercentNum: isDividendStock ? dividendReturnPercentNum : 0,
            yieldOnCost: isDividendStock ? formatPercent(yieldOnCostPercentNum) : 'N/A',
            yieldOnCostPercentNum: isDividendStock ? yieldOnCostPercentNum : 0,
            divAdjCost: isDividendStock ? formatCurrency(divAdjCostPerShare) : 'N/A',
            divAdjCostNum: isDividendStock ? divAdjCostPerShare : avgCostCAD,
            divAdjYield: isDividendStock ? formatPercent(divAdjYieldPercentNum) : 'N/A',
            divAdjYieldPercentNum: isDividendStock ? divAdjYieldPercentNum : 0,
            monthlyDiv: isDividendStock ? formatCurrency(monthlyDividendTotal) : '$0.00',
            monthlyDividendNum: monthlyDividendTotal,
            dividendPerShare: isDividendStock ? formatCurrency(dividendPerShare) : '$0.00',
            dividendPerShareNum: dividendPerShare,
            annualDividendPerShare,
            todayChange: formatTodayChange(todayChangeValueNum, todayChangePercentNum),
            todayChangeValueNum,
            todayChangePercentNum,
            valueWoDiv: formatCurrency(marketValueCAD - totalReceivedNum),
            annualDividendNum: annualDividendTotal,
            totalReceivedNum,
            totalCostNum: totalCostCAD,
            isDividendStock,
            isAggregated,
            sourceAccounts,
            accountCount,
            lastUpdateTime: null,
            dividendFrequencyAnalysis: dividendData.dividendHistory ? detectDividendFrequency(dividendData.dividendHistory) : null,
            individualPositions
        };
    });
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