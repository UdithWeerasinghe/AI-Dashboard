import os
import pandas as pd
import camelot
import tabula
import re
from datetime import datetime
import logging
from pathlib import Path
import warnings
from PyPDF2 import PdfReader
import numpy as np

# Add scale factors and order for normalization
SCALE_FACTORS = {'Bn': 1e9, 'Mn': 1e6, 'K': 1e3, '': 1}
SCALE_ORDER = ['Mn', 'Bn', 'K', '']  # Prefer Mn, then Bn, then K, then raw

# Suppress PyPDF2 deprecation warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

# Configure logging with proper encoding handling
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data_extraction.log', encoding='utf-8', errors='replace'),
        logging.StreamHandler()
    ]
)

# Mapping from filename to report year (use ending year for ranges)
FILENAME_YEAR_MAP = {
    '508_1590052852777.pdf': 2020,  # annual report 2019/20
    '508_1621849083921.pdf': 2021,  # annual report 2020/21
    '508_1653300092463.pdf': 2022,  # annual report 2021/22
    '508_1684842640428.pdf': 2023,  # annual report 2022/23
    '508_1716290978705.pdf': 2024,  # annual report 2023/24
}

# PDF-to-year mapping for extraction
YEAR_TO_PDFS = {
    2019: ['508_1590052852777.pdf'],
    2020: ['508_1590052852777.pdf', '508_1621849083921.pdf'],
    2021: ['508_1621849083921.pdf', '508_1653300092463.pdf'],
    2022: ['508_1653300092463.pdf', '508_1684842640428.pdf'],
    2023: ['508_1684842640428.pdf', '508_1716290978705.pdf'],
}

# Add this mapping at the top of your file (after imports)
FISCAL_YEAR_MAP = {
    '508_1590052852777.pdf': '2019_20',
    '508_1621849083921.pdf': '2020_21',
    '508_1653300092463.pdf': '2021_22',
    '508_1684842640428.pdf': '2022_23',
    '508_1716290978705.pdf': '2023_24',
}

FISCAL_YEAR_TABLE_MAP = {
    '508_1590052852777.pdf': ('2019_20', '2018_19'),
    '508_1621849083921.pdf': ('2020_21', '2019_20'),
    '508_1653300092463.pdf': ('2021_22', '2020_21'),
    '508_1684842640428.pdf': ('2022_23', '2021_22'),
    '508_1716290978705.pdf': ('2023_24', '2022_23'),
}

def get_main_year_from_filename(filename):
    """Return the main year for a given filename using the mapping, else None."""
    base = os.path.basename(filename)
    return FILENAME_YEAR_MAP.get(base)

def format_number(value, target_scale='millions'):
    """
    Format number to appropriate scale (thousands, millions, billions).
    Returns tuple of (scaled_value, scale_suffix)
    """
    if value is None:
        return None, ''
        
    abs_value = abs(value)
    
    if target_scale == 'auto':
        if abs_value >= 1e9:
            return value / 1e9, 'Bn'
        elif abs_value >= 1e6:
            return value / 1e6, 'Mn'
        elif abs_value >= 1e3:
            return value / 1e3, 'K'
        else:
            return value, ''
    elif target_scale == 'millions':
        return value / 1e6, 'Mn'
    elif target_scale == 'billions':
        return value / 1e9, 'Bn'
    else:  # thousands
        return value / 1e3, 'K'

def extract_year_from_pdf_content(pdf_path):
    """Extract year from PDF content using multiple methods."""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        # Check first 5 pages for year information
        for page_num in range(min(5, len(reader.pages))):
            text += reader.pages[page_num].extract_text() or ""
        
        # Common patterns in annual reports
        year_patterns = [
            # Full date patterns
            r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20(19|20|21|22|23)',
            r'\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20(19|20|21|22|23)',
            # Fiscal year patterns
            r'(?:FY|Financial Year|Year Ended|For the Year|Annual Report)\s+20(19|20|21|22|23)',
            r'20(19|20|21|22|23)(?:/|-|–)20\d{2}\s+(?:Annual Report|Financial Statements)',
            # Year in context
            r'(?:Results|Performance|Report)\s+(?:for|of)\s+(?:the\s+year\s+)?20(19|20|21|22|23)',
            # Year with quarter
            r'Q[1-4]\s+20(19|20|21|22|23)',
            # Simple year pattern (last resort)
            r'(?<!\d)20(19|20|21|22|23)(?!\d)'
        ]
        
        # Try each pattern
        for pattern in year_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            years = []
            for match in matches:
                year = int(f"20{match.group(1)}")
                if 2019 <= year <= 2023:
                    years.append(year)
            
            if years:
                # If multiple years found, prefer the one mentioned more frequently
                return max(set(years), key=years.count)
                
        return None
    except Exception as e:
        logging.error(f"Error extracting year from PDF content: {e}")
        return None

def extract_year_from_filename(filename):
    """Extract year from filename or PDF content."""
    try:
        # First try the hardcoded mapping
        year_mapping = {
            '508_1684842640428.pdf': 2023,
            '508_1653300092463.pdf': 2022,
            '508_1621761542463.pdf': 2021,
            '508_1590223142463.pdf': 2020,
            '508_1558684742463.pdf': 2019
        }
        if filename in year_mapping:
            return year_mapping[filename]
        
        # Try to extract year from filename using regex
        year_match = re.search(r'20(19|20|21|22|23)', filename)
        if year_match:
            year = int(year_match.group(0))
            if 2019 <= year <= 2023:  # Validate year range
                return year
            
        return None
    except Exception as e:
        logging.error(f"Error extracting year from {filename}: {e}")
        return None

def determine_year(pdf_path):
    """Determine the year using multiple methods."""
    filename = os.path.basename(pdf_path)
    
    # Try filename first
    year = extract_year_from_filename(filename)
    if year:
        logging.info(f"Year {year} extracted from filename: {filename}")
        return year
        
    # Try PDF content
    year = extract_year_from_pdf_content(pdf_path)
    if year:
        logging.info(f"Year {year} extracted from PDF content: {filename}")
        return year
        
    logging.warning(f"Could not determine year for file: {filename}")
    return None

def clean_numeric_value(value):
    """Clean and validate numeric values with improved handling."""
    if pd.isna(value) or value == '':
        return None
    
    try:
        if isinstance(value, (int, float)):
            return float(value)
        
        # Convert to string and clean
        value_str = str(value).strip()
        
        # Handle parentheses for negative numbers
        if value_str.startswith('(') and value_str.endswith(')'):
            value_str = '-' + value_str[1:-1]
        
        # Remove currency symbols and text
        value_str = re.sub(r'[Rs\.|LKR|USD|$]', '', value_str, flags=re.IGNORECASE)
        
        # Handle thousands/millions/billions
        multiplier = 1
        if 'billion' in value_str.lower():
            multiplier = 1e9
        elif 'million' in value_str.lower():
            multiplier = 1e6
        elif 'thousand' in value_str.lower():
            multiplier = 1e3
            
        # Remove text and clean remaining string
        value_str = re.sub(r'[^\d.-]', '', value_str)
        
        if value_str in ['.', '-', '']:
            return None
            
        num = float(value_str) * multiplier
        
        # Validate the number is within reasonable bounds
        if abs(num) > 1e12:  # If number is larger than 1 trillion
            return None
        return num
    except:
        return None

def extract_tables_from_pdf(pdf_path):
    """Extract tables from PDF using both Camelot and Tabula with improved settings."""
    tables = []
    
    # Try Camelot with different settings
    for flavor in ['stream', 'lattice']:
        try:
            if flavor == 'stream':
                camelot_tables = camelot.read_pdf(
                    pdf_path,
                    pages='all',
                    flavor=flavor,
                    edge_tol=500,
                    row_tol=10,
                    strip_text='\n'
                )
            else:  # lattice
                camelot_tables = camelot.read_pdf(
                    pdf_path,
                    pages='all',
                    flavor=flavor,
                    strip_text='\n'
                )
            if camelot_tables:
                tables.extend([t.df for t in camelot_tables])
                logging.info(f"Found {len(camelot_tables)} tables using Camelot ({flavor})")
        except Exception as e:
            logging.warning(f"Camelot {flavor} extraction failed: {e}")

    # Try Tabula if Camelot didn't find enough tables
    if len(tables) < 5:
        try:
            tabula_tables = tabula.read_pdf(
                pdf_path,
                pages='all',
                multiple_tables=True,
                guess=True,
                lattice=True,
                stream=True
            )
            if tabula_tables:
                tables.extend(tabula_tables)
                logging.info(f"Found {len(tabula_tables)} additional tables using Tabula")
        except Exception as e:
            logging.warning(f"Tabula extraction failed: {e}")

    # Debug: Print table information
    for i, table in enumerate(tables):
        logging.info(f"Table {i+1} shape: {table.shape}")
        logging.info(f"Table {i+1} columns: {list(table.columns)}")
        # Print first row to help identify table type
        if not table.empty:
            logging.info(f"Table {i+1} first row: {list(table.iloc[0])}")

    return tables

def find_value_in_row(row, keywords, nearby_cols=3):
    """Search for a value in nearby columns with improved matching."""
    row_str = ' '.join(str(val).lower() for val in row)
    
    # Check if any keyword matches
    if any(keyword.lower() in row_str for keyword in keywords):
        row_vals = [str(val).strip() for val in row]
        
        # Find the column containing the keyword
        for i, val in enumerate(row_vals):
            if any(keyword.lower() in val.lower() for keyword in keywords):
                # Look in nearby columns for numeric values
                for j in range(i, min(i + nearby_cols + 1, len(row_vals))):
                    num_val = clean_numeric_value(row_vals[j])
                    if num_val is not None:
                        return num_val
                
                # Look backwards if no value found forward
                for j in range(i-1, max(i - nearby_cols - 1, -1), -1):
                    num_val = clean_numeric_value(row_vals[j])
                    if num_val is not None:
                        return num_val
    return None

def find_financial_metrics(tables, year):
    """Extract key financial metrics from tables with enhanced patterns."""
    # Historical exchange rates (LKR to USD)
    exchange_rates = {
        2019: 178.78,  # Average rate for 2019
        2020: 185.52,  # Average rate for 2020
        2021: 198.88,  # Average rate for 2021
        2022: 359.89,  # Average rate for 2022
        2023: 322.77   # Average rate for 2023
    }
    
    metrics = {
        'year': year,
        'total_revenue_lkr': None,
        'total_revenue_usd': None,
        'cost_of_sales_lkr': None,
        'cost_of_sales_usd': None,
        'operating_expenses_lkr': None,
        'operating_expenses_usd': None,
        'net_profit_lkr': None,
        'net_profit_usd': None,
        'share_count': None,
        'eps_lkr': None,
        'eps_usd': None,
        'net_asset_per_share_lkr': None,
        'net_asset_per_share_usd': None,
        'gross_profit_margin': None,
        'events': None,
        'scale': None
    }
    
    # Enhanced keywords with value multiplier hints
    metric_keywords = {
        'total_revenue_lkr': {
            'keywords': [
                'total revenue', 'group revenue', 'revenue', 'total income', 'turnover',
                'gross revenue', 'sales revenue', 'operating revenue', 'sales', 'income'
            ],
            'multipliers': {
                'mn': 1e6, 'million': 1e6, 'millions': 1e6,
                'bn': 1e9, 'billion': 1e9, 'billions': 1e9,
                'k': 1e3, 'thousand': 1e3, 'thousands': 1e3
            }
        },
        'cost_of_sales_lkr': {
            'keywords': [
                'cost of sales', 'cost of goods sold', 'cost of revenue', 'direct costs',
                'cost of services', 'cost of products sold', 'cost of sales and services'
            ],
            'multipliers': {
                'mn': 1e6, 'million': 1e6, 'millions': 1e6,
                'bn': 1e9, 'billion': 1e9, 'billions': 1e9,
                'k': 1e3, 'thousand': 1e3, 'thousands': 1e3
            }
        },
        'operating_expenses_lkr': {
            'keywords': [
                'operating expenses', 'operating costs', 'administrative expenses',
                'admin expenses', 'selling and distribution', 'general and administrative',
                'other operating expenses', 'overhead expenses'
            ],
            'multipliers': {
                'mn': 1e6, 'million': 1e6, 'millions': 1e6,
                'bn': 1e9, 'billion': 1e9, 'billions': 1e9,
                'k': 1e3, 'thousand': 1e3, 'thousands': 1e3
            }
        },
        'net_profit_lkr': {
            'keywords': [
                'profit after tax', 'net profit', 'profit for the year', 'profit attributable',
                'net income', 'profit after taxation', 'profit after income tax'
            ],
            'multipliers': {
                'mn': 1e6, 'million': 1e6, 'millions': 1e6,
                'bn': 1e9, 'billion': 1e9, 'billions': 1e9,
                'k': 1e3, 'thousand': 1e3, 'thousands': 1e3
            }
        },
        'share_count': {
            'keywords': [
                'number of shares', 'total shares', 'shares in issue', 'ordinary shares',
                'issued shares', 'outstanding shares', 'total number of shares'
            ],
            'multipliers': {
                'mn': 1e6, 'million': 1e6, 'millions': 1e6,
                'bn': 1e9, 'billion': 1e9, 'billions': 1e9,
                'k': 1e3, 'thousand': 1e3, 'thousands': 1e3
            }
        },
        'eps_lkr': {
            'keywords': [
                'earnings per share', 'basic eps', 'diluted eps', 'eps',
                'profit per share', 'net profit per share', 'earnings per ordinary share'
            ],
            'multipliers': {
                'mn': 1e6, 'million': 1e6, 'millions': 1e6,
                'bn': 1e9, 'billion': 1e9, 'billions': 1e9,
                'k': 1e3, 'thousand': 1e3, 'thousands': 1e3
            }
        },
        'net_asset_per_share_lkr': {
            'keywords': [
                'net asset value per share', 'nav per share', 'net assets per share',
                'net asset per share', 'book value per share', 'net assets per ordinary share'
            ],
            'multipliers': {
                'mn': 1e6, 'million': 1e6, 'millions': 1e6,
                'bn': 1e9, 'billion': 1e9, 'billions': 1e9,
                'k': 1e3, 'thousand': 1e3, 'thousands': 1e3
            }
        }
    }
    
    # First pass: Try to find exact matches with scale detection
    for table in tables:
        table = table.astype(str)
        
        for idx, row in table.iterrows():
            row_text = ' '.join(row.astype(str)).lower()
            
            # Detect value scale from row text
            scale_multiplier = 1
            if any(scale in row_text for scale in ['mn', 'million', 'millions']):
                scale_multiplier = 1e6
            elif any(scale in row_text for scale in ['bn', 'billion', 'billions']):
                scale_multiplier = 1e9
            elif any(scale in row_text for scale in ['k', 'thousand', 'thousands']):
                scale_multiplier = 1e3
            
            for metric, keywords in metric_keywords.items():
                if metrics[metric] is None:
                    value = find_value_in_row(row, keywords['keywords'])
                    if value is not None:
                        metrics[metric] = value * scale_multiplier
                        logging.info(f"Found {metric}: {value} (scale: {scale_multiplier})")
    
    # Convert values and calculate derived metrics
    if metrics['total_revenue_lkr'] is not None:
        # Convert to USD
        exchange_rate = exchange_rates.get(year)
        if exchange_rate:
            metrics['total_revenue_usd'] = metrics['total_revenue_lkr'] / exchange_rate
            
            # Convert other LKR values to USD
            for metric in metrics:
                if metric.endswith('_lkr') and metrics[metric] is not None:
                    usd_metric = metric.replace('_lkr', '_usd')
                    metrics[usd_metric] = metrics[metric] / exchange_rate
        
        # Calculate gross profit margin if possible
        if metrics['cost_of_sales_lkr'] is not None:
            gross_profit = metrics['total_revenue_lkr'] - metrics['cost_of_sales_lkr']
            metrics['gross_profit_margin'] = (gross_profit / metrics['total_revenue_lkr'] * 100)
    
    # Add event annotations
    events_map = {
        2019: 'Easter Sunday Attacks (April 21)',
        2020: 'COVID-19 Pandemic Impact',
        2021: 'Post-COVID Recovery Phase',
        2022: 'Economic Crisis',
        2023: 'Economic Recovery Period'
    }
    metrics['events'] = events_map.get(year)
    
    return metrics

def find_shareholders_data(tables, year):
    """Extract top 20 shareholders for each year, handling tables with two years in one table."""
    shareholders = []
    for table in tables:
        try:
            # Look for tables with 'Top Twenty Shareholders' in the first few rows or columns
            table_str = table.astype(str)
            header_text = ' '.join(table_str.head(3).astype(str).values.flatten()).lower()
            if 'top twenty shareholder' not in header_text:
                continue
            # Find columns for names and percentages for each year
            columns = [str(col).lower() for col in table.columns]
            # Find year columns (e.g., '31 mar 2020', '31 mar 2019')
            year_cols = [i for i, col in enumerate(columns) if re.search(r'\d{4}', col)]
            pct_cols = [i for i, col in enumerate(columns) if '%' in col]
            name_col = 0  # Assume first column is name
            # If two years in one table, extract both
            if len(year_cols) >= 2 and len(pct_cols) >= 2:
                # Extract year from column headers
                year1 = int(re.search(r'\d{4}', columns[year_cols[0]]).group(0))
                year2 = int(re.search(r'\d{4}', columns[year_cols[1]]).group(0))
                pct_col1 = pct_cols[0]
                pct_col2 = pct_cols[1]
                for idx, row in table.iterrows():
                    name = str(row.iloc[name_col]).strip()
                    pct1 = row.iloc[pct_col1]
                    pct2 = row.iloc[pct_col2]
                    # Clean and validate
                    try:
                        pct1 = float(str(pct1).replace('%','').strip())
                    except:
                        pct1 = None
                    try:
                        pct2 = float(str(pct2).replace('%','').strip())
                    except:
                        pct2 = None
                    # Only add if name is not a header and pct is valid
                    if name and name.lower() not in ['shareholder', 'name']:
                        if pct1 is not None and pct1 > 0 and pct1 <= 100:
                            shareholders.append({
                                'year': year1,
                                'rank': len([s for s in shareholders if s['year'] == year1]) + 1,
                                'shareholder_name': name,
                                'ownership_percentage': pct1
                            })
                        if pct2 is not None and pct2 > 0 and pct2 <= 100:
                            shareholders.append({
                                'year': year2,
                                'rank': len([s for s in shareholders if s['year'] == year2]) + 1,
                                'shareholder_name': name,
                                'ownership_percentage': pct2
                            })
            # If only one year, fallback to previous logic
            else:
                percentage_keywords = ['%', 'percentage', 'holding', 'ownership', 'shareholding', 'stake']
                pct_col = None
                for i, col in enumerate(columns):
                    if any(k in col for k in percentage_keywords):
                        pct_col = i
                        break
                if pct_col is not None:
                    rank = 1
                    for _, row in table.iterrows():
                        name = str(row.iloc[name_col]).strip()
                        pct = row.iloc[pct_col]
                        try:
                            pct = float(str(pct).replace('%','').strip())
                        except:
                            pct = None
                        if name and name.lower() not in ['shareholder', 'name'] and pct is not None and pct > 0 and pct <= 100:
                            shareholders.append({
                                'year': year,
                                'rank': rank,
                                'shareholder_name': name,
                                'ownership_percentage': pct
                            })
                            rank += 1
        except Exception as e:
            logging.warning(f"Error processing table for shareholders: {str(e)}")
            continue
    # Only keep top 20 per year
    out = []
    for y in set([s['year'] for s in shareholders]):
        year_shareholders = [s for s in shareholders if s['year'] == y]
        year_shareholders = sorted(year_shareholders, key=lambda x: x['rank'])[:20]
        for i, sh in enumerate(year_shareholders, 1):
            sh['rank'] = i
            out.append(sh)
    return out

def find_right_issues(tables, year):
    """Extract right issues data with enhanced pattern matching."""
    issues = []
    right_issue_keywords = [
        'right', 'rights', 'issue', 'offer', 'allotment', 'subscription',
        'entitlement', 'ratio', 'price per share'
    ]
    for table in tables:
        try:
            table_str = table.astype(str)
            table_text = ' '.join([' '.join(map(str, row)) for row in table_str.values])
            if not any(keyword in table_text.lower() for keyword in right_issue_keywords):
                continue
            for idx, row in table.iterrows():
                row_text = ' '.join(map(str, row)).lower()
                ratio = None
                price = None
                # Only accept valid ratio patterns (not year-like)
                ratio_patterns = [
                    r'\b(\d{1,2})\s*:\s*(\d{1,2})\b',           # 1:2
                    r'\b(\d{1,2})\s+for\s+(\d{1,2})\b',         # 1 for 2
                    r'one\s+for\s+(\d{1,2})',           # one for 2
                    r'\b(\d{1,2})\s+to\s+(\d{1,2})\b',          # 1 to 2
                    r'ratio\s+of\s+(\d{1,2})\s*:\s*(\d{1,2})'  # ratio of 1:2
                ]
                for pattern in ratio_patterns:
                    match = re.search(pattern, row_text)
                    if match:
                        if match.group(1).lower() == 'one':
                            ratio = f"1:{match.group(2)}"
                        else:
                            ratio = f"{match.group(1)}:{match.group(2)}"
                        # Avoid year-like ratios (e.g., 2020:21)
                        if int(match.group(1)) > 31 or int(match.group(2)) > 31:
                            ratio = None
                        break
                # Look for price
                price_patterns = [
                    r'(?:rs\.?|lkr)\s*(\d+\.?\d*)',
                    r'(?:price|rate)\s+(?:of\s+)?(?:rs\.?|lkr)\s*(\d+\.?\d*)',
                    r'(?:at|@)\s*(?:rs\.?|lkr)\s*(\d+\.?\d*)',
                    r'(\d+\.?\d*)\s*(?:rs\.?|lkr)'
                ]
                for pattern in price_patterns:
                    match = re.search(pattern, row_text, re.IGNORECASE)
                    if match:
                        try:
                            price = float(match.group(1))
                            break
                        except:
                            continue
                if (ratio and ':' in ratio) or (price and price > 0):
                    issues.append({
                        'year': year,
                        'ratio': ratio if ratio else '',
                        'issue_price': price
                    })
        except Exception as e:
            logging.warning(f"Error processing table for right issues: {str(e)}")
            continue
    return issues

def extract_year_from_string(s):
    """Extract all year patterns from a string (2021, 21, 2020/2021, 2020/21, etc.). Returns a set of years as integers."""
    years = set()
    # Patterns: 2021, 21, 2020/2021, 2020/21, 2020-21, 2020–21
    patterns = [
        r'20(1[9]|2[0-4])',                # 2019-2024
        r'\b([1-9][0-9])\b',              # 2-digit years (e.g., 21)
        r'20(1[9]|2[0-4])[\-/–](1[9]|2[0-4])', # 2020/21, 2020-21, 2020–21
    ]
    for pat in patterns:
        for m in re.finditer(pat, s):
            if len(m.groups()) == 2:
                # Range, e.g., 2020/21: use the ending year
                y2 = int('20' + m.group(2))
                if 2019 <= y2 <= 2024:
                    years.add(y2)
            elif len(m.groups()) == 1:
                y = int('20' + m.group(1)) if len(m.group(1)) == 2 else int(m.group(1))
                if 2019 <= y <= 2024:
                    years.add(y)
            else:
                y = int(m.group(0))
                if 2019 <= y <= 2024:
                    years.add(y)
    return years

def extract_all_years_from_table(table):
    """Scan all cells in a table and return all years found."""
    years = set()
    for row in table.astype(str).values:
        for cell in row:
            years.update(extract_year_from_string(str(cell)))
    return years

def normalize_metric_scale(values):
    """Given a list of (value, scale) pairs, convert all to the most common/preferred scale."""
    # Count occurrences of each scale
    scale_counts = {s: 0 for s in SCALE_ORDER}
    for v, s in values:
        if s in scale_counts:
            scale_counts[s] += 1
    # Pick the most common, or preferred if tie
    chosen_scale = max(SCALE_ORDER, key=lambda s: (scale_counts[s], -SCALE_ORDER.index(s)))
    factor = SCALE_FACTORS[chosen_scale]
    # Convert all values to chosen scale
    normed = [v * (SCALE_FACTORS[s] / factor) if v is not None else None for v, s in values]
    return normed, chosen_scale

def find_financial_metrics_all_years(tables, main_year=None):
    """Extract financial metrics for all years found in all tables, deduplicate, positive only, normalize scale."""
    metrics_by_year = {}
    metric_values_by_year = {}  # year -> metric -> list of (value, scale)
    for table in tables:
        years_in_table = extract_all_years_from_table(table)
        # If no year found, use main_year if available
        if not years_in_table and main_year:
            years_in_table = {main_year}
        for year in years_in_table:
            metrics = find_financial_metrics([table], year)
            for k, v in metrics.items():
                if k in ('year', 'events', 'scale'):
                    continue
                if v is not None and v >= 0:  # Only positive values
                    # Try to infer scale from column name or value
                    scale = 'Mn'  # Default to Mn
                    if k.endswith('_usd') or k.endswith('_lkr'):
                        # If value is < 1, probably Bn; if > 1000, probably K
                        if v < 1:
                            scale = 'Bn'
                        elif v > 1000:
                            scale = 'K'
                    metric_values_by_year.setdefault(year, {}).setdefault(k, []).append((v, scale))
    # For each year/metric, pick the first positive value and normalize scale
    for year, metrics in metric_values_by_year.items():
        out = {'year': year}
        for k, values in metrics.items():
            # Remove duplicates, keep only first positive
            seen = set()
            filtered = [(v, s) for v, s in values if v > 0 and (v, s) not in seen and not seen.add((v, s))]
            if filtered:
                normed, chosen_scale = normalize_metric_scale(filtered)
                out[k] = normed[0]  # Take the first (deduped, normalized)
                out[f'{k}_scale'] = chosen_scale
        metrics_by_year[year] = out
    return list(metrics_by_year.values())

def find_shareholders_data_all_years(tables):
    """Extract shareholders for all years found in all tables. Log headers for debugging."""
    holders = []
    for table in tables:
        headers = [str(col).lower() for col in table.columns]
        logging.info(f"Shareholder table headers: {headers}")
        years_in_table = extract_all_years_from_table(table)
        if not years_in_table:
            continue
        for year in years_in_table:
            sh = find_shareholders_data([table], year)
            if sh:
                holders.extend(sh)
    return holders

def find_right_issues_all_years(tables):
    """Extract right issues for all years found in all tables. Log headers for debugging."""
    issues = []
    for table in tables:
        headers = [str(col).lower() for col in table.columns]
        logging.info(f"Right issues table headers: {headers}")
        years_in_table = extract_all_years_from_table(table)
        if not years_in_table:
            continue
        for year in years_in_table:
            ri = find_right_issues([table], year)
            if ri:
                issues.extend(ri)
    return issues

def extract_shareholders_from_pdf(pdf_path, fiscal_years, output_dir):
    reader = PdfReader(str(pdf_path))
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    marker = "Top Twenty Shareholders of the Company"
    if marker not in text:
        print(f"Marker not found in {pdf_path}")
        return
    section = text.split(marker, 1)[1]
    lines = section.splitlines()
    year_header_idx = None
    for i, line in enumerate(lines):
        if re.search(r'\d{4}', line):
            year_header_idx = i
            break
    if year_header_idx is None:
        print(f"No year header found in {pdf_path}")
        return
    data_lines = []
    for line in lines[year_header_idx+1:]:
        if not line.strip():
            continue
        if len(re.findall(r'\d', line)) < 5:
            continue
        data_lines.append(line)
        if len(data_lines) == 20:
            break
    if len(data_lines) < 20:
        print(f"Only found {len(data_lines)} shareholder rows in {pdf_path}")
        return
    header_line = lines[year_header_idx]
    years = re.findall(r'\d{4}', header_line)
    if len(years) < 2:
        print(f"Could not find two years in header for {pdf_path}")
        return
    year1, year2 = fiscal_years
    rows1, rows2 = [], []
    for line in data_lines:
        m = re.match(r'^(.*?)(\d[\d,]*)\s+([\d.]+)\s+(\d[\d,]*)\s+([\d.]+)', line)
        if m:
            name = m.group(1).strip()
            pct1 = float(m.group(3))
            pct2 = float(m.group(5))
            rows1.append({'shareholder_name': name, 'ownership_percentage': pct1})
            rows2.append({'shareholder_name': name, 'ownership_percentage': pct2})
        else:
            m = re.match(r'^(.*?)(\d[\d,]*)\s+([\d.]+)', line)
            if m:
                name = m.group(1).strip()
                pct1 = float(m.group(3))
                rows1.append({'shareholder_name': name, 'ownership_percentage': pct1})
    if len(rows1) == 20:
        pd.DataFrame(rows1).to_csv(output_dir / f'shareholders_{year1}.csv', index=False)
    if len(rows2) == 20:
        pd.DataFrame(rows2).to_csv(output_dir / f'shareholders_{year2}.csv', index=False)

def extract_all_shareholders_tables(pdf_folder, output_dir):
    for pdf_file, fiscal_years in FISCAL_YEAR_TABLE_MAP.items():
        pdf_path = Path(pdf_folder) / pdf_file
        if pdf_path.exists():
            extract_shareholders_from_pdf(pdf_path, fiscal_years, output_dir)

def extract_pdf_tables(pdf_folder=r'C:\GITHUB\AI-Dashboard\backend\data'):
    """Process all PDFs and extract all data types, with fallback to combining in financial_metrics.csv."""
    pdf_folder = Path(pdf_folder)
    output_dir = pdf_folder.parent / 'data_cleaned'
    output_dir.mkdir(exist_ok=True)
    
    all_metrics = {}
    all_shareholders = []
    all_right_issues = []
    
    # Process each PDF for each year according to the mapping
    for year, pdf_list in YEAR_TO_PDFS.items():
        year_tables = []
        for pdf_name in pdf_list:
            pdf_path = pdf_folder / pdf_name
            if pdf_path.exists():
                tables = extract_tables_from_pdf(str(pdf_path))
                if tables:
                    year_tables.extend(tables)
                    
        if year_tables:
            # Extract all types of data
            metrics_list = find_financial_metrics_all_years(year_tables, main_year=year)
            shareholders = find_shareholders_data(year_tables, year)
            issues = find_right_issues(year_tables, year)
            
            # Process financial metrics
            for m in metrics_list:
                y = m['year']
                if y == year:
                    if y not in all_metrics:
                        all_metrics[y] = m
                    else:
                        for k, v in m.items():
                            if all_metrics[y].get(k) is None and v is not None:
                                all_metrics[y][k] = v
            
            # Add shareholders and right issues
            if shareholders:
                all_shareholders.extend(shareholders)
            if issues:
                all_right_issues.extend(issues)
    
    try:
        # Save 5 separate CSVs for each year (top 20 shareholders)
        if all_shareholders:
            shareholders_df = pd.DataFrame(all_shareholders)
            shareholders_df = shareholders_df.sort_values(['year', 'rank'])
            for y in range(2019, 2024):
                year_df = shareholders_df[shareholders_df['year'] == y]
                year_df = year_df.sort_values('rank').head(20)
                if not year_df.empty:
                    year_df[['rank', 'shareholder_name', 'ownership_percentage']].to_csv(
                        output_dir / f'shareholders_{y}.csv', index=False)
                    logging.info(f"Saved shareholders_{y}.csv with {len(year_df)} entries")
        
        if all_right_issues:
            issues_df = pd.DataFrame(all_right_issues)
            issues_df = issues_df.sort_values('year')
            issues_df.to_csv(output_dir / 'right_issues.csv', index=False)
            logging.info(f"Saved right_issues.csv with {len(all_right_issues)} entries")
        
        # Save financial metrics, including shareholders and right issues if separate CSVs weren't created
        if all_metrics:
            metrics_df = pd.DataFrame(list(all_metrics.values()))
            
            # If no separate shareholders.csv, add top shareholders to metrics
            if not all_shareholders and len(all_shareholders) > 0:
                for i in range(1, 6):  # Add top 5 shareholders
                    metrics_df[f'top_{i}_shareholder'] = ''
                    metrics_df[f'top_{i}_ownership'] = None
                
                for year in metrics_df['year'].unique():
                    year_shareholders = [s for s in all_shareholders if s['year'] == year]
                    year_shareholders.sort(key=lambda x: x['ownership_percentage'], reverse=True)
                    
                    for i, sh in enumerate(year_shareholders[:5], 1):
                        metrics_df.loc[metrics_df['year'] == year, f'top_{i}_shareholder'] = sh['shareholder_name']
                        metrics_df.loc[metrics_df['year'] == year, f'top_{i}_ownership'] = sh['ownership_percentage']
            
            # If no separate right_issues.csv, add right issues to metrics
            if not all_right_issues and len(all_right_issues) > 0:
                metrics_df['right_issue_ratio'] = ''
                metrics_df['right_issue_price'] = None
                
                for year in metrics_df['year'].unique():
                    year_issues = [ri for ri in all_right_issues if ri['year'] == year]
                    if year_issues:
                        metrics_df.loc[metrics_df['year'] == year, 'right_issue_ratio'] = year_issues[0]['ratio']
                        metrics_df.loc[metrics_df['year'] == year, 'right_issue_price'] = year_issues[0]['issue_price']
            
            metrics_df = metrics_df.sort_values('year')
            metrics_df.to_csv(output_dir / 'financial_metrics.csv', index=False)
            logging.info(f"Saved financial_metrics.csv with data for {len(metrics_df)} years")
            
        # Call the new shareholders extraction
        extract_all_shareholders_tables(pdf_folder, output_dir)
            
    except Exception as e:
        logging.error(f"Error saving data: {str(e)}")

if __name__ == "__main__":
    extract_pdf_tables()