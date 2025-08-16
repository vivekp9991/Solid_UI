// src/services/portfolioService.js - UPDATED TO SUPPORT CASH BALANCE UPDATES
import { syncAllPersons, syncPerson } from '../api';

export class PortfolioService {
    static async runQuestrade(selectedAccount, isLoading, setIsLoading, setLastQuestradeRun, loadExchangeRate, loadAllData) {
        if (isLoading()) return;
        
        setIsLoading(true);
        try {
            const account = selectedAccount();
            
            if (account.personName) {
                await syncPerson(account.personName, false);
            } else {
                await syncAllPersons(false);
            }
            
            // Reload exchange rate and all data after sync
            await loadExchangeRate();
            await loadAllData();
            setLastQuestradeRun(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Failed to run sync:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }

    static updateStatsWithLivePrice(stockData, setStatsData, formatCurrency, formatPercent) {
        const stocks = stockData();
        if (stocks.length === 0) return;

        const totalValue = stocks.reduce((sum, s) => sum + s.marketValueNum, 0);
        const totalCost = stocks.reduce((sum, s) => sum + s.totalCostNum, 0);
        const unrealizedPnl = totalValue - totalCost;
        const unrealizedPnlPercent = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;
        const totalDividendsReceived = stocks.reduce((sum, s) => sum + s.totalReceivedNum, 0);
        const totalReturnValue = unrealizedPnl + totalDividendsReceived;
        const totalReturnPercent = totalCost > 0 ? (totalReturnValue / totalCost) * 100 : 0;
        
        // Calculate yield on cost
        const totalAnnualDividends = stocks.reduce((sum, s) => sum + s.annualDividendNum, 0);
        const yieldOnCostPercent = totalCost > 0 && totalAnnualDividends > 0
           ? (totalAnnualDividends / totalCost) * 100
           : 0;

       setStatsData(prev => {
           // Keep the cash balance card data (6th card) unchanged during live price updates
           const newStats = [
               { ...prev[0], value: formatCurrency(totalCost) },
               { ...prev[1], value: formatCurrency(totalValue) },
               {
                   ...prev[2],
                   value: formatCurrency(unrealizedPnl),
                   subtitle: formatPercent(unrealizedPnlPercent),
                   positive: unrealizedPnl >= 0,
                   rawValue: unrealizedPnl,
                   percentValue: unrealizedPnlPercent
               },
               {
                   ...prev[3],
                   value: formatCurrency(totalReturnValue),
                   subtitle: `${formatPercent(totalReturnPercent)} (incl. dividends)`,
                   positive: totalReturnValue >= 0,
                   rawValue: totalReturnValue,
                   percentValue: totalReturnPercent
               },
               {
                   ...prev[4],
                   value: formatPercent(yieldOnCostPercent),
                   subtitle: `${(totalAnnualDividends / 12).toFixed(2)}/month`,
                   rawValue: yieldOnCostPercent
               }
           ];
           
           // Preserve the 6th card (Cash Balance) if it exists
           if (prev.length >= 6) {
               newStats.push(prev[5]); // Keep cash balance card unchanged
           }
           
           return newStats;
       });
   }
}