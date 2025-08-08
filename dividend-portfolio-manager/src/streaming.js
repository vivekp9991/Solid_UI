import { fetchStreamingCredentials } from './api';

let cachedCreds = null;

async function getCredentials() {
  if (cachedCreds && cachedCreds.expiry && cachedCreds.expiry > Date.now()) {
    return cachedCreds;
  }
  const creds = await fetchStreamingCredentials();
  const ttl = creds.expiresIn ? creds.expiresIn * 1000 : 60 * 60 * 1000;
  cachedCreds = { ...creds, expiry: Date.now() + ttl };
  return cachedCreds;
}

export async function startQuoteStream(symbols, onQuote) {
  const creds = await getCredentials();
  const url = `${creds.streamUrl}?access_token=${creds.token}`;
  const ws = new WebSocket(url);

  ws.onopen = () => {
    try {
      ws.send(
        JSON.stringify({
          quotes: { symbols, subscribe: true }
        })
      );
    } catch (err) {
      console.error('Failed to subscribe to quotes', err);
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (Array.isArray(data)) {
        data.forEach(q => onQuote && onQuote(q));
      } else {
        onQuote && onQuote(data);
      }
    } catch (err) {
      console.error('Failed to parse stream message', err);
    }
  };

  ws.onerror = (err) => console.error('Stream error', err);
  return ws;
}