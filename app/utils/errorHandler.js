export const handleAuthError = (error) => {
    if (error.message.includes('401')) {
        return 'PIN inválido o no autorizado';
    }
    if (error.message.includes('Network')) {
        return 'Error de conexión al servidor';
    }
    return error.message;
};