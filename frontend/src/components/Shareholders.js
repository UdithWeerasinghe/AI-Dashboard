import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Tabs,
  Tab,
  Box
} from '@mui/material';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const Shareholders = () => {
  const [view, setView] = useState('table');
  const [selectedYear, setSelectedYear] = useState('2023');

  // Sample data
  const shareholdersData = {
    2023: [
      { name: 'John Keells Holdings PLC', ownership: 45.2 },
      { name: 'EPF', ownership: 12.5 },
      { name: 'ETF', ownership: 8.3 },
      { name: 'Other Institutions', ownership: 15.7 },
      { name: 'Public', ownership: 18.3 },
    ],
    2022: [
      { name: 'John Keells Holdings PLC', ownership: 44.8 },
      { name: 'EPF', ownership: 12.8 },
      { name: 'ETF', ownership: 8.5 },
      { name: 'Other Institutions', ownership: 16.2 },
      { name: 'Public', ownership: 17.7 },
    ],
  };

  const pieData = {
    labels: shareholdersData[selectedYear].map(sh => sh.name),
    datasets: [
      {
        data: shareholdersData[selectedYear].map(sh => sh.ownership),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.raw}%`;
          }
        }
      }
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Top Shareholders</Typography>
        <Tabs value={selectedYear} onChange={(e, newValue) => setSelectedYear(newValue)}>
          <Tab label="2023" value="2023" />
          <Tab label="2022" value="2022" />
        </Tabs>
      </Box>

      <Tabs value={view} onChange={(e, newValue) => setView(newValue)} sx={{ mb: 2 }}>
        <Tab label="Table View" value="table" />
        <Tab label="Pie Chart" value="pie" />
      </Tabs>

      {view === 'table' ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Shareholder</TableCell>
                <TableCell align="right">Ownership (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shareholdersData[selectedYear].map((shareholder, index) => (
                <TableRow key={index}>
                  <TableCell>{shareholder.name}</TableCell>
                  <TableCell align="right">{shareholder.ownership.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Pie data={pieData} options={pieOptions} />
        </Box>
      )}
    </Paper>
  );
};

export default Shareholders; 