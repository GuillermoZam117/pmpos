// Canonical presets for sales modes (Mostrador, Mesas, Reparto, etc.)
// Each mode can override department, ticket type, entity type/screen, and menu defaults.

export const SALES_MODES = {
    mesas: {
        label: 'Mesas',
        description: 'Vista tradicional con entidades de Mesas',
        departmentName: 'VENTAS',
        ticketTypeName: 'TICKET',
        entityTypeName: 'Mesas',
        entityScreenName: 'MESAS',
        menuName: 'MENU'
    },
    mostrador: {
        label: 'Mostrador',
        description: 'Venta rápida sin entidad (mostrador/caja)',
        departmentName: 'VENTAS',
        ticketTypeName: 'TICKET',
        entityTypeName: null,
        entityScreenName: null,
        menuName: 'MENU'
    },
    reparto: {
        label: 'Reparto',
        description: 'Servicio a domicilio con entidad Clientes',
        departmentName: 'REPARTO',
        ticketTypeName: 'REPARTO',
        entityTypeName: 'Clientes',
        entityScreenName: 'CLIENTES',
        menuName: 'MENU'
    }
};

export const DEFAULT_SALES_MODE = 'mesas';

export const resolveSalesMode = (key) => {
    if (!key) return SALES_MODES[DEFAULT_SALES_MODE];
    return SALES_MODES[key] || SALES_MODES[DEFAULT_SALES_MODE];
};

export default SALES_MODES;
