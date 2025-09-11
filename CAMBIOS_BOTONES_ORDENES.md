# Implementación de Botones Contextuales por Estado de Orden

## Cambios Realizados

### 1. Nueva Función de Detección de Estado
- **`isOrderSent(order)`**: Función mejorada que determina si una orden ya fue enviada a cocina
- Verifica múltiples condiciones:
  - Estado de órdenes existentes (`isExisting` con status `enviado/sent/submitted`)
  - Campo `states` en formato SambaPOS con `stateName: "Status"` y `state: "Enviado"`

### 2. Lógica de Botones Contextual

#### Para Órdenes NO Enviadas (Pendientes/Nuevas):
```
[−] [cantidad] [+] [🗑️]
```
- **Botón −**: Reducir cantidad
- **Botón +**: Aumentar cantidad  
- **Botón 🗑️**: Eliminar orden

#### Para Órdenes ENVIADAS (Estado "Enviado"):
```
[cantidad] [🏷️] [🎁] [❌]
```
- **🏷️ Etiquetas**: Gestionar etiquetas de orden
- **🎁 Cortesía**: Marcar producto como regalo (requiere PIN admin)
- **❌ Cancelar Producto**: Anular/void orden (requiere PIN admin)

## Integración con SambaPOS

### Estados Reconocidos
- **"Enviado"** / **"sent"** / **"submitted"**: Orden enviada a cocina
- **"ENVIADO"**: Mapeo interno del estado
- Basado en campo `states` de GraphQL:
```json
"states": [
  {
    "stateName": "Status",
    "state": "Enviado", 
    "stateValue": ""
  }
]
```

### Funcionalidad Administrativa
- **Cortesía**: Ejecuta comando `Regalo` vía `executeAutomationCommand`
- **Cancelar Producto**: Ejecuta comando `Anular` vía `executeAutomationCommand`
- Ambos requieren PIN de administrador para autorización

## Archivos Modificados

1. **`app/components/POS/POSViewMobile.jsx`**
   - Agregada función `isOrderSent(order)`
   - Mejorada función `determineOrderStatus()` para incluir caso "enviado"
   - Reemplazada lógica de botones con condicionales contextuales
   - Eliminada sección duplicada de botones admin

## Beneficios

1. **UX Intuitiva**: Botones cambian automáticamente según el estado de la orden
2. **Prevención de Errores**: No se pueden modificar cantidades de órdenes ya enviadas
3. **Flujo Administrativo**: Acceso directo a funciones de cortesía y anulación
4. **Compatibilidad Total**: Integración completa con el sistema SambaPOS existente

## Estados de Prueba

Para probar la funcionalidad:

1. **Orden Nueva**: Agregar producto → ver botones +, -, eliminar
2. **Orden Enviada**: Comandar a cocina → ver botones etiquetas, cortesía, cancelar
3. **Cortesía**: Click en 🎁 → solicita PIN admin → ejecuta comando
4. **Anular**: Click en ❌ → solicita PIN admin → ejecuta comando
