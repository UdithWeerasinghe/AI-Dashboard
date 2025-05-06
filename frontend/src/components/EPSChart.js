import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, Typography, Box, IconButton } from '@mui/material';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Area
} from 'recharts';
import ChartInsights from './ChartInsights';
import { Download as DownloadIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useTheme } from '@mui/material/styles';
import ExportButton from './common/ExportButton';
import ChartCard from './common/ChartCard';
import ThemedTooltip from './common/ThemedTooltip';
import { formatLkrMn, formatUsdTh } from '../utils/format';

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const eps = currency === 'LKR' ? d.eps_lkr : d.eps_usd;
    const netProfit = currency === 'LKR' ? d.net_profit_lkr : d.net_profit_usd;
    const forecast = d.forecast;
    const lines = [
      { text: `EPS: ${currency === 'LKR' ? formatLkrMn(eps) : formatUsdTh(eps)}` },
      { text: `Net Profit: ${netProfit ? netProfit.toLocaleString('en-US', { maximumFractionDigits: 0 }) : 'N/A'}` },
      { text: `Share Count: ${d.share_count ? d.share_count.toLocaleString('en-US', { maximumFractionDigits: 0 }) : 'N/A'}` },
    ];
    if (forecast !== null) lines.push({ text: `Forecast: ${currency === 'LKR' ? formatLkrMn(forecast) : formatUsdTh(forecast)}`, color: '#ff9800' });
    return <ThemedTooltip title={`Year: ${label}`} lines={lines} />;
  }
  return null;
};

/**
 * EPSChart - Visualizes earnings per share (EPS) trend, forecasting, export, and tooltips with net profit/share count.
 *
 * @param {Object} props
 * @param {Array<Object>} props.data - Array of yearly EPS data
 * @param {string} props.currency - Selected currency ('LKR' or 'USD')
 */
const EPSChart = React.memo(({ data, currency }) => {
  const [forecast, setForecast] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    const responseKey = currency === 'LKR' ? 'eps_lkr' : 'eps_usd';
    const fetchForecast = async () => {
      const response = await fetch(`/api/forecast?metric=${responseKey}&periods=3`);
      if (response.ok) {
        const forecastData = await response.json();
        setForecast(forecastData.slice(data.length));
      }
    };
    fetchForecast();
  }, [data, currency]);

  const epsKey = useMemo(() => currency === 'LKR' ? 'eps_lkr' : 'eps_usd', [currency]);
  const netProfitKey = useMemo(() => currency === 'LKR' ? 'net_profit_lkr' : 'net_profit_usd', [currency]);
  const forecastKey = 'forecast';
  const formatYAxis = useMemo(() => currency === 'LKR' ? formatLkrMn : formatUsdTh, [currency]);
  const yAxisLabel = useMemo(() => currency === 'LKR' ? 'EPS (LKR Mn)' : 'EPS (USD K)', [currency]);

  const lastActualYear = data[data.length - 1]?.year;
  const forecastData = useMemo(() => 
    forecast.filter(f => f.year > lastActualYear).map(f => ({
      year: f.year,
      [epsKey]: null,
      forecast: f.forecast < 0 ? 0 : f.forecast
    })), 
    [forecast, lastActualYear, epsKey]
  );

  const chartData = useMemo(() => [
    ...data.map(item => ({
      ...item,
      forecast: item.year === lastActualYear ? item[epsKey] : null
    })),
    ...forecastData
  ], [data, forecastData, epsKey, lastActualYear]);

  // Calculate max for Y-axis domain
  const maxValue = useMemo(() => Math.max(
    ...chartData.map(d =>
      d[epsKey] !== null && d[epsKey] !== undefined
        ? d[epsKey]
        : d.forecast || 0
    ),
    0
  ), [chartData, epsKey]);

  // Export to Excel
  const handleExport = useCallback(() => {
    const exportData = chartData.map(d => ({
      Year: d.year,
      EPS: d[epsKey],
      'Net Profit': d[netProfitKey],
      'Share Count': d.share_count,
      Forecast: d.forecast
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'EPS Data');
    XLSX.writeFile(wb, 'eps_data.xlsx');
  }, [chartData, epsKey, netProfitKey]);

  return (
    <ChartCard
      title="Earnings Per Share (EPS) (5-Year Trend)"
      onExport={handleExport}
      exportLabel="Export EPS Data"
    >
      <Box sx={{ height: { xs: 240, sm: 320, md: 420 } }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 60, right: 30, left: 120, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis
              tickFormatter={formatYAxis}
              width={80}
              allowDecimals={false}
              domain={[0, maxValue ? Math.ceil(maxValue * 1.15) : 'auto']}
              label={{
                value: yAxisLabel,
                position: 'top',
                offset: 20,
                style: { textAnchor: 'middle', fontWeight: 600 }
              }}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Legend />
            <Area
              type="monotone"
              dataKey={epsKey}
              stroke={theme.palette.primary.main}
              fill={theme.palette.primary.main}
              fillOpacity={0.15}
              name="EPS"
            />
            <Line
              type="monotone"
              dataKey={epsKey}
              name="EPS"
              stroke={theme.palette.primary.main}
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
            />
            {/* Forecast Data */}
            <Line
              type="monotone"
              dataKey={forecastKey}
              name="Forecast"
              stroke={theme.palette.warning.main}
              strokeDasharray="6 3"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <ChartInsights metric="eps" />
    </ChartCard>
  );
});

export default EPSChart;