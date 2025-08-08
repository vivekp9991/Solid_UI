const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function handleResponse(response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  const json = await response.json();
  // Most endpoints wrap data in a { success: true, data: {...} } structure
  if (json.success && json.data !== undefined) {
    return json.data;
  }
  return json;
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
  // This endpoint doesn't exist in backend yet, returning mock data
  return {
    currentGainPercent: 0,
    dividendsYieldPercent: 0,
    totalReturnsValue: 0,
    overview: {
      totalInvestment: 0,
      currentValue: 0,
      totalReturnValue: 0,
      returnPercent: 0,
      numberOfPositions: 0,
      averagePositionSize: 0,
      largestPosition: { value: 0, symbol: 'N/A' }
    },
    dividendAnalysis: {
      currentYieldPercent: 0,
      yieldOnCostPercent: 0,
      dividendAdjustedAverageCost: 0,
      dividendAdjustedYieldPercent: 0,
      ttmYieldPercent: 0,
      monthlyAverage: 0,
      annualProjected: 0
    },
    performanceBreakdown: {
      capitalGainsValue: 0,
      dividendIncomeValue: 0,
      capitalGainsPercent: 0,
      dividendReturnPercent: 0,
      bestPerformingStock: null,
      monthlyIncome: 0,
      annualProjectedIncome: 0
    },
    riskMetrics: {
      portfolioConcentration: 'N/A',
      largestPositionWeight: 'N/A',
      sectorConcentration: 'N/A',
      geographicExposure: 'N/A',
      dividendDependency: 'N/A',
      yieldStability: 'N/A'
    },
    allocationAnalysis: {
      assetWeights: {},
      sectorWeights: {},
      highYieldAssetsPercent: 0,
      growthAssetsPercent: 0,
      averageYieldPercent: 0
    }
  };
}

export async function runPortfolioSync(fullSync = false) {
  const response = await fetch(`${API_BASE_URL}/api/portfolio/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullSync })
  });
  return handleResponse(response);
  }

export async function fetchStreamingCredentials() {
  const response = await fetch(`${API_BASE_URL}/api/stream/credentials`);
  return handleResponse(response);
}