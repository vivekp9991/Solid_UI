const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function handleResponse(response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  return response.json();
}

export async function fetchPortfolioSummary(accountId) {
  const url = new URL(`${API_BASE_URL}/api/portfolio/summary`);
  if (accountId) url.searchParams.set('accountId', accountId);
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchPositions(accountId) {
  const url = new URL(`${API_BASE_URL}/api/portfolio/positions`);
  if (accountId) url.searchParams.set('accountId', accountId);
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchDividendCalendar(accountId) {
  const url = new URL(`${API_BASE_URL}/api/portfolio/dividends/calendar`);
  if (accountId) url.searchParams.set('accountId', accountId);
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchPortfolioAnalysis(accountId) {
  const url = new URL(`${API_BASE_URL}/api/portfolio/analysis`);
  if (accountId) url.searchParams.set('accountId', accountId);
  const response = await fetch(url);
  return handleResponse(response);
}

export async function runPortfolioSync(fullSync = false) {
  const response = await fetch(`${API_BASE_URL}/api/portfolio/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullSync })
  });
  return handleResponse(response);
}