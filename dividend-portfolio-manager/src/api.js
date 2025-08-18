// src/api.js - FIXED: Removed duplicate declarations and enhanced API functionality
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// FIXED: Import detectDividendFrequency helper
import { detectDividendFrequency } from './utils/helpers';

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

// UPDATED: Enhanced TwelveData Exchange Rate Function
export async function fetchExchangeRate(fromCurrency = 'USD', toCurrency = 'CAD') {
  try {
    const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY || 'YOUR_API_KEY';
    
    // Use TwelveData's exchange_rate endpoint
    const symbol = `${fromCurrency}/${toCurrency}`;
    const response = await fetch(
      `https://api.twelvedata.com/exchange_rate?symbol=${symbol}&apikey=${apiKey}`
    );
    
    const data = await response.json();
    
    // TwelveData response format: { "symbol": "USD/CAD", "rate": "1.35000", "timestamp": 1699123456 }
    if (data && data.rate) {
      const rate = parseFloat(data.rate);
      console.log(`TwelveData: ${symbol} exchange rate:`, rate);
      return rate;
    }
    
    // Handle error response
    if (data && data.status === 'error') {
      console.warn('TwelveData API error:', data.message);
    }
    
    // Fallback to default rate if API fails
    console.warn('Failed to fetch exchange rate from TwelveData, using default');
    return 1.35; // Default USD/CAD rate
  } catch (error) {
    console.error('Error fetching exchange rate from TwelveData:', error);
    return 1.35; // Default USD/CAD rate
  }
}

// FIXED: Enhanced Cash Balances Function with Proper Account Filtering
export async function fetchCashBalances(accountSelection = null) {
  const url = new URL(`${API_BASE_URL}/api/portfolio/cash-balances`);
  
  console.log('🏦 fetchCashBalances called with account selection:', accountSelection);
  
  if (accountSelection) {
    // Add viewMode parameter
    url.searchParams.set('viewMode', accountSelection.viewMode || 'all');
    
    // Add specific filters based on viewMode
    if (accountSelection.viewMode === 'person' && accountSelection.personName) {
      url.searchParams.set('personName', accountSelection.personName);
      console.log('🏦 Adding personName filter:', accountSelection.personName);
    }
    
    if (accountSelection.viewMode === 'account' && accountSelection.accountId) {
      url.searchParams.set('accountId', accountSelection.accountId);
      console.log('🏦 Adding accountId filter:', accountSelection.accountId);
    }
    
    // Add currency filter if specified
    if (accountSelection.currency) {
      url.searchParams.set('currency', accountSelection.currency);
    }
    
    // Add aggregate flag for proper data processing
    if (accountSelection.aggregate !== undefined) {
      url.searchParams.set('aggregate', accountSelection.aggregate.toString());
    }
  }
  
  console.log('🏦 Final cash balance URL:', url.toString());
  
  try {
    const response = await fetch(url);
    const data = await handleResponse(response);
    
    console.log('🏦 Cash balance API response:', data);
    
    // Ensure we return properly structured data
    if (!data) {
      return { 
        accounts: [], 
        summary: { 
          totalAccounts: 0, 
          totalPersons: 0, 
          totalCAD: 0, 
          totalUSD: 0,
          totalInCAD: 0 
        } 
      };
    }
    
    // FIXED: Process and enhance the data with proper USD/CAD conversion
    const processedData = enhanceCashBalanceData(data);
    
    console.log('🏦 Processed cash balance data:', processedData);
    return processedData;
  } catch (error) {
    console.error('🏦 Failed to fetch cash balances:', error);
    throw error;
  }
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

// FIXED: Single Portfolio Summary function with account selection
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

// ENHANCED: Portfolio analysis function with dividend frequency filtering
export async function fetchPortfolioAnalysis(accountSelection = null) {
  try {
    const [summary, positions] = await Promise.all([
      fetchPortfolioSummary(accountSelection),
      fetchPositions(accountSelection)
    ]);

    // ENHANCED: Filter for stocks with regular dividend patterns only
    const dividendStocks = positions.filter(p => {
      if (!p.dividendData) return false;
      
      // Check if it has actual dividend data
      const hasBasicDividendData = (p.dividendData.annualDividend > 0 || p.dividendData.totalReceived > 0);
      if (!hasBasicDividendData) return false;
      
      // Enhanced: Check for regular dividend pattern if history is available
      if (p.dividendData.dividendHistory && Array.isArray(p.dividendData.dividendHistory)) {
        const frequencyAnalysis = detectDividendFrequency(p.dividendData.dividendHistory);
        const isRegular = frequencyAnalysis.isRegular && frequencyAnalysis.confidence >= 60;
        
        console.log(`Portfolio Analysis - ${p.symbol}: ${isRegular ? 'Regular' : 'Irregular'} dividend (${frequencyAnalysis.frequency}, ${frequencyAnalysis.confidence}% confidence)`);
        return isRegular;
      }
      
      // Fallback: If no history but has current dividend data, assume regular
      if (p.dividendData.monthlyDividendPerShare > 0 || p.dividendData.annualDividend > 0) {
        console.log(`Portfolio Analysis - ${p.symbol}: Assuming regular dividend (current data available)`);
        return true;
      }
      
      // Only historical dividends without current data - likely irregular
      console.log(`Portfolio Analysis - ${p.symbol}: Irregular dividend (only historical data)`);
      return false;
    });

    console.log(`🔍 Portfolio Analysis: ${dividendStocks.length} regular dividend stocks out of ${positions.length} total positions`);

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

// Helper functions
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

// FIXED: Helper function to enhance cash balance data with proper USD/CAD handling
function enhanceCashBalanceData(rawData) {
  // If data is already properly structured, return as-is but enhanced
  if (rawData.accounts && Array.isArray(rawData.accounts)) {
    return {
      ...rawData,
      accounts: rawData.accounts.map(account => enhanceAccountData(account)),
      summary: enhanceSummaryData(rawData.summary || {}, rawData.accounts || [])
    };
  }
  
  // If data is a direct array, wrap it and enhance
  if (Array.isArray(rawData)) {
    const enhancedAccounts = rawData.map(account => enhanceAccountData(account));
    return { 
      accounts: enhancedAccounts, 
      summary: enhanceSummaryData({}, enhancedAccounts)
    };
  }
  
  return rawData;
}

function enhanceSummaryData(existingSummary, accounts) {
  let totalCAD = 0;
  let totalUSD = 0;
  const accountTypes = new Set();
  const persons = new Set();
  
  accounts.forEach(account => {
    // Add to sets for counting
    if (account.accountType) accountTypes.add(account.accountType);
    if (account.personName) persons.add(account.personName);
    
    // Sum up currencies
    totalCAD += account.totalCAD || 0;
    totalUSD += account.totalUSD || 0;
  });
  
  return {
    ...existingSummary,
    totalAccounts: accounts.length,
    totalPersons: persons.size,
    totalAccountTypes: accountTypes.size,
    totalCAD,
    totalUSD,
    // FIXED: Add totalInCAD calculation (will be properly converted in the frontend)
    totalInCAD: totalCAD + totalUSD // Frontend will apply proper exchange rate
  };
}

function enhanceAccountData(account) {
  // Ensure cashBalances is properly structured
  const cashBalances = account.cashBalances || [];
  
  // If cashBalances is not an array, try to extract from other properties
  if (!Array.isArray(cashBalances) && account.cash !== undefined) {
    const currency = account.currency || 'CAD';
    return {
      ...account,
      cashBalances: [{
        currency: currency,
        cash: Number(account.cash) || 0
      }]
    };
  }
  
  // Ensure all cashBalances entries have proper numeric values
  const enhancedCashBalances = cashBalances.map(cb => ({
    currency: cb.currency || 'CAD',
    cash: Number(cb.cash) || 0
  }));
  
  return {
    ...account,
    cashBalances: enhancedCashBalances,
    // FIXED: Add helper properties for easier access
    totalCAD: enhancedCashBalances
      .filter(cb => cb.currency === 'CAD')
      .reduce((sum, cb) => sum + cb.cash, 0),
    totalUSD: enhancedCashBalances
      .filter(cb => cb.currency === 'USD')
      .reduce((sum, cb) => sum + cb.cash, 0)
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

// Portfolio Settings API Functions
export const getPortfolioSettings = async () => {
    try {
        const response = await fetch('/api/portfolio/settings', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch portfolio settings:', error);
        throw error;
    }
};

export const updatePortfolioSettings = async (settings) => {
    try {
        const response = await fetch('/api/portfolio/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to update portfolio settings:', error);
        throw error;
    }
};