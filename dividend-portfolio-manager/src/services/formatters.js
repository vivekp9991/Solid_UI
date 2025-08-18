// src/services/formatters.js - FIXED: Proper dividend calculations without strict filtering
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
        
        // FIXED: Use relaxed dividend detection
        const isDividendStock = isDividendPayingStock(pos);
        
        // Log dividend analysis for debugging
        if (isDividendStock) {
            console.log(`${pos.symbol} is a dividend stock:`, {
                totalReceived: dividendData.totalReceived,
                monthlyDividend: dividendData.monthlyDividendPerShare,
                annualDividend: dividendData.annualDividend,
                yieldOnCost: dividendData.yieldOnCost
            });
        }
        
        // Calculate dividend metrics for ALL dividend stocks (no strict filtering)
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
            // Get dividend per share from various sources
            dividendPerShare = pos.dividendPerShare !== undefined
                ? convertToCAD(Number(pos.dividendPerShare) || 0, currency, usdCadRate)
                : convertToCAD(Number(dividendData.monthlyDividendPerShare) || 0, currency, usdCadRate);

            // If we still don't have dividend per share but have yield data, calculate it
            if (dividendPerShare === 0 && dividendData.yieldOnCost > 0 && avgCostCAD > 0) {
                annualDividendPerShare = (dividendData.yieldOnCost / 100) * avgCostCAD;
                dividendPerShare = annualDividendPerShare / 12;
            }

            // Calculate annual dividend
            annualDividendPerShare = dividendPerShare > 0 
                ? dividendPerShare * 12 
                : convertToCAD(Number(dividendData.annualDividendPerShare) || 0, currency, usdCadRate);

            monthlyDividendTotal = dividendPerShare * sharesNum;
            annualDividendTotal = annualDividendPerShare * sharesNum;
            
            // Calculate yields
            currentYieldPercentNum = currentPriceCAD > 0 && annualDividendPerShare > 0
                ? (annualDividendPerShare / currentPriceCAD) * 100
                : Number(dividendData.currentYield) || 0;
            
            yieldOnCostPercentNum = avgCostCAD > 0 && annualDividendPerShare > 0
                ? (annualDividendPerShare / avgCostCAD) * 100
                : Number(dividendData.yieldOnCost) || 0;
            
            // Calculate dividend return as percentage
            dividendReturnPercentNum = totalCostCAD > 0 && totalReceivedNum > 0
                ? (totalReceivedNum / totalCostCAD) * 100 
                : 0;
            
            // Calculate dividend adjusted metrics
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

        // Handle aggregation data
        const isAggregated = pos.isAggregated || false;
        const sourceAccounts = pos.sourceAccounts || [];
        const accountCount = pos.accountCount || 1;
        const individualPositions = pos.individualPositions || [];

        return {
            symbol: pos.symbol || '',
            company: pos.symbol || '',
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
            dividendReturn: isDividendStock ? formatCurrency(totalReceivedNum) : '$0.00',
            dividendReturnPercentNum: isDividendStock ? dividendReturnPercentNum : 0,
            yieldOnCost: isDividendStock && yieldOnCostPercentNum > 0 ? formatPercent(yieldOnCostPercentNum) : 'N/A',
            yieldOnCostPercentNum: isDividendStock ? yieldOnCostPercentNum : 0,
            divAdjCost: isDividendStock && divAdjCostPerShare > 0 ? formatCurrency(divAdjCostPerShare) : 'N/A',
            divAdjCostNum: isDividendStock ? divAdjCostPerShare : avgCostCAD,
            divAdjYield: isDividendStock && divAdjYieldPercentNum > 0 ? formatPercent(divAdjYieldPercentNum) : 'N/A',
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
            individualPositions: individualPositions.map(p => ({
                accountName: p.accountName || 'Unknown Account',
                accountType: p.accountType || 'Unknown Type',
                shares: String(p.shares ?? p.openQuantity ?? 0),
                avgCost: formatCurrency(convertToCAD(p.avgCost ?? p.averageEntryPrice ?? 0, p.currency || 'CAD', usdCadRate)),
                marketValue: formatCurrency(convertToCAD(p.marketValue ?? (p.currentPrice * (p.shares ?? p.openQuantity ?? 0)) ?? 0, p.currency || 'CAD', usdCadRate))
            }))
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