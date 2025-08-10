// src/streaming.js
import { fetchAccessToken } from './api';

let ws = null;
let reconnectInterval = null;
let subscribedSymbols = [];

async function getQuestradeStreamUrl() {
  // Get access token and API server from your backend
  const tokenData = await fetchAccessToken();
  
  // Questrade WebSocket URL format
  // Replace 'api' with 'stream' in the API server URL
  const streamUrl = tokenData.apiServer.replace('api', 'stream');
  return `${streamUrl}v1/markets/quotes?mode=WebSocket&access_token=${tokenData.token}`;
}

export async function startQuoteStream(symbols, onQuote) {
  // Filter out empty symbols and format for Questrade
  subscribedSymbols = symbols.filter(s => s && s.length > 0);
  
  if (subscribedSymbols.length === 0) {
    console.log('No symbols to subscribe to');
    return null;
  }

  // Close existing connection if any
  if (ws) {
    ws.close();
  }

  try {
    const url = await getQuestradeStreamUrl();
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected, subscribing to:', subscribedSymbols);
      
      // Questrade WebSocket subscription format
      // You need to send symbol IDs, not symbols
      // First, get symbol IDs from your backend
      fetchSymbolIds(subscribedSymbols).then(symbolIds => {
        if (symbolIds && symbolIds.length > 0) {
          const subscribeMessage = {
            ids: symbolIds,
            mode: 'streaming'
          };
          ws.send(JSON.stringify(subscribeMessage));
        }
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Questrade sends quotes in an array
        if (data.quotes && Array.isArray(data.quotes)) {
          data.quotes.forEach(quote => {
            if (onQuote) {
              onQuote({
                symbol: quote.symbol,
                lastTradePrice: quote.lastTradePrice,
                bidPrice: quote.bidPrice,
                askPrice: quote.askPrice,
                volume: quote.volume,
                openPrice: quote.openPrice,
                highPrice: quote.highPrice,
                lowPrice: quote.lowPrice,
                delay: quote.delay
              });
            }
          });
        }
      } catch (err) {
        console.error('Failed to parse stream message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      scheduleReconnect(symbols, onQuote);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      scheduleReconnect(symbols, onQuote);
    };

    return ws;
  } catch (error) {
    console.error('Failed to start quote stream:', error);
    scheduleReconnect(symbols, onQuote);
    return null;
  }
}

function scheduleReconnect(symbols, onQuote) {
  if (reconnectInterval) {
    clearTimeout(reconnectInterval);
  }
  
  reconnectInterval = setTimeout(() => {
    console.log('Attempting to reconnect WebSocket...');
    startQuoteStream(symbols, onQuote);
  }, 5000); // Reconnect after 5 seconds
}

// Helper function to get symbol IDs from backend
async function fetchSymbolIds(symbols) {
  try {
    const response = await fetch(`http://localhost:4000/api/market/symbols/${symbols.join(',')}`);
    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data.map(s => s.symbolId);
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch symbol IDs:', error);
    return [];
  }
}

// Alternative: Use polling instead of WebSocket
export async function startPollingQuotes(symbols, onQuote, interval = 5000) {
  const pollQuotes = async () => {
    if (!symbols || symbols.length === 0) return;
    
    try {
      const response = await fetch(`http://localhost:4000/api/market/quote/${symbols.join(',')}`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.quotes) {
        data.data.quotes.forEach(quote => {
          if (onQuote) {
            onQuote({
              symbol: quote.symbol,
              lastTradePrice: quote.lastTradePrice,
              bidPrice: quote.bidPrice,
              askPrice: quote.askPrice,
              volume: quote.volume,
              openPrice: quote.openPrice
            });
          }
        });
      }
    } catch (error) {
      console.error('Failed to poll quotes:', error);
    }
  };

  // Initial poll
  pollQuotes();
  
  // Set up interval
  const intervalId = setInterval(pollQuotes, interval);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}

export function stopQuoteStream() {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (reconnectInterval) {
    clearTimeout(reconnectInterval);
    reconnectInterval = null;
  }
}