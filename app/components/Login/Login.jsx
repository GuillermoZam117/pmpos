import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginWithPin } from '../../actions/auth';

const Login = () => {
    const [pin, setPin] = useState('');
    const dispatch = useDispatch();
    const error = useSelector(state => state.login.get('error'));
    const isLoading = useSelector(state => state.login.get('isLoading'));

    const handlePinChange = (value) => {
        if (pin.length < 4) {
            setPin(prev => prev + value);
        }
    };

    const handleSubmit = async () => {
        if (pin.length === 4) {
            const success = await dispatch(loginWithPin(pin));
            if (success) {
                setPin('');
            }
        }
    };

    const handleClear = () => {
        setPin('');
    };

    return (
        <div className="login-container">
            <div className="pin-display">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className={`pin-dot ${pin[i] ? 'filled' : ''}`}>
                        {pin[i] ? '•' : ''}
                    </div>
                ))}
            </div>
            
            <div className="numpad-grid">
                {[1,2,3,4,5,6,7,8,9].map(num => (
                    <button 
                        key={num}
                        onClick={() => handlePinChange(num)}
                        disabled={isLoading}
                        className="numpad-button">
                        {num}
                    </button>
                ))}
                <button 
                    onClick={handleClear}
                    disabled={isLoading}
                    className="numpad-button clear">
                    Clear
                </button>
                <button 
                    onClick={() => handlePinChange(0)}
                    disabled={isLoading}
                    className="numpad-button">
                    0
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={pin.length !== 4 || isLoading}
                    className="numpad-button enter">
                    Enter
                </button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
        </div>
    );
};

export default Login;
