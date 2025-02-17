import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import Debug from 'debug';

const debug = Debug('pmpos:auth');

export const useAuth = () => {
    const navigate = useNavigate();
    const auth = useSelector(state => state.auth);
    
    // Handle Immutable.js state
    const user = auth.get('user')?.toJS();
    const token = auth.get('token');
    const isAuthenticated = auth.get('isAuthenticated');

    // Add validation helper
    const validateUser = useCallback(() => {
        if (!user?.name || !token) {
            debug('❌ Invalid user state, redirecting to login');
            navigate('/pinpad');
            return false;
        }
        return true;
    }, [user, token, navigate]);

    // Add logout helper
    const logout = useCallback(() => {
        debug('🚪 User logged out');
        navigate('/pinpad');
    }, [navigate]);

    return {
        user,
        token,
        isAuthenticated,
        validateUser,
        logout
    };
};