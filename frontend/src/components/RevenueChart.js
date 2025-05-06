import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, Typography, Box, IconButton, Tooltip as MuiTooltip, Modal, Paper } from '@mui/material';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';
import { Download as DownloadIcon } from '@mui/icons-material';
import ChartInsights from './ChartInsights';
import * as XLSX from 'xlsx';
import { useTheme } from '@mui/material/styles';
import ExportButton from './common/ExportButton';
import ChartCard from './common/ChartCard';
import ThemedTooltip from './common/ThemedTooltip';
import { formatLkrMn, formatUsdTh } from '../utils/format';

const calculateYoYGrowth = (current, previous) => {
  if (!current || !previous) return null;
  return ((current - previous) / previous) * 100;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const currency = d.total_revenue_usd !== undefined ? 'USD' : 'LKR';
    const formatValue = currency === 'LKR' ? formatLkrMn : formatUsdTh;
    const value = currency === 'LKR' ? d.total_revenue_lkr : d.total_revenue_usd;
    const forecast = currency === 'LKR' ? d.revenue_forecast_lkr : d.revenue_forecast_usd;
    const yoyGrowth = d.yoy_growth;
    const lines = [
      { text: `Revenue: ${formatValue(value)}` },
    ];
    if (yoyGrowth !== null) lines.push({ text: `YoY Growth: ${yoyGrowth.toFixed(2)}%`, color: yoyGrowth >= 0 ? '#43a047' : '#e53935' });
    if (forecast !== null) lines.push({ text: `Forecast: ${formatValue(forecast)}`, color: '#ff9800' });
    if (d.event) lines.push({ text: d.event.label, color: d.event.color, mt: 1 });
    return <ThemedTooltip title={`Year: ${label}`} lines={lines} />;
  }
  return null;
};

/**
 * RevenueChart - Visualizes revenue trend, YoY growth, event annotations, forecasting, export, and drill-down.
 *
 * @param {Object} props
 * @param {Array<Object>} props.data - Array of yearly revenue data
 * @param {string} props.currency - Selected currency ('LKR' or 'USD')
 */
const RevenueChart = React.memo(({ data, currency }) => {
  const [forecast, setForecast] = useState([]);
  const [drillYear, setDrillYear] = useState(null);
  const [quarterlyData, setQuarterlyData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const fetchForecast = async () => {
      const response = await fetch(`/api/forecast?metric=total_revenue_${currency.toLowerCase()}&periods=3`);
      if (response.ok) {
        const forecastData = await response.json();
        setForecast(forecastData.slice(data.length));
      }
    };
    fetchForecast();
  }, [data, currency]);

  const dataKey = useMemo(() => currency === 'LKR' ? 'total_revenue_lkr' : 'total_revenue_usd', [currency]);
  const forecastKey = useMemo(() => currency === 'LKR' ? 'revenue_forecast_lkr' : 'revenue_forecast_usd', [currency]);
  const formatYAxis = useMemo(() => currency === 'LKR' ? formatLkrMn : formatUsdTh, [currency]);
  const yAxisLabel = useMemo(() => currency === 'LKR' ? 'LKR Mn' : "USD '000", [currency]);

  // Calculate YoY growth and add events
  const processedData = useMemo(() => data.map((item, index) => {
    const previousYear = index > 0 ? data[index - 1][dataKey] : null;
    const yoyGrowth = calculateYoYGrowth(item[dataKey], previousYear);
    let event = null;
    if (item.year === 2019) {
      event = {
        label: 'Significant Growth',
        color: '#43a047',
        description: 'Strong performance across all sectors'
      };
    } else if (item.year === 2020) {
      event = {
        label: 'COVID-19 Impact',
        color: '#e53935',
        description: 'Significant decline due to pandemic'
      };
    }
    return {
      ...item,
      yoy_growth: yoyGrowth,
      event
    };
  }), [data, dataKey]);

  const lastActualYear = data[data.length - 1]?.year;
  const forecastData = useMemo(() => 
    forecast.filter(f => f.year > lastActualYear).map(f => ({
      year: f.year,
      [dataKey]: null,
      [forecastKey]: f.forecast < 0 ? 0 : f.forecast,
      yoy_growth: null,
      event: null
    })), 
    [forecast, lastActualYear, dataKey, forecastKey]
  );

  const chartData = useMemo(() => [
    ...processedData.map(item => ({
      ...item,
      [forecastKey]: item.year === lastActualYear ? item[dataKey] : null
    })),
    ...forecastData
  ], [processedData, forecastData, dataKey, forecastKey, lastActualYear]);

  // Calculate max for Y-axis domain
  const maxValue = useMemo(() => Math.max(
    ...chartData.map(d => {
      const values = [d[dataKey], d[forecastKey]].filter(v => v !== null && v !== undefined);
      return values.length ? Math.max(...values) : 0;
    }),
    0
  ), [chartData, dataKey, forecastKey]);

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
      Revenue: d[dataKey],
      'YoY Growth': d.yoy_growth ? `${d.yoy_growth.toFixed(2)}%` : 'N/A',
      Forecast: d[forecastKey]
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Revenue Data');
    XLSX.writeFile(wb, 'revenue_data.xlsx');
  }, [chartData, dataKey, forecastKey]);

  return (
    <ChartCard
      title="Revenue Trend (5-Year Analysis)"
      onExport={handleExport}
      exportLabel="Export Revenue Data"
    >
      <Box sx={{ height: { xs: 240, sm: 320, md: 420 } }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 60, right: 40, left: 80, bottom: 40 }}
            onClick={(e) => {
              if (e && e.activeLabel) handleYearClick(e.activeLabel);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis
              tickFormatter={formatYAxis}
              label={{
                value: `Amount (${yAxisLabel})`,
                position: 'top',
                offset: 20,
                style: { textAnchor: 'middle', fontWeight: 600 }
              }}
              allowDecimals={false}
              width={90}
              domain={[0, maxValue ? Math.ceil(maxValue * 1.15) : 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={theme.palette.primary.main}
              fill={theme.palette.primary.main}
              fillOpacity={0.15}
              name="Revenue"
            />
            <Area
              type="monotone"
              dataKey={forecastKey}
              stroke={theme.palette.warning.main}
              fill={theme.palette.warning.main}
              fillOpacity={0.15}
              name="Forecast"
            />
            {/* Event Annotations */}
            <ReferenceLine
              x={2019}
              stroke={theme.palette.success.main}
              label={{
                value: "2019 Growth",
                position: "top",
                fill: theme.palette.success.main,
                fontWeight: "bold",
                offset: 40
              }}
            />
            <ReferenceLine
              x={2020}
              stroke={theme.palette.error.main}
              label={{
                value: "COVID-19 Impact",
                position: "top",
                fill: theme.palette.error.main,
                fontWeight: "bold",
                offset: 40
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
      <ChartInsights metric="revenue" />
      {/* Drill-down Modal */}
      <Modal open={modalOpen} onClose={handleModalClose} aria-label="Quarterly Revenue Modal">
        <Paper sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', p: { xs: 2, sm: 4 }, minWidth: 280, maxWidth: 420, width: '90vw', outline: 'none' }}>
          <Typography variant="h6" gutterBottom>
            {drillYear ? `Quarterly Revenue for ${drillYear}` : 'Quarterly Revenue'}
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

export default RevenueChart;