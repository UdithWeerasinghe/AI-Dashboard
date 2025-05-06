import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, OutlinedInput, Checkbox, ListItemText } from '@mui/material';

const YearFilter = ({ availableYears, selectedYears, onChange }) => {
  return (
    <Box sx={{ minWidth: 180, mr: 2 }}>
      <FormControl fullWidth size="small">
        <InputLabel id="year-filter-label">Year</InputLabel>
        <Select
          labelId="year-filter-label"
          multiple
          value={selectedYears}
          onChange={onChange}
          input={<OutlinedInput label="Year" />}
          renderValue={(selected) => selected.join(', ')}
        >
          {availableYears.map((year) => (
            <MenuItem key={year} value={year}>
              <Checkbox checked={selectedYears.indexOf(year) > -1} />
              <ListItemText primary={year} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default YearFilter; 