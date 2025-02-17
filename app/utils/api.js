import { appconfig } from '../config';
import Debug from 'debug';

const debug = Debug('pmpos:api');

export const postJSON = async (endpoint, data) => {
    const { apiUrl } = appconfig();
    // Remove /api prefix as it's handled by proxy
    const url = `${apiUrl}${endpoint.replace('/api', '')}`;

    try {
        debug('📡 POST request to:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            debug('❌ Response error:', {
                status: response.status,
                statusText: response.statusText
            });
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        debug('✅ Response:', result);
        return result;
    } catch (error) {
        debug('❌ API error:', error);
        throw error;
    }
};