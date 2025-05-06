import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Line, Legend } from 'recharts';
import ChartCard from './common/ChartCard';
import ChartInsights from './ChartInsights';

const RightIssues = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/right-issues');
        if (!response.ok) throw new Error('Failed to fetch right issues data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Aggregate by year: count and average price
  const chartData = useMemo(() => {
    const byYear = {};
    data.forEach(row => {
      if (!row.year) return;
      if (!byYear[row.year]) byYear[row.year] = { year: row.year, count: 0, totalPrice: 0, priceCount: 0 };
      if (row.issue_price) {
        byYear[row.year].count += 1;
        byYear[row.year].totalPrice += parseFloat(row.issue_price);
        byYear[row.year].priceCount += 1;
      }
    });
    return Object.values(byYear).map(d => ({
      year: d.year,
      count: d.count,
      avg_price: d.priceCount ? d.totalPrice / d.priceCount : null
    })).sort((a, b) => a.year - b.year);
  }, [data]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <Box sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <div><b>Year:</b> {label}</div>
          <div><b>Right Issues:</b> {d.count}</div>
          <div><b>Avg. Price:</b> {d.avg_price ? d.avg_price.toLocaleString('en-US', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }) : 'N/A'}</div>
        </Box>
      );
    }
    return null;
  };

  if (loading) return <Box sx={{ p: 3 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}>{error}</Box>;

  return (
    <ChartCard title="Right Issues (History & Trends)">
      <Box sx={{ height: { xs: 240, sm: 320, md: 420 } }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 60, right: 40, left: 80, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis yAxisId="left" label={{ value: 'Right Issues (Count)', angle: -90, position: 'insideLeft', offset: 10 }} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Avg. Price (LKR)', angle: 90, position: 'insideRight', offset: 10 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar yAxisId="left" dataKey="count" fill="#c62828" name="Right Issues (Count)" />
            <Line yAxisId="right" type="monotone" dataKey="avg_price" stroke="#1976d2" strokeWidth={3} name="Avg. Price (LKR)" dot={{ r: 5 }} activeDot={{ r: 8 }} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
      <ChartInsights metric="right_issues" />
    </ChartCard>
  );
};

export default RightIssues; 