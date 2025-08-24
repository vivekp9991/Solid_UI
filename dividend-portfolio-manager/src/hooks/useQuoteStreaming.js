// src/hooks/useQuoteStreaming.js - UPDATED FOR NEW DATA STRUCTURE
import { createSignal, onCleanup } from 'solid-js';
import { startPollingQuotes, stopQuoteStream } from '../streaming';
import { POLLING_INTERVALS } from '../utils/constants';
import { updateStockWithLiveData } from '../services/formatters';

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

                const currentRate = usdCadRate();
                
                // Check if price actually changed
                const newPrice = Number(price);
                const oldPrice = stock.currency === 'USD' 
                    ? stock.currentPriceNum / currentRate 
                    : stock.currentPriceNum;
                
                if (Math.abs(newPrice - oldPrice) < 0.001) {
                    return stock;
                }

                hasChanges = true;
                console.log(`💰 Price change detected for ${stock.symbol}: ${oldPrice} → ${newPrice}`);
                
                // Update stock with live data using the formatter function
                const updatedStock = updateStockWithLiveData(stock, quote, currentRate);
                
                return updatedStock;
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