import React, { useState } from 'react';
import { authService } from '../services/authService';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Flujo de autenticación usando el servicio authService
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await authService.login();
      if (result?.token) {
        window.location.reload();
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