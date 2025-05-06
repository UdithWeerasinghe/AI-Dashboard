import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Grid, Box,
  Alert, CircularProgress, Tabs, Tab, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { fetchFinancialData } from '../services/api';
import RevenueChart from './RevenueChart';
import CostVsExpenses from './CostVsExpenses';
import GrossProfitMargin from './GrossProfitMargin';
import EPSChart from './EPSChart';
import NetAssetPerShare from './NetAssetPerShare';
import YearFilter from './YearFilter';

const FinancialDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('LKR');

  useEffect(() => {
    const loadData = async () => {
      try {
        const financialData = await fetchFinancialData();
        if (financialData && Array.isArray(financialData)) {
          setData(financialData);
          // Set all years as selected by default
          const years = Array.from(new Set(financialData.map(d => d.year))).sort();
          setSelectedYears(years);
        } else {
          setError('Invalid data format received from server');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleYearChange = (event) => {
    const {
      target: { value },
    } = event;
    setSelectedYears(typeof value === 'string' ? value.split(',') : value);
  };

  const handleCurrencyChange = (event, newCurrency) => {
    if (newCurrency !== null) setSelectedCurrency(newCurrency);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!data.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No financial data available</Alert>
      </Box>
    );
  }

  // Get all available years from data
  const availableYears = Array.from(new Set(data.map(d => d.year))).sort();
  // Filter data by selected years
  const filteredData = data.filter(d => selectedYears.includes(d.year));

  const formatCurrency = (value, currency = 'LKR') => {
    if (value === null || value === undefined) return 'N/A';
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    return formatter.format(value);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Financial Metrics Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Tabs value={selectedTab} onChange={handleTabChange} sx={{ mb: 0, mr: 2 }}>
              <Tab label="Revenue Trend" />
              <Tab label="Costs vs Expenses" />
              <Tab label="Gross Profit Margin" />
              <Tab label="EPS Analysis" />
              <Tab label="Net Asset Per Share" />
            </Tabs>
            <ToggleButtonGroup
              value={selectedCurrency}
              exclusive
              onChange={handleCurrencyChange}
              size="small"
              sx={{ ml: 'auto' }}
            >
              <ToggleButton value="LKR">LKR</ToggleButton>
              <ToggleButton value="USD">USD</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <YearFilter
            availableYears={availableYears}
            selectedYears={selectedYears}
            onChange={handleYearChange}
          />

          {selectedTab === 0 && (
            <RevenueChart data={filteredData} currency={selectedCurrency} />
          )}
          {selectedTab === 1 && (
            <CostVsExpenses data={filteredData} currency={selectedCurrency} />
          )}
          {selectedTab === 2 && (
            <GrossProfitMargin data={filteredData} currency={selectedCurrency} />
          )}
          {selectedTab === 3 && (
            <EPSChart data={filteredData} currency={selectedCurrency} />
          )}
          {selectedTab === 4 && (
            <NetAssetPerShare data={filteredData} currency={selectedCurrency} />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default FinancialDashboard; 