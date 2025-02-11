import React, { useState } from 'react';
import { authService } from '../services/authService';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await authService.login();
      if (result && result.token) {
        window.location.reload(); // O usar navigate si usas react-router
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... form fields ... */}
      {loading && <div>Cargando...</div>}
      {error && <div className="error">{error}</div>}
    </form>
  );
};

export default Login;