# AI-Powered Financial Dashboard - John Keells Holdings PLC

A modern, interactive financial dashboard built with React (frontend) and Python (backend) to visualize key financial metrics for John Keells Holdings PLC.

## Features

### Financial Metrics Visualization

- **Revenue Trend (2019-2024)**

  - 5-year curve with YoY growth
  - Event annotations (COVID-19, Easter Sunday Attacks)
  - Forecasting capabilities
  - Export to Excel
  - Currency toggle (LKR/USD)
  - Year filter
  - Drill-down to quarterly data

- **Cost of Sales vs Operating Expenses**

  - Stacked/grouped bar visualization
  - Dual-axis line chart option
  - Forecasting for both metrics
  - Export functionality
  - Currency toggle
  - Year filter
  - Quarterly drill-down

- **Gross Profit Margin**

  - Line chart visualization
  - Event annotations
  - Forecasting
  - Export capability
  - Year filter

- **EPS Analysis**

  - Line/area chart
  - Tooltips with net profit/share count
  - Forecasting
  - Export functionality
  - Currency toggle
  - Year filter

- **Net Asset Per Share**
  - Line/area chart
  - Industry benchmark comparison
  - Forecasting
  - Export capability
  - Currency toggle
  - Year filter

### UI/UX Features

- Global year and currency filters
- Export to Excel functionality
- Responsive design
- Consistent axis and label formatting
- Drill-down modals for detailed analysis
- Interactive tooltips with detailed metrics
- Event annotations for significant business events

## Tech Stack

### Frontend

- React 18+
- Material-UI (MUI)
- Recharts for data visualization
- XLSX for Excel export
- Custom hooks for data fetching and state management

### Backend

- Python
- FastAPI/Flask
- Pandas for data processing
- Statistical forecasting models

## Setup Instructions

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Create a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   python app.py
   ```

## Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── ChartCard.js
│   │   │   │   ├── ExportButton.js
│   │   │   │   └── ThemedTooltip.js
│   │   │   ├── RevenueChart.js
│   │   │   ├── CostVsExpenses.js
│   │   │   ├── GrossProfitMargin.js
│   │   │   ├── EPSChart.js
│   │   │   └── NetAssetPerShare.js
│   │   ├── utils/
│   │   │   └── format.js
│   │   └── App.js
│   └── package.json
├── backend/
│   ├── app.py
│   ├── data/
│   └── requirements.txt
└── README.md
```

## API Endpoints

### Data Endpoints

- `GET /api/revenue` - Revenue data
- `GET /api/costs` - Cost of sales and operating expenses
- `GET /api/gross-profit` - Gross profit margin data
- `GET /api/eps` - Earnings per share data
- `GET /api/net-asset` - Net asset per share data

### Forecast Endpoints

- `GET /api/forecast?metric={metric}&periods={n}` - Get forecast data
  - Supported metrics: revenue, costs, gross_profit_margin, eps, net_asset_per_share
  - periods: number of future periods to forecast

### Quarterly Data

- `GET /api/quarterly?year={year}&currency={currency}` - Get quarterly breakdown

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is proprietary and confidential. All rights reserved.

## Contact

For any queries or support, please contact the development team.
