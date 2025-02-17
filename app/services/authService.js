import Debug from 'debug';
import { appconfig } from '../config';

const debug = Debug('pmpos:auth');

export const authenticate = async (pin) => {
    try {
        debug('🔐 Authenticating with PIN...');
        
        // Validate PIN format
        if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
            throw new Error('El PIN debe tener 4 dígitos numéricos');
        }

        const { apiUrl } = appconfig();
        const url = `${apiUrl}/Token`;
        debug('📡 Sending request to:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                pin,
                terminal: 'WebClient',
                department: 'Restaurant',
                deviceId: 'web'
            })
        });

        if (!response.ok) {
            debug('❌ Response error:', response.status, response.statusText);
            throw new Error('PIN inválido');
        }

        const result = await response.json();
        debug('✅ Response received:', result);

        if (!result || !result.token) {
            debug('❌ Invalid response:', result);
            throw new Error('PIN inválido');
        }

        debug('✅ Authentication successful');
        return {
            success: true,
            token: result.token,
            user: {
                name: result.userName,
                roles: result.roles || []
            },
            tokenExpiry: new Date(result.expires)
        };
    } catch (error) {
        debug('❌ Authentication error:', error);
        throw new Error('PIN inválido');
    }
};