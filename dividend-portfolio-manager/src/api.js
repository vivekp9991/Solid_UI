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

export async function fetchAccessToken() {
  const response = await fetch(`${API_BASE_URL}/api/auth/access-token`);
  const data = await response.json();
  
  if (data.success) {
    return {
      token: data.token,
      expiresAt: data.expiresAt,
      // Parse API server from the token response if available
      apiServer: data.apiServer || 'https://api01.iq.questrade.com/'
    };
  }
  throw new Error('Failed to fetch access token');
}

export async function fetchPortfolioAnalysis(accountId) {
  try {
    // Fetch both summary and positions to calculate analysis
    const [summary, positions] = await Promise.all([
      fetchPortfolioSummary(accountId),
      fetchPositions(accountId)
    ]);

    // Filter dividend-paying stocks
    const dividendStocks = positions.filter(p => 
      p.dividendData && 
      (p.dividendData.annualDividend > 0 || p.dividendData.totalReceived > 0)
    );

    // Calculate metrics only for dividend-paying stocks
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
    // Return default values if API fails
    return getDefaultAnalysis();
  }
}

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
    
    // Weight yields by position size
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
    ttmYield: avgCurrentYield, // Simplified - should calculate from actual TTM dividends
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
    sectorConcentration: 'Moderate', // Would need sector data
    geographicExposure: 'Canada/US', // Would need exchange data
    dividendDependency: dividendDependency,
    yieldStability: 'Stable' // Would need historical data
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

export async function runPortfolioSync(fullSync = false) {
  const response = await fetch(`${API_BASE_URL}/api/portfolio/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullSync })
  });
  return handleResponse(response);
}