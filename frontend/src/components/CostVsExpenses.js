import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card, CardContent, Typography, Box, IconButton, Tooltip as MuiTooltip, Modal, Paper, Grid
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, Area
} from 'recharts';
import { Download as DownloadIcon } from '@mui/icons-material';
import ChartInsights from './ChartInsights';
import * as XLSX from 'xlsx';
import { useTheme } from '@mui/material/styles';
import ExportButton from './common/ExportButton';
import ChartCard from './common/ChartCard';
import ThemedTooltip from './common/ThemedTooltip';
import { formatLkrMn, formatUsdTh } from '../utils/format';

const COLORS = ['#1976d2', '#ff9800'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const lines = [
      { text: `Cost of Sales: ${formatLkrMn(d.cost_of_sales_lkr)} Mn` },
      { text: `Operating Expenses: ${formatLkrMn(d.operating_expenses_lkr)} Mn` },
    ];
    if (d.cost_forecast !== null) lines.push({ text: `Cost Forecast: ${formatLkrMn(d.cost_forecast)} Mn`, color: '#1976d2' });
    if (d.expense_forecast !== null) lines.push({ text: `Expense Forecast: ${formatLkrMn(d.expense_forecast)} Mn`, color: '#ff9800' });
    if (d.total_cost !== null) lines.push({ text: `Total Cost: ${formatLkrMn(d.total_cost)} Mn`, bold: true, mt: 1 });
    return <ThemedTooltip title={`Year: ${label}`} lines={lines} />;
  }
  return null;
};

/**
 * CostVsExpenses - Visualizes cost of sales vs operating expenses, forecasting, export, and drill-down.
 *
 * @param {Object} props
 * @param {Array<Object>} props.data - Array of yearly cost/expense data
 * @param {string} props.currency - Selected currency ('LKR' or 'USD')
 */
const CostVsExpenses = React.memo(({ data, currency }) => {
  const [chartType, setChartType] = useState('bar');
  const [costForecast, setCostForecast] = useState([]);
  const [expenseForecast, setExpenseForecast] = useState([]);
  const [drillYear, setDrillYear] = useState(null);
  const [quarterlyData, setQuarterlyData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const fetchForecasts = async () => {
      // Fetch cost of sales forecast
      const costResponse = await fetch(`/api/forecast?metric=cost_of_sales_${currency.toLowerCase()}&periods=3`);
      if (costResponse.ok) {
        const costData = await costResponse.json();
        setCostForecast(costData.slice(data.length));
      }

      // Fetch operating expenses forecast
      const expenseResponse = await fetch(`/api/forecast?metric=operating_expenses_${currency.toLowerCase()}&periods=3`);
      if (expenseResponse.ok) {
        const expenseData = await expenseResponse.json();
        setExpenseForecast(expenseData.slice(data.length));
      }
    };
    fetchForecasts();
  }, [data, currency]);

  const currencySuffix = useMemo(() => currency === 'LKR' ? '_lkr' : '_usd', [currency]);
  const currencyLabel = useMemo(() => currency === 'LKR' ? 'LKR Mn' : 'USD Mn', [currency]);

  const lastActualYear = data[data.length - 1]?.year;
  const costForecastData = useMemo(() => costForecast.filter(f => f.year > lastActualYear), [costForecast, lastActualYear]);
  const expenseForecastData = useMemo(() => expenseForecast.filter(f => f.year > lastActualYear), [expenseForecast, lastActualYear]);

  // Combine actual and forecast data
  const chartData = useMemo(() => {
    const combined = [
      ...data.map(item => ({
        ...item,
        cost_forecast: null,
        expense_forecast: null,
        total_cost: item[`cost_of_sales${currencySuffix}`] + item[`operating_expenses${currencySuffix}`]
      })),
      ...costForecastData.map(f => ({
        year: f.year,
        [`cost_of_sales${currencySuffix}`]: null,
        [`operating_expenses${currencySuffix}`]: null,
        cost_forecast: f.forecast < 0 ? 0 : f.forecast,
        expense_forecast: null,
        total_cost: null
      }))
    ];
    expenseForecastData.forEach(f => {
      const existingData = combined.find(d => d.year === f.year);
      if (existingData) {
        existingData.expense_forecast = f.forecast < 0 ? 0 : f.forecast;
        if (existingData.cost_forecast) {
          existingData.total_cost = existingData.cost_forecast + existingData.expense_forecast;
        }
      } else {
        combined.push({
          year: f.year,
          [`cost_of_sales${currencySuffix}`]: null,
          [`operating_expenses${currencySuffix}`]: null,
          cost_forecast: null,
          expense_forecast: f.forecast < 0 ? 0 : f.forecast,
          total_cost: null
        });
      }
    });
    return combined;
  }, [data, costForecastData, expenseForecastData, currencySuffix]);

  // Calculate max for Y-axis domain
  const maxValue = useMemo(() => Math.max(
    ...chartData.map(d => {
      const values = [
        d[`cost_of_sales${currencySuffix}`],
        d[`operating_expenses${currencySuffix}`],
        d.cost_forecast,
        d.expense_forecast,
        d.total_cost
      ].filter(v => v !== null && v !== undefined);
      return values.length ? Math.max(...values) : 0;
    }),
    0
  ), [chartData, currencySuffix]);

  const handleChartTypeChange = useCallback((event, newType) => {
    if (newType !== null) {
      setChartType(newType);
    }
  }, []);

  // Drill-down: fetch quarterly data for a year
  const handleYearClick = useCallback(async (year) => {
    setDrillYear(year);
    setModalOpen(true);
    try {
      const response = await fetch(`/api/quarterly?year=${year}&currency=${currency}`);
      if (response.ok) {
        const qData = await response.json();
        setQuarterlyData(qData);
      } else {
        setQuarterlyData([]);
      }
    } catch {
      setQuarterlyData([]);
    }
  }, [currency]);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setQuarterlyData([]);
    setDrillYear(null);
  }, []);

  // Export to Excel
  const handleExport = useCallback(() => {
    const exportData = chartData.map(d => ({
      Year: d.year,
      'Cost of Sales': d[`cost_of_sales${currencySuffix}`],
      'Operating Expenses': d[`operating_expenses${currencySuffix}`],
      'Cost Forecast': d.cost_forecast,
      'Expense Forecast': d.expense_forecast,
      'Total Cost': d.total_cost
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cost vs Expenses Data');
    XLSX.writeFile(wb, 'cost_vs_expenses_data.xlsx');
  }, [chartData, currencySuffix]);

  return (
    <ChartCard
      title="Cost of Sales vs Operating Expenses"
      onExport={handleExport}
      exportLabel="Export Cost vs Expenses Data"
    >
      <Box sx={{ height: { xs: 240, sm: 320, md: 420 } }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 60, right: 40, left: 120, bottom: 40 }}
              onClick={(e) => { if (e && e.activeLabel) handleYearClick(e.activeLabel); }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis
                tickFormatter={currency === 'LKR' ? formatLkrMn : formatUsdTh}
                label={{
                  value: `Amount (${currencyLabel})`,
                  position: 'top',
                  offset: 20,
                  style: { textAnchor: 'middle', fontWeight: 600 }
                }}
                allowDecimals={false}
                width={90}
                domain={[0, maxValue ? Math.ceil(maxValue * 1.15) : 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey={`cost_of_sales${currencySuffix}`} fill={theme.palette.primary.main} name="Cost of Sales" />
              <Bar dataKey={`operating_expenses${currencySuffix}`} fill={theme.palette.warning.main} name="Operating Expenses" />
              <Bar dataKey="cost_forecast" fill={theme.palette.primary.main} name="Cost Forecast" opacity={0.5} />
              <Bar dataKey="expense_forecast" fill={theme.palette.warning.main} name="Expense Forecast" opacity={0.5} />
            </BarChart>
          ) : chartType === 'stacked' ? (
            <BarChart data={chartData} margin={{ top: 60, right: 40, left: 120, bottom: 40 }}
              onClick={(e) => { if (e && e.activeLabel) handleYearClick(e.activeLabel); }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis
                tickFormatter={currency === 'LKR' ? formatLkrMn : formatUsdTh}
                label={{
                  value: `Amount (${currencyLabel})`,
                  position: 'top',
                  offset: 20,
                  style: { textAnchor: 'middle', fontWeight: 600 }
                }}
                allowDecimals={false}
                width={90}
                domain={[0, maxValue ? Math.ceil(maxValue * 1.15) : 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey={`cost_of_sales${currencySuffix}`} fill={theme.palette.primary.main} name="Cost of Sales" stackId="a" />
              <Bar dataKey={`operating_expenses${currencySuffix}`} fill={theme.palette.warning.main} name="Operating Expenses" stackId="a" />
              <Bar dataKey="cost_forecast" fill={theme.palette.primary.main} name="Cost Forecast" opacity={0.5} stackId="b" />
              <Bar dataKey="expense_forecast" fill={theme.palette.warning.main} name="Expense Forecast" opacity={0.5} stackId="b" />
            </BarChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 60, right: 40, left: 120, bottom: 40 }}
              onClick={(e) => { if (e && e.activeLabel) handleYearClick(e.activeLabel); }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis
                tickFormatter={currency === 'LKR' ? formatLkrMn : formatUsdTh}
                label={{
                  value: `Amount (${currencyLabel})`,
                  position: 'top',
                  offset: 20,
                  style: { textAnchor: 'middle', fontWeight: 600 }
                }}
                allowDecimals={false}
                width={90}
                domain={[0, maxValue ? Math.ceil(maxValue * 1.15) : 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey={`cost_of_sales${currencySuffix}`} stroke={theme.palette.primary.main} fill={theme.palette.primary.main} fillOpacity={0.15} name="Cost of Sales" />
              <Area type="monotone" dataKey={`operating_expenses${currencySuffix}`} stroke={theme.palette.warning.main} fill={theme.palette.warning.main} fillOpacity={0.15} name="Operating Expenses" />
              <Line type="monotone" dataKey="total_cost" stroke={theme.palette.success.main} name="Total Cost" strokeWidth={3} />
              <Line type="monotone" dataKey="cost_forecast" stroke={theme.palette.primary.main} name="Cost Forecast" strokeDasharray="6 3" strokeWidth={2} />
              <Line type="monotone" dataKey="expense_forecast" stroke={theme.palette.warning.main} name="Expense Forecast" strokeDasharray="6 3" strokeWidth={2} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </Box>
      <ChartInsights metric="cost_vs_expenses" />
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <ChartInsights metric="operating_expenses" />
        </Grid>
        <Grid item xs={12} md={4}>
          <ChartInsights metric="cost_of_sales" />
        </Grid>
        <Grid item xs={12} md={4}>
          <ChartInsights metric="net_profit" />
        </Grid>
      </Grid>
      {/* Drill-down Modal */}
      <Modal open={modalOpen} onClose={handleModalClose} aria-label="Quarterly Cost/Expenses Modal">
        <Paper sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', p: { xs: 2, sm: 4 }, minWidth: 280, maxWidth: 420, width: '90vw', outline: 'none' }}>
          <Typography variant="h6" gutterBottom>
            {drillYear ? `Quarterly Cost/Expenses for ${drillYear}` : 'Quarterly Cost/Expenses'}
          </Typography>
          {quarterlyData && quarterlyData.length > 0 ? (
            <Box>
              {quarterlyData.map((q, idx) => (
                <Typography key={idx} sx={{ fontSize: 15 }}>{`Q${q.quarter}: ${currency === 'LKR' ? formatLkrMn(q.value) : formatUsdTh(q.value)}`}</Typography>
              ))}
            </Box>
          ) : (
            <Typography>No quarterly data available for this year.</Typography>
          )}
        </Paper>
      </Modal>
    </ChartCard>
  );
});

export default CostVsExpenses;