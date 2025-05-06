import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchFinancialData = async () => {
  try {
    const response = await api.get('/financials');
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid data format received from server');
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching financial data:', error);
    throw error;
  }
};

export const fetchShareholders = async () => {
  try {
    const response = await api.get('/shareholders');
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid data format received from server');
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching shareholders data:', error);
    throw error;
  }
}; 