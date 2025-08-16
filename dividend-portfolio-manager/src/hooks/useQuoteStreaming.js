// src/hooks/useQuoteStreaming.js
import { createSignal, onCleanup } from 'solid-js';
import { startPollingQuotes, stopQuoteStream } from '../streaming';
import { POLLING_INTERVALS } from '../utils/constants';
import { formatCurrency, formatPercent, formatTodayChange, convertToCAD } from '../utils/helpers';

export function useQuoteStreaming(stockData, setStockData, usdCadRate, updateStatsWithLivePrice) {
    const [updatedStocks, setUpdatedStocks] = createSignal(new Set());
    let pollingCleanup = null;

    const handleQuoteUpdate = (quote) => {
        const price = quote.lastTradePrice || quote.price;
        if (!price || !quote.symbol) return;

        console.log(`📈 Processing quote update for ${quote.symbol}: ${price}`);

        setStockData(prevStocks => {
            let hasChanges = false;
            
            const newStocks = prevStocks.map(stock => {
                if (stock.symbol !== quote.symbol) return stock;

                const currency = stock.currency || 'CAD';
                const newPrice = convertToCAD(price, currency, usdCadRate());
                const openPrice = convertToCAD(quote.openPrice || stock.openPriceNum || newPrice, currency, usdCadRate());
                
                if (Math.abs(newPrice - stock.currentPriceNum) < 0.001) {
                    return stock;
                }

                hasChanges = true;
                console.log(`💰 Price change detected for ${stock.symbol}: ${stock.currentPriceNum} → ${newPrice}`);
                
                const newMarketValue = newPrice * stock.sharesNum;
                const totalCost = stock.totalCostNum || (stock.avgCostNum * stock.sharesNum);
                
                const newCapitalValue = newMarketValue - totalCost;
                const newCapitalPercent = totalCost > 0 ? (newCapitalValue / totalCost) * 100 : 0;
                
                const newTotalReturnValue = newCapitalValue + stock.totalReceivedNum;
                const newTotalPercent = totalCost > 0 ? (newTotalReturnValue / totalCost) * 100 : 0;
                
                const newCurrentYieldPercent = stock.isDividendStock && newPrice > 0 && stock.annualDividendPerShare > 0
                    ? (stock.annualDividendPerShare / newPrice) * 100 
                    : 0;
                
                const newValueWoDiv = newMarketValue - stock.totalReceivedNum;

                const todayChangeValue = (newPrice - openPrice) * stock.sharesNum;
                const todayChangePercent = openPrice > 0 ? ((newPrice - openPrice) / openPrice) * 100 : 0;

                return {
                    ...stock,
                    currentPriceNum: newPrice,
                    openPriceNum: openPrice,
                    marketValueNum: newMarketValue,
                    capitalGainPercentNum: newCapitalPercent,
                    totalReturnPercentNum: newTotalPercent,
                    currentYieldPercentNum: newCurrentYieldPercent,
                    todayChangeValueNum: todayChangeValue,
                    todayChangePercentNum: todayChangePercent,
                    lastUpdateTime: Date.now(),
                    current: formatCurrency(newPrice),
                    openPrice: formatCurrency(openPrice),
                    marketValue: formatCurrency(newMarketValue),
                    capitalGrowth: formatPercent(newCapitalPercent),
                    totalReturn: formatPercent(newTotalPercent),
                    currentYield: stock.isDividendStock ? formatPercent(newCurrentYieldPercent) : '0.00%',
                    valueWoDiv: formatCurrency(newValueWoDiv),
                    todayChange: formatTodayChange(todayChangeValue, todayChangePercent),
                    dotColor: newTotalPercent >= 0 ? '#10b981' : '#ef4444'
                };
            });

            if (hasChanges) {
                console.log(`✅ Stock data updated with new prices`);
                updateStatsWithLivePrice();
                
                // Track updated stocks for animation
                const currentTime = Date.now();
                const recentlyUpdated = new Set();
                
                newStocks.forEach(stock => {
                    if (stock.lastUpdateTime && (currentTime - stock.lastUpdateTime) < 2000) {
                        recentlyUpdated.add(stock.symbol);
                    }
                });
                
                setUpdatedStocks(recentlyUpdated);
                
                // Clear the updates after animation completes
                setTimeout(() => {
                    setUpdatedStocks(new Set());
                }, 1500);
                
                return newStocks;
            }
            
            return prevStocks;
        });
    };

    const startQuotePolling = async (symbols) => {
        if (symbols && symbols.length > 0) {
            if (pollingCleanup) {
                pollingCleanup();
            }
            pollingCleanup = await startPollingQuotes(symbols, handleQuoteUpdate, POLLING_INTERVALS.QUOTES);
        }
    };

    const stopQuotePolling = () => {
        if (pollingCleanup) {
            pollingCleanup();
            pollingCleanup = null;
        }
        stopQuoteStream();
    };

    onCleanup(() => {
        stopQuotePolling();
    });

    return {
        updatedStocks,
        startQuotePolling,
        stopQuotePolling,
        handleQuoteUpdate
    };
}