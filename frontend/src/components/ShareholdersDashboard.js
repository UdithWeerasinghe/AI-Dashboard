import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  Box, Alert, CircularProgress, Select, MenuItem, FormControl,
  InputLabel, Grid
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const FISCAL_YEARS = [
  { label: '2019/20', value: '2019_20' },
  { label: '2020/21', value: '2020_21' },
  { label: '2021/22', value: '2021_22' },
  { label: '2022/23', value: '2022_23' },
  { label: '2023/24', value: '2023_24' },
];

const API_BASE = process.env.REACT_APP_API_BASE || '';

const ShareholdersDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(FISCAL_YEARS[FISCAL_YEARS.length - 1].value);

  useEffect(() => {
    const fetchShareholders = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/api/shareholders?year=${selectedYear}`);
        if (!response.ok) {
          throw new Error('Failed to fetch shareholders data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchShareholders();
  }, [selectedYear]);

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
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
        <Alert severity="info">No shareholders data available</Alert>
      </Box>
    );
  }

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#A28FD0', '#FF6666', '#FFB266', '#66B2FF', '#B2FF66', '#FF66B2', '#66FFB2', '#B266FF', '#FFD966', '#8FD0A2', '#D08FA2', '#A2D08F', '#D0A28F', '#8FA2D0', '#A28FD0'];

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="h6">
                Top 20 Shareholders
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Select Year</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={handleYearChange}
                  label="Select Year"
                >
                  {FISCAL_YEARS.map(year => (
                    <MenuItem key={year.value} value={year.value}>{year.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Shareholder Name</TableCell>
                      <TableCell align="right">Ownership %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.map((row, idx) => (
                      <TableRow key={row.shareholder_name}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{row.shareholder_name}</TableCell>
                        <TableCell align="right">{formatPercentage(row.ownership_percentage)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ height: { xs: 240, sm: 320, md: 520 } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="40%"
                      label={false}
                      outerRadius={130}
                      fill="#8884d8"
                      dataKey="ownership_percentage"
                      nameKey="shareholder_name"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                      wrapperStyle={{ marginTop: 30 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ShareholdersDashboard; 