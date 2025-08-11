// src/api.js
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

// Account Selection & Multi-Person Functions
export async function fetchDropdownOptions() {
  const response = await fetch(`${API_BASE_URL}/api/accounts/dropdown-options`);
  const data = await handleResponse(response);
  
  // Transform the data to match the expected format in the component
  if (Array.isArray(data)) {
    return data.map(option => ({
      ...option,
      viewMode: option.type, // Map 'type' to 'viewMode'
      aggregate: option.type === 'all' || option.type === 'person' // Set aggregate flag
    }));
  }
  
  return data;
}

export async function fetchAccountsByPerson() {
  const response = await fetch(`${API_BASE_URL}/api/accounts/by-person`);
  return handleResponse(response);
}

// Person Management Functions
export async function fetchPersons() {
  const response = await fetch(`${API_BASE_URL}/api/persons`);
  return handleResponse(response);
}

export async function createPerson(personData) {
  const response = await fetch(`${API_BASE_URL}/api/persons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(personData)
  });
  return handleResponse(response);
}

export async function updatePerson(personName, updates) {
  const response = await fetch(`${API_BASE_URL}/api/persons/${encodeURIComponent(personName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return handleResponse(response);
}

export async function deletePerson(personName) {
  const response = await fetch(`${API_BASE_URL}/api/persons/${encodeURIComponent(personName)}`, {
    method: 'DELETE'
  });
  return handleResponse(response);
}

// Token Management Functions
export async function setupPersonToken(personName, refreshToken) {
  const response = await fetch(`${API_BASE_URL}/api/auth/setup-person`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personName, refreshToken })
  });
  return handleResponse(response);
}

export async function refreshPersonToken(personName) {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token/${encodeURIComponent(personName)}`, {
    method: 'PUT'
  });
  return handleResponse(response);
}

export async function getTokenStatus(personName = null) {
  const url = personName 
    ? `${API_BASE_URL}/api/auth/token-status/${encodeURIComponent(personName)}`
    : `${API_BASE_URL}/api/auth/token-status`;
  const response = await fetch(url);
  return handleResponse(response);
}

export async function testConnection(personName) {
  const response = await fetch(`${API_BASE_URL}/api/auth/test-connection/${encodeURIComponent(personName)}`, {
    method: 'POST'
  });
  return handleResponse(response);
}

export async function deleteToken(personName) {
  const response = await fetch(`${API_BASE_URL}/api/auth/token/${encodeURIComponent(personName)}`, {
    method: 'DELETE'
  });
  return handleResponse(response);
}

// Settings & Health Functions
export async function fetchSettingsDashboard() {
  const response = await fetch(`${API_BASE_URL}/api/settings/dashboard`);
  return handleResponse(response);
}

export async function validateToken(refreshToken) {
  const response = await fetch(`${API_BASE_URL}/api/settings/validate-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  return handleResponse(response);
}

export async function getErrorLogs(filters = {}) {
  const url = new URL(`${API_BASE_URL}/api/settings/error-logs`);
  if (filters.personName) url.searchParams.set('personName', filters.personName);
  if (filters.days) url.searchParams.set('days', filters.days);
  const response = await fetch(url);
  return handleResponse(response);
}

export async function clearErrors(personName) {
  const response = await fetch(`${API_BASE_URL}/api/settings/clear-errors/${encodeURIComponent(personName)}`, {
    method: 'POST'
  });
  return handleResponse(response);
}

// Sync Functions
export async function syncPerson(personName, fullSync = false) {
  const response = await fetch(`${API_BASE_URL}/api/sync/person/${encodeURIComponent(personName)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullSync })
  });
  return handleResponse(response);
}

export async function syncAllPersons(fullSync = false) {
  const response = await fetch(`${API_BASE_URL}/api/sync/all-persons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullSync })
  });
  return handleResponse(response);
}

export async function getSyncStatus(personName = null) {
  const url = personName 
    ? `${API_BASE_URL}/api/sync/status/${encodeURIComponent(personName)}`
    : `${API_BASE_URL}/api/sync/status`;
  const response = await fetch(url);
  return handleResponse(response);
}

// Updated Portfolio Functions with Account Selection
export async function fetchPortfolioSummary(accountSelection = null) {
  const url = new URL(`${API_BASE_URL}/api/portfolio/summary`);
  
  if (accountSelection) {
    url.searchParams.set('viewMode', accountSelection.viewMode);
    if (accountSelection.personName) {
      url.searchParams.set('personName', accountSelection.personName);
    }
    if (accountSelection.accountId) {
      url.searchParams.set('accountId', accountSelection.accountId);
    }
    if (accountSelection.aggregate !== undefined) {
      url.searchParams.set('aggregate', accountSelection.aggregate);
    }
  }
  
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchPositions(accountSelection = null, aggregateMode = true) {
  const url = new URL(`${API_BASE_URL}/api/portfolio/positions`);
  
  if (accountSelection) {
    url.searchParams.set('viewMode', accountSelection.viewMode);
    if (accountSelection.personName) {
      url.searchParams.set('personName', accountSelection.personName);
    }
    if (accountSelection.accountId) {
      url.searchParams.set('accountId', accountSelection.accountId);
    }
    url.searchParams.set('aggregate', aggregateMode);
  }
  
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchDividendCalendar(accountSelection = null) {
  const url = new URL(`${API_BASE_URL}/api/portfolio/dividends/calendar`);
  
  if (accountSelection) {
    url.searchParams.set('viewMode', accountSelection.viewMode);
    if (accountSelection.personName) {
      url.searchParams.set('personName', accountSelection.personName);
    }
    if (accountSelection.accountId) {
      url.searchParams.set('accountId', accountSelection.accountId);
    }
  }
  
  const response = await fetch(url);
  return handleResponse(response);
}

// Legacy function kept for backward compatibility
export async function runPortfolioSync(fullSync = false, personName = null) {
  if (personName) {
    return syncPerson(personName, fullSync);
  } else {
    return syncAllPersons(fullSync);
  }
}

// Keep existing portfolio analysis function
export async function fetchPortfolioAnalysis(accountSelection = null) {
  try {
    const [summary, positions] = await Promise.all([
      fetchPortfolioSummary(accountSelection),
      fetchPositions(accountSelection)
    ]);

    const dividendStocks = positions.filter(p => 
      p.dividendData && 
      (p.dividendData.annualDividend > 0 || p.dividendData.totalReceived > 0)
    );

    const dividendMetrics = calculateDividendMetrics(dividendStocks);
    
    return {
      currentGainPercent: summary.unrealizedPnl && summary.totalInvestment > 0 
        ? (summary.unrealizedPnl / summary.totalInvestment) * 100 
        : 0,
      dividendsYieldPercent: dividendMetrics.averageYield,
      totalReturnsValue: summary.totalReturnValue || 0,
      overview: {
        totalInvestment: summary.totalInvestment || 0,
        currentValue: summary.currentValue || 0,
        totalReturnValue: summary.totalReturnValue || 0,
        returnPercent: summary.totalReturnPercent || 0,
        numberOfPositions: summary.numberOfPositions || 0,
        numberOfDividendStocks: dividendStocks.length,
        averagePositionSize: (summary.totalInvestment || 0) / Math.max(1, summary.numberOfPositions || 1),
        largestPosition: findLargestPosition(positions)
      },
      dividendAnalysis: {
        currentYieldPercent: dividendMetrics.currentYield,
        yieldOnCostPercent: dividendMetrics.yieldOnCost,
        dividendAdjustedAverageCost: dividendMetrics.dividendAdjustedCost,
        dividendAdjustedYieldPercent: dividendMetrics.dividendAdjustedYield,
        ttmYieldPercent: dividendMetrics.ttmYield,
        monthlyAverage: dividendMetrics.monthlyIncome,
        annualProjected: dividendMetrics.annualProjected,
        totalDividendsReceived: dividendMetrics.totalDividends
      },
      performanceBreakdown: {
        capitalGainsValue: summary.unrealizedPnl || 0,
        dividendIncomeValue: dividendMetrics.totalDividends,
        capitalGainsPercent: summary.unrealizedPnl && summary.totalInvestment > 0 
          ? (summary.unrealizedPnl / summary.totalInvestment) * 100 
          : 0,
        dividendReturnPercent: dividendMetrics.totalDividends && summary.totalInvestment > 0
          ? (dividendMetrics.totalDividends / summary.totalInvestment) * 100
          : 0,
        bestPerformingStock: findBestPerformer(positions),
        monthlyIncome: dividendMetrics.monthlyIncome,
        annualProjectedIncome: dividendMetrics.annualProjected
      },
      riskMetrics: calculateRiskMetrics(positions, summary),
      allocationAnalysis: calculateAllocation(positions, dividendStocks)
    };
  } catch (error) {
    console.error('Failed to fetch portfolio analysis:', error);
    return getDefaultAnalysis();
  }
}

// Keep existing helper functions
function calculateDividendMetrics(dividendStocks) {
  if (!dividendStocks || dividendStocks.length === 0) {
    return {
      averageYield: 0,
      currentYield: 0,
      yieldOnCost: 0,
      dividendAdjustedCost: 0,
      dividendAdjustedYield: 0,
      ttmYield: 0,
      monthlyIncome: 0,
      annualProjected: 0,
      totalDividends: 0
    };
  }

  let totalInvestment = 0;
  let totalValue = 0;
  let totalDividends = 0;
  let totalMonthlyIncome = 0;
  let totalAnnualProjected = 0;
  let weightedYieldOnCost = 0;
  let weightedCurrentYield = 0;

  dividendStocks.forEach(stock => {
    const investment = stock.totalCost || 0;
    const value = stock.currentMarketValue || 0;
    const dividendData = stock.dividendData || {};
    
    totalInvestment += investment;
    totalValue += value;
    totalDividends += dividendData.totalReceived || 0;
    totalMonthlyIncome += dividendData.monthlyDividend || 0;
    totalAnnualProjected += dividendData.annualDividend || 0;
    
    if (investment > 0) {
      weightedYieldOnCost += (dividendData.yieldOnCost || 0) * investment;
    }
    if (value > 0) {
      const monthlyDividend = dividendData.monthlyDividend || 0;
      const currentYield = ((monthlyDividend * 12) / value) * 100;
      weightedCurrentYield += currentYield * value;
    }
  });

  const avgYieldOnCost = totalInvestment > 0 ? weightedYieldOnCost / totalInvestment : 0;
  const avgCurrentYield = totalValue > 0 ? weightedCurrentYield / totalValue : 0;
  const dividendAdjustedCost = totalInvestment - totalDividends;
  const dividendAdjustedYield = dividendAdjustedCost > 0 
    ? (totalAnnualProjected / dividendAdjustedCost) * 100 
    : 0;

  return {
    averageYield: avgCurrentYield,
    currentYield: avgCurrentYield,
    yieldOnCost: avgYieldOnCost,
    dividendAdjustedCost,
    dividendAdjustedYield,
    ttmYield: avgCurrentYield,
    monthlyIncome: totalMonthlyIncome,
    annualProjected: totalAnnualProjected,
    totalDividends
  };
}

function findLargestPosition(positions) {
  if (!positions || positions.length === 0) {
    return { value: 0, symbol: 'N/A' };
  }
  
  const largest = positions.reduce((max, pos) => 
    (pos.currentMarketValue || 0) > (max.currentMarketValue || 0) ? pos : max
  );
  
  return {
    value: largest.currentMarketValue || 0,
    symbol: largest.symbol || 'N/A'
  };
}

function findBestPerformer(positions) {
  if (!positions || positions.length === 0) return null;
  
  const best = positions.reduce((max, pos) => {
    const returnPercent = pos.totalReturnPercent || 0;
    const maxReturn = max ? (max.totalReturnPercent || 0) : -Infinity;
    return returnPercent > maxReturn ? pos : max;
  }, null);
  
  return best ? {
    symbol: best.symbol,
    returnPercent: best.totalReturnPercent || 0
  } : null;
}

function calculateRiskMetrics(positions, summary) {
  if (!positions || positions.length === 0) {
    return {
      portfolioConcentration: 'N/A',
      largestPositionWeight: 'N/A',
      sectorConcentration: 'N/A',
      geographicExposure: 'N/A',
      dividendDependency: 'N/A',
      yieldStability: 'N/A'
    };
  }

  const totalValue = summary.currentValue || 0;
  const largest = Math.max(...positions.map(p => p.currentMarketValue || 0));
  const largestWeight = totalValue > 0 ? (largest / totalValue * 100).toFixed(2) + '%' : 'N/A';
  
  const dividendIncome = positions.reduce((sum, p) => 
    sum + (p.dividendData?.annualDividend || 0), 0
  );
  const dividendDependency = totalValue > 0 
    ? (dividendIncome / totalValue * 100).toFixed(2) + '%' 
    : 'N/A';

  return {
    portfolioConcentration: positions.length < 10 ? 'High' : positions.length < 20 ? 'Moderate' : 'Low',
    largestPositionWeight: largestWeight,
    sectorConcentration: 'Moderate',
    geographicExposure: 'Canada/US',
    dividendDependency: dividendDependency,
    yieldStability: 'Stable'
  };
}

function calculateAllocation(allPositions, dividendStocks) {
  const totalValue = allPositions.reduce((sum, p) => sum + (p.currentMarketValue || 0), 0);
  const dividendValue = dividendStocks.reduce((sum, p) => sum + (p.currentMarketValue || 0), 0);
  
  const highYieldStocks = dividendStocks.filter(p => 
    p.dividendData && p.dividendData.yieldOnCost > 4
  );
  const highYieldValue = highYieldStocks.reduce((sum, p) => sum + (p.currentMarketValue || 0), 0);
  
  return {
    assetWeights: {},
    sectorWeights: {},
    highYieldAssetsPercent: totalValue > 0 ? (highYieldValue / totalValue) * 100 : 0,
    growthAssetsPercent: totalValue > 0 ? ((totalValue - dividendValue) / totalValue) * 100 : 0,
    averageYieldPercent: calculateDividendMetrics(dividendStocks).averageYield
  };
}

function getDefaultAnalysis() {
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
      numberOfDividendStocks: 0,
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
      annualProjected: 0,
      totalDividendsReceived: 0
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

// Legacy function for access token
export async function fetchAccessToken() {
  const response = await fetch(`${API_BASE_URL}/api/auth/access-token`);
  const data = await response.json();
  
  if (data.success) {
    return {
      token: data.token,
      expiresAt: data.expiresAt,
      apiServer: data.apiServer || 'https://api01.iq.questrade.com/'
    };
  }
  throw new Error('Failed to fetch access token');
}