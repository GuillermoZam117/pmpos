/**
 * 💰 Servicio de Formateo de Moneda Mexicana
 * 
 * Formatea números a pesos mexicanos con el símbolo $ a la izquierda
 * Ejemplos: $320.00, $1,250.50, $15,000.00
 */

// Configuración para pesos mexicanos
const CURRENCY_CONFIG = {
    style: 'currency',
    currency: 'MXN',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
};

// Configuración de locale mexicano
const MEXICAN_LOCALE = 'es-MX';

/**
 * Formatea un número como pesos mexicanos
 * @param {number|string} amount - Cantidad a formatear
 * @returns {string} - Cantidad formateada como $X,XXX.XX
 */
export const formatMXN = (amount) => {
    const numericAmount = parseFloat(amount);
    
    if (isNaN(numericAmount)) {
        return '$0.00';
    }
    
    return new Intl.NumberFormat(MEXICAN_LOCALE, CURRENCY_CONFIG)
        .format(numericAmount);
};

/**
 * Formatea un número como pesos mexicanos sin decimales
 * @param {number|string} amount - Cantidad a formatear
 * @returns {string} - Cantidad formateada como $X,XXX
 */
export const formatMXNNoDecimals = (amount) => {
    const numericAmount = parseFloat(amount);
    
    if (isNaN(numericAmount)) {
        return '$0';
    }
    
    return new Intl.NumberFormat(MEXICAN_LOCALE, {
        ...CURRENCY_CONFIG,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(numericAmount);
};

/**
 * Formatea solo el número sin símbolo de moneda
 * @param {number|string} amount - Cantidad a formatear
 * @returns {string} - Cantidad formateada como X,XXX.XX
 */
export const formatNumberMX = (amount) => {
    const numericAmount = parseFloat(amount);
    
    if (isNaN(numericAmount)) {
        return '0.00';
    }
    
    return new Intl.NumberFormat(MEXICAN_LOCALE, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numericAmount);
};

/**
 * Parsea una cadena de moneda mexicana a número
 * @param {string} currencyString - Cadena como "$1,250.50"
 * @returns {number} - Número parseado
 */
export const parseMXN = (currencyString) => {
    if (!currencyString) return 0;
    
    // Remover símbolos de moneda, espacios y comas
    const cleanString = currencyString
        .toString()
        .replace(/[$\s,]/g, '');
    
    const parsed = parseFloat(cleanString);
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * Valida si una cantidad es un número válido
 * @param {any} amount - Cantidad a validar
 * @returns {boolean} - true si es válido
 */
export const isValidAmount = (amount) => {
    const parsed = parseFloat(amount);
    return !isNaN(parsed) && parsed >= 0;
};

/**
 * Calcula el cambio entre dos cantidades
 * @param {number|string} paid - Cantidad pagada
 * @param {number|string} total - Total a pagar
 * @returns {string} - Cambio formateado
 */
export const calculateChange = (paid, total) => {
    const paidAmount = parseFloat(paid);
    const totalAmount = parseFloat(total);
    
    if (isNaN(paidAmount) || isNaN(totalAmount)) {
        return formatMXN(0);
    }
    
    const change = Math.max(0, paidAmount - totalAmount);
    return formatMXN(change);
};

/**
 * Configuración por defecto para exportación
 */
export default {
    formatMXN,
    formatMXNNoDecimals,
    formatNumberMX,
    parseMXN,
    isValidAmount,
    calculateChange
}; 