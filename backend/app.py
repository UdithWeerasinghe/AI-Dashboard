from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import pandas as pd
import os
from pathlib import Path
import logging
from prophet import Prophet

def forecast_metric(df, metric, periods=3):
    # df: DataFrame with columns ['year', metric]
    df_prophet = df[['year', metric]].rename(columns={'year': 'ds', metric: 'y'})
    df_prophet['ds'] = pd.to_datetime(df_prophet['ds'], format='%Y')
    model = Prophet()
    model.fit(df_prophet)
    future = model.make_future_dataframe(periods=periods, freq='Y')
    forecast = model.predict(future)
    # Return only the forecasted values for the new periods
    return forecast[['ds', 'yhat']].tail(periods)

def apply_scale(value, scale):
    if pd.isna(value) or pd.isna(scale):
        return None
    value = float(value)
    if scale == 'K':
        return value * 1000
    elif scale == 'Mn':
        return value * 1000000
    return value

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Get the absolute path to the data_cleaned directory
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / 'data_cleaned'

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.route('/')
def index():
    return {
        'message': 'John Keells Holdings PLC Financial Dashboard API',
        'endpoints': {
            '/api/financials': 'Get financial metrics data',
            '/api/shareholders': 'Get shareholders data',
            '/api/right-issues': 'Get right issues data'
        }
    }

@app.route('/api/financials', methods=['GET'])
def get_financials():
    try:
        # Read the financial metrics CSV file
        file_path = DATA_DIR / 'financial_metrics.csv'
        if not file_path.exists():
            logger.error(f"Financial data file not found: {file_path}")
            return jsonify({'error': 'Financial data not found'}), 404

        df = pd.read_csv(file_path)
        
        # Process the data
        processed_data = []
        for _, row in df.iterrows():
            data_point = {'year': int(row['year'])}
            
            # Process each metric and its scale
            metrics = [
                'total_revenue_lkr', 'total_revenue_usd',
                'eps_lkr', 'eps_usd',
                'share_count',
                'net_profit_lkr', 'net_profit_usd',
                'operating_expenses_lkr', 'operating_expenses_usd',
                'net_asset_per_share_lkr', 'net_asset_per_share_usd',
                'gross_profit_margin',
                'cost_of_sales_lkr', 'cost_of_sales_usd'
            ]
            
            for metric in metrics:
                value = row.get(metric)
                scale = row.get(f'{metric}_scale')
                if pd.notna(value) and pd.notna(scale):
                    data_point[metric] = apply_scale(value, scale)
                else:
                    data_point[metric] = None
            
            processed_data.append(data_point)
        
        return jsonify(processed_data)
    except Exception as e:
        logger.error(f"Error processing financial data: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/shareholders', methods=['GET'])
def get_shareholders():
    year = request.args.get('year')
    if not year:
        return jsonify({'error': 'Year parameter is required, e.g., /api/shareholders?year=2019_20'}), 400
    filename = f'shareholders_{year}.csv'
    file_path = DATA_DIR / filename
    if not file_path.exists():
        logger.error(f"Shareholders data file not found: {file_path}")
        return jsonify({'error': f'Shareholders data for year {year} not found'}), 404
    df = pd.read_csv(file_path)
    data = df.to_dict('records')
    return jsonify(data)

@app.route('/api/right-issues', methods=['GET'])
def get_right_issues():
    try:
        # Read the right issues CSV file
        file_path = DATA_DIR / 'right_issues.csv'
        if not file_path.exists():
            logger.error(f"Right issues data file not found: {file_path}")
            return jsonify({'error': 'Right issues data not found'}), 404

        df = pd.read_csv(file_path)
        # Convert NaN to None for all fields
        df = df.where(pd.notna(df), None)
        data = df.to_dict('records')
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error processing right issues data: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/insights', methods=['GET'])
def get_insights():
    try:
        file_path = DATA_DIR / 'financial_metrics.csv'
        if not file_path.exists():
            return jsonify({'error': 'Financial data not found'}), 404
        df = pd.read_csv(file_path)
        insights = {
            "revenue": [],
            "gross_profit_margin": [],
            "eps": [],
            "operating_expenses": [],
            "cost_of_sales": [],
            "net_profit": [],
            "net_asset_per_share": [],
            "right_issues": [],
        }

        # Helper for YoY percent
        def yoy_pct(curr, prev):
            if prev and prev != 0:
                return ((curr - prev) / prev) * 100
            return None

        # Event annotations
        event_map = {
            2019: "Easter Sunday Attacks Impact",
            2020: "COVID-19 Impact",
            2022: "Tax Changes"
        }

        for i in range(1, len(df)):
            prev = df.iloc[i-1]
            curr = df.iloc[i]
            year = curr['year']
            prev_year = prev['year']
            event = event_map.get(year, None)

            # Revenue
            prev_revenue = apply_scale(prev['total_revenue_lkr'], prev['total_revenue_lkr_scale'])
            curr_revenue = apply_scale(curr['total_revenue_lkr'], curr['total_revenue_lkr_scale'])
            rev_yoy = yoy_pct(curr_revenue, prev_revenue)
            if curr_revenue < prev_revenue:
                msg = f"Total revenue declined {abs(rev_yoy):.1f}% from {int(prev_revenue):,} Mn in {prev_year} to {int(curr_revenue):,} Mn in {year}."
            else:
                msg = f"Total revenue increased {rev_yoy:.1f}% from {int(prev_revenue):,} Mn in {prev_year} to {int(curr_revenue):,} Mn in {year}."
            if event:
                msg += f" ({event})"
            insights["revenue"].append(msg)

            # Gross profit margin
            prev_gpm = prev['gross_profit_margin']
            curr_gpm = curr['gross_profit_margin']
            gpm_yoy = yoy_pct(curr_gpm, prev_gpm)
            if abs(curr_gpm - prev_gpm) > 5:
                direction = "increased" if curr_gpm > prev_gpm else "decreased"
                msg = f"Gross profit margin {direction} significantly ({prev_gpm:.2f}% to {curr_gpm:.2f}%) from {prev_year} to {year} ({gpm_yoy:+.1f}%)."
                if event:
                    msg += f" ({event})"
                insights["gross_profit_margin"].append(msg)

            # EPS
            prev_eps = apply_scale(prev['eps_lkr'], prev['eps_lkr_scale'])
            curr_eps = apply_scale(curr['eps_lkr'], curr['eps_lkr_scale'])
            eps_yoy = yoy_pct(curr_eps, prev_eps)
            if curr_eps < prev_eps:
                msg = f"EPS dropped {abs(eps_yoy):.1f}% from {prev_eps:.2f} in {prev_year} to {curr_eps:.2f} in {year}."
            else:
                msg = f"EPS rose {eps_yoy:.1f}% from {prev_eps:.2f} in {prev_year} to {curr_eps:.2f} in {year}."
            if event:
                msg += f" ({event})"
            insights["eps"].append(msg)

            # Operating Expenses
            prev_opex = apply_scale(prev['operating_expenses_lkr'], prev['operating_expenses_lkr_scale'])
            curr_opex = apply_scale(curr['operating_expenses_lkr'], curr['operating_expenses_lkr_scale'])
            opex_yoy = yoy_pct(curr_opex, prev_opex)
            if curr_opex < prev_opex:
                msg = f"Operating expenses decreased {abs(opex_yoy):.1f}% from {int(prev_opex):,} Mn in {prev_year} to {int(curr_opex):,} Mn in {year}."
            else:
                msg = f"Operating expenses increased {opex_yoy:.1f}% from {int(prev_opex):,} Mn in {prev_year} to {int(curr_opex):,} Mn in {year}."
            if event:
                msg += f" ({event})"
            insights["operating_expenses"].append(msg)

            # Cost of Sales
            prev_cost = apply_scale(prev['cost_of_sales_lkr'], prev['cost_of_sales_lkr_scale'])
            curr_cost = apply_scale(curr['cost_of_sales_lkr'], curr['cost_of_sales_lkr_scale'])
            cost_yoy = yoy_pct(curr_cost, prev_cost)
            if curr_cost < prev_cost:
                msg = f"Cost of sales decreased {abs(cost_yoy):.1f}% from {int(prev_cost):,} Mn in {prev_year} to {int(curr_cost):,} Mn in {year}."
            else:
                msg = f"Cost of sales increased {cost_yoy:.1f}% from {int(prev_cost):,} Mn in {prev_year} to {int(curr_cost):,} Mn in {year}."
            if event:
                msg += f" ({event})"
            insights["cost_of_sales"].append(msg)

            # Net Profit
            prev_np = apply_scale(prev['net_profit_lkr'], prev['net_profit_lkr_scale'])
            curr_np = apply_scale(curr['net_profit_lkr'], curr['net_profit_lkr_scale'])
            np_yoy = yoy_pct(curr_np, prev_np)
            if curr_np < prev_np:
                msg = f"Net profit dropped {abs(np_yoy):.1f}% from {int(prev_np):,} Mn in {prev_year} to {int(curr_np):,} Mn in {year}."
            else:
                msg = f"Net profit rose {np_yoy:.1f}% from {int(prev_np):,} Mn in {prev_year} to {int(curr_np):,} Mn in {year}."
            if event:
                msg += f" ({event})"
            insights["net_profit"].append(msg)

            # Net Asset Per Share
            prev_naps = apply_scale(prev['net_asset_per_share_lkr'], prev['net_asset_per_share_lkr_scale'])
            curr_naps = apply_scale(curr['net_asset_per_share_lkr'], curr['net_asset_per_share_lkr_scale'])
            naps_yoy = yoy_pct(curr_naps, prev_naps)
            if curr_naps < prev_naps:
                msg = f"Net asset per share declined {abs(naps_yoy):.1f}% from {prev_naps:.2f} in {prev_year} to {curr_naps:.2f} in {year}."
            else:
                msg = f"Net asset per share increased {naps_yoy:.1f}% from {prev_naps:.2f} in {prev_year} to {curr_naps:.2f} in {year}."
            if event:
                msg += f" ({event})"
            insights["net_asset_per_share"].append(msg)

        # Right Issues Insights
        right_issues_path = DATA_DIR / 'right_issues.csv'
        if right_issues_path.exists():
            df_ri = pd.read_csv(right_issues_path)
            # Group by year, summarize significant issues
            for year, group in df_ri.groupby('year'):
                issues = group.dropna(subset=['issue_price'])
                if not issues.empty:
                    prices = issues['issue_price'].dropna().tolist()
                    if prices:
                        avg_price = sum(prices) / len(prices)
                        msg = f"Right issues in {year}: {len(prices)} issues, average price LKR {avg_price:.2f}."
                        insights["right_issues"].append(msg)

        return jsonify(insights)
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/forecast', methods=['GET'])
def get_forecast():
    try:
        metric = request.args.get('metric', 'total_revenue_lkr')
        periods = int(request.args.get('periods', 3))
        file_path = DATA_DIR / 'financial_metrics.csv'
        if not file_path.exists():
            return jsonify({'error': 'Financial data not found'}), 404
        
        df = pd.read_csv(file_path)
        
        # Process the data with scaling
        processed_data = []
        for _, row in df.iterrows():
            value = apply_scale(row[metric], row[f'{metric}_scale'])
            if value is not None:
                processed_data.append({
                    'year': int(row['year']),
                    'value': value
                })
        
        if not processed_data:
            return jsonify({'error': 'No valid data for forecasting'}), 400
        
        # Create DataFrame for Prophet
        df_prophet = pd.DataFrame(processed_data)
        df_prophet = df_prophet.rename(columns={'year': 'ds', 'value': 'y'})
        df_prophet['ds'] = pd.to_datetime(df_prophet['ds'], format='%Y')
        
        # Fit Prophet model
        model = Prophet(yearly_seasonality=True, daily_seasonality=False, weekly_seasonality=False)
        model.fit(df_prophet)
        
        # Make future predictions
        future = model.make_future_dataframe(periods=periods, freq='Y')
        forecast = model.predict(future)
        
        # Build response
        last_year = df['year'].max()
        result = []
        for _, row in forecast.iterrows():
            year = int(row['ds'].year)
            if year <= last_year:
                result.append({'year': year, 'forecast': None})
            else:
                result.append({'year': year, 'forecast': max(0, float(row['yhat']))})
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error generating forecast: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True)