from flask import Blueprint, jsonify
from ..data_extractor import process_annual_report
import os
from pathlib import Path

api = Blueprint('api', __name__)

@api.route('/api/financial-data', methods=['GET'])
def get_financial_data():
    """
    Endpoint to get processed financial data from PDFs
    """
    data_dir = Path(__file__).parent.parent.parent / 'data'
    financial_data = {}
    
    # Process each PDF file
    for pdf_file in data_dir.glob('*.pdf'):
        year = pdf_file.stem.split('_')[1][:4]  # Extract year from filename
        data = process_annual_report(str(pdf_file))
        if data:
            financial_data[year] = data
    
    return jsonify(financial_data)

@api.route('/api/revenue', methods=['GET'])
def get_revenue():
    """
    Endpoint to get revenue data
    """
    try:
        data_dir = Path(__file__).parent.parent.parent / 'data'
        revenue_file = data_dir / 'revenue.csv'
        
        if not revenue_file.exists():
            return jsonify({"error": "Revenue data not found"}), 404
            
        import pandas as pd
        df = pd.read_csv(revenue_file)
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500 