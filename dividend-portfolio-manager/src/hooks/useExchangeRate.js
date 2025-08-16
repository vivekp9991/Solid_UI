// src/hooks/useExchangeRate.js
import { createSignal, onMount, onCleanup } from 'solid-js';
import { fetchExchangeRate } from '../api';
import { DEFAULT_USD_CAD_RATE, POLLING_INTERVALS } from '../utils/constants';

export function useExchangeRate() {
    const [usdCadRate, setUsdCadRate] = createSignal(DEFAULT_USD_CAD_RATE);

    const loadExchangeRate = async () => {
        try {
            const rate = await fetchExchangeRate('USD', 'CAD');
            setUsdCadRate(rate);
            console.log('USD/CAD Exchange Rate:', rate);
        } catch (error) {
            console.warn('Failed to load exchange rate:', error);
            setUsdCadRate(DEFAULT_USD_CAD_RATE);
        }
    };

    onMount(() => {
        loadExchangeRate();
        
        // Refresh exchange rate every 30 minutes
        const interval = setInterval(loadExchangeRate, POLLING_INTERVALS.EXCHANGE_RATE);
        
        onCleanup(() => {
            clearInterval(interval);
        });
    });

    return {
        usdCadRate,
        loadExchangeRate
    };
}