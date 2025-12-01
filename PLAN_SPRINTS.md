# 🚀 PLAN DE SPRINTS - PMPOS

**Fecha:** 1 de Diciembre de 2025  
**Versión:** 2.5.6  
**Duración Sprint:** 2 semanas (10 días hábiles)  
**Total Sprints:** 14 (7 meses)

---

## 📊 RESUMEN EJECUTIVO

| Sprint | Semanas | Epic Principal | Story Points | Status |
|--------|---------|----------------|--------------|--------|
| Sprint 0 | 1-2 | Infrastructure | 18 | 🔵 Pendiente |
| Sprint 1 | 3-4 | Database + RBAC | 34 | 🔵 Pendiente |
| Sprint 2 | 5-6 | WhatsApp Bot | 34 | 🔵 Pendiente |
| Sprint 3 | 7-8 | Google Maps Foundation | 35 | 🔵 Pendiente |
| Sprint 4 | 9-10 | Delivery Avanzado | 42 | 🔵 Pendiente |
| Sprint 5 | 11-12 | PWA + Offline | 27 | 🔵 Pendiente |
| Sprint 6 | 13-14 | Cash Register + Kitchen | 28 | 🔵 Pendiente |
| Sprint 7 | 15-16 | Loyalty System | 29 | 🔵 Pendiente |
| Sprint 8 | 17-18 | MercadoPago + Reports | 32 | 🔵 Pendiente |
| Sprint 9 | 19-20 | Image Management + Misc | 24 | 🔵 Pendiente |
| Sprint 10 | 21-22 | Performance Optimization | 30 | 🔵 Pendiente |
| Sprint 11 | 23-24 | UI/UX Polish | 28 | 🔵 Pendiente |
| Sprint 12 | 25-26 | Testing & Bug Fixes | 35 | 🔵 Pendiente |
| Sprint 13 | 27-28 | Final Polish + Deploy | 20 | 🔵 Pendiente |
| **TOTAL** | **28 sem** | | **416 SP** | |

---

## 🎯 SPRINT 0: Infrastructure Setup

**Duración:** Semana 1-2 (10 días)  
**Objetivo:** Establecer base técnica (PostgreSQL, migrations, CI/CD)  
**Story Points:** 18

### Historias Incluidas

- ✅ **US-1.1:** Setup PostgreSQL Database (3 SP)
- ✅ **US-1.2:** Sistema de Migraciones (5 SP)
- ✅ **US-1.3:** Schema Inicial (3 SP)
- ✅ **US-1.4:** Seeds de Desarrollo (2 SP)
- ✅ **Infra-1:** Configurar servidor OCI Ubuntu 24.04 (2 SP)
- ✅ **Infra-2:** Setup CI/CD con GitHub Actions (3 SP)

### Tasks Detalladas

**Día 1-2: PostgreSQL Setup**
- [ ] Instalar PostgreSQL 15 en servidor OCI
- [ ] Crear usuario y base de datos `pmpos_db`
- [ ] Configurar pg_hba.conf para acceso remoto
- [ ] Habilitar SSL en PostgreSQL
- [ ] Instalar `pg` y `pg-pool` en proyecto
- [ ] Crear `server/config/database.js` con pool
- [ ] Actualizar `.env.example` con variables PG
- [ ] Crear health check endpoint
- [ ] Testing de conexión

**Día 3-4: Sistema de Migraciones**
- [ ] Crear `server/database/migrate.js` runner
- [ ] Implementar tabla `schema_migrations`
- [ ] Scripts npm: `migrate:up`, `migrate:down`, `migrate:create`
- [ ] Crear migration 000_schema_migrations.sql
- [ ] Testing de migrations up/down
- [ ] Documentar en README.md

**Día 5-6: Schema Inicial**
- [ ] Diseñar ERD completo en dbdiagram.io
- [ ] Crear migration 001_initial_schema.sql
  - Tablas: users, roles, permissions, user_roles, role_permissions
- [ ] Indices y constraints
- [ ] Ejecutar migration en dev
- [ ] Validar integridad referencial

**Día 7-8: Seeds y CI/CD**
- [ ] Crear `server/database/seed.js` runner
- [ ] Seeds con roles y usuarios de prueba
- [ ] Script `npm run seed:dev`
- [ ] Configurar GitHub Actions workflow
- [ ] Testing automatizado en CI
- [ ] Deploy automatizado a staging

**Día 9-10: Testing y Documentación**
- [ ] Testing end-to-end de migrations
- [ ] Documentar proceso de setup en `docs/SETUP.md`
- [ ] Backup y restore procedures
- [ ] Sprint Review
- [ ] Sprint Retrospective

### Definition of Done
- [x] PostgreSQL instalado y accesible remotamente
- [x] Migrations funcionando con rollback
- [x] Schema inicial desplegado en dev y staging
- [x] Seeds ejecutados exitosamente
- [x] CI/CD pipeline verde
- [x] Documentación completa

### Dependencias
- Ninguna (primer sprint)

### Riesgos
- 🟡 **Medio:** Problemas de conectividad OCI → PostgreSQL
- 🟢 **Bajo:** Conflictos en schema inicial

---

## 🎯 SPRINT 1: Database + RBAC

**Duración:** Semana 3-4 (10 días)  
**Objetivo:** Sistema completo de roles y permisos  
**Story Points:** 34

### Historias Incluidas

- ✅ **US-2.1:** Modelo de Datos RBAC (5 SP)
- ✅ **US-2.2:** Middleware de Autorización (5 SP)
- ✅ **US-2.3:** Sincronización Usuarios SambaPOS (8 SP)
- ✅ **US-2.4:** UI de Gestión de Usuarios (8 SP)
- ✅ **US-2.5:** Testing de Permisos (8 SP)

### Tasks Detalladas

**Día 1-2: Modelo RBAC**
- [ ] Crear migration 002_rbac_tables.sql
- [ ] Seeds con 5 roles predefinidos
- [ ] Seeds con 50+ permisos
- [ ] Documentar matriz de permisos
- [ ] Testing de queries

**Día 3-4: Middleware Backend**
- [ ] Crear `server/middleware/auth.middleware.js`
- [ ] Implementar `requireRole()`
- [ ] Implementar `requirePermission()`
- [ ] Crear `server/services/rbacService.js`
- [ ] Aplicar a rutas sensibles
- [ ] Testing unitario

**Día 5-6: Sync de Usuarios**
- [ ] Crear `server/services/userSyncService.js`
- [ ] Query GraphQL para obtener users
- [ ] Lógica de insert/update/soft-delete
- [ ] Endpoint POST `/api/users/sync`
- [ ] Configurar cron job (1 hora)
- [ ] Testing con datos reales

**Día 7-8: UI de Gestión**
- [ ] Crear `app/components/Admin/UserManagement.jsx`
- [ ] MUI DataGrid con usuarios
- [ ] Filtros por rol y estado
- [ ] Dialog `UserRolesDialog.jsx`
- [ ] Checkboxes para roles múltiples
- [ ] Endpoints CRUD en backend
- [ ] Proteger ruta con RBAC

**Día 9-10: Testing y QA**
- [ ] Tests E2E con Cypress
- [ ] Validar todos los permisos
- [ ] Testing de edge cases
- [ ] Sprint Review
- [ ] Sprint Retrospective

### Definition of Done
- [x] RBAC tables desplegadas
- [x] Middleware funcionando en todas las rutas protegidas
- [x] Sync automático de usuarios cada hora
- [x] UI de gestión accesible solo a admins
- [x] Coverage >80% en tests
- [x] Documentación actualizada

### Dependencias
- ✅ Sprint 0 completado (PostgreSQL funcionando)

### Riesgos
- 🟡 **Medio:** Complejidad en matriz de permisos
- 🟢 **Bajo:** Inconsistencias en sync con SambaPOS

---

## 🎯 SPRINT 2: WhatsApp Bot Integration

**Duración:** Semana 5-6 (10 días)  
**Objetivo:** Bot funcional con notificaciones automáticas  
**Story Points:** 34

### Historias Incluidas

- ✅ **US-3.1:** Setup Baileys Library (8 SP)
- ✅ **US-3.2:** Webhook de Mensajes (8 SP)
- ✅ **US-3.3:** Notificaciones de Delivery (8 SP)
- ✅ **US-3.4:** UI de Configuración WhatsApp (5 SP)
- ✅ **US-3.5:** Templates Personalizables (5 SP)

### Tasks Detalladas

**Día 1-3: Setup Baileys**
- [ ] Instalar dependencias: baileys, qrcode, pino
- [ ] Portar código de FactJS
- [ ] Crear `server/services/whatsapp-bot.service.js`
- [ ] Auth handler con QR
- [ ] Session store en filesystem
- [ ] Reconexión automática
- [ ] Logs con pino
- [ ] Testing de conexión

**Día 4-5: Message Handler**
- [ ] Crear migration 003_whatsapp_tables.sql
- [ ] Handler para `messages.upsert`
- [ ] Crear `server/services/whatsapp-message-handler.js`
- [ ] Command parser (regex)
- [ ] Ignore grupos y mensajes propios
- [ ] Guardar en DB
- [ ] Testing con comandos reales

**Día 6-7: Notificaciones Delivery**
- [ ] Crear `server/services/whatsapp-notification.service.js`
- [ ] Templates en migration
- [ ] Template engine con variables
- [ ] Integrar en deliveryService transitions
- [ ] Queue con retry logic
- [ ] Testing de envío

**Día 8-9: UI Config**
- [ ] Crear `app/components/Settings/WhatsAppSettings.jsx`
- [ ] Endpoint SSE para QR code
- [ ] Mostrar estado de conexión
- [ ] Botón desconectar
- [ ] Lista de templates editables
- [ ] Toggles enable/disable por tipo
- [ ] Testing UI

**Día 10: Integration Testing**
- [ ] Test end-to-end: enviar mensaje real
- [ ] Test notificaciones delivery
- [ ] Sprint Review con demo en vivo
- [ ] Sprint Retrospective

### Definition of Done
- [x] Bot conectado y autenticado
- [x] Mensajes entrantes guardados en DB
- [x] Notificaciones enviadas en transiciones de delivery
- [x] UI funcional para gestionar bot
- [x] Templates editables desde admin
- [x] Demo exitoso con teléfono real

### Dependencias
- ✅ Sprint 1 completado (users table)
- ✅ Número de WhatsApp disponible

### Riesgos
- 🔴 **Alto:** Baileys inestable, posibles bans
- 🟡 **Medio:** Rate limiting de WhatsApp
- 🟢 **Bajo:** QR expira y requiere re-auth

---

## 🎯 SPRINT 3: Google Maps Foundation

**Duración:** Semana 7-8 (10 días)  
**Objetivo:** Integración básica de Google Maps para delivery  
**Story Points:** 35

### Historias Incluidas

- ✅ **US-4.1:** Setup Google Maps API (3 SP)
- ✅ **US-4.2:** DeliveryMapView Component (8 SP)
- ✅ **US-4.3:** AddressAutocomplete Component (8 SP)
- ✅ **US-4.4:** Cálculo de Delivery Fee (8 SP)
- ✅ **US-4.5:** Optimización de Rutas (8 SP)

### Tasks Detalladas

**Día 1-2: Setup API**
- [ ] Crear proyecto en Google Cloud Console
- [ ] Habilitar APIs: Maps JS, Places, Geocoding, Distance Matrix, Directions
- [ ] Generar API Key
- [ ] Configurar restricciones de dominio
- [ ] Setup billing con alertas ($50/mes)
- [ ] Instalar `@react-google-maps/api`
- [ ] Crear `app/config/googleMapsConfig.js`
- [ ] Crear `GoogleMapsLoader.jsx` wrapper
- [ ] Testing de carga

**Día 3-4: DeliveryMapView**
- [ ] Crear `app/components/Delivery/DeliveryMapView.jsx`
- [ ] Integrar GoogleMap component
- [ ] Custom markers por estado delivery
- [ ] InfoWindow con datos de ticket
- [ ] Instalar markerclusterer
- [ ] Centro en coordenadas restaurante
- [ ] Botón centrar en delivery específico
- [ ] Testing con datos mock

**Día 5-6: AddressAutocomplete**
- [ ] Instalar `use-places-autocomplete`
- [ ] Crear `app/components/Delivery/AddressAutocomplete.jsx`
- [ ] Restricción a México
- [ ] Parser de address_components
- [ ] Geocoding para lat/lng
- [ ] Validación de campos
- [ ] Integrar en wizard de SalesModeDashboard
- [ ] Testing con direcciones reales

**Día 7-8: Cálculo de Fee**
- [ ] Crear migration 004_delivery_config.sql
- [ ] Crear `app/services/deliveryCalculationService.js`
- [ ] Distance Matrix API integration
- [ ] Formula: base + (km * rate)
- [ ] Cache de 5 min
- [ ] Validación max_distance
- [ ] UI para configuración
- [ ] Testing de cálculos

**Día 9-10: Optimización Rutas**
- [ ] Crear `app/services/routeOptimizationService.js`
- [ ] Algoritmo nearest neighbor
- [ ] Directions API con waypoints
- [ ] DirectionsRenderer en mapa
- [ ] Mostrar tiempo estimado total
- [ ] Botón "Optimizar Ruta"
- [ ] Testing con múltiples deliveries
- [ ] Sprint Review
- [ ] Sprint Retrospective

### Definition of Done
- [x] APIs de Google Maps funcionando
- [x] Mapa muestra deliveries activos
- [x] Autocompletado de direcciones funcional
- [x] Delivery fee calculado correctamente
- [x] Rutas optimizadas visibles en mapa
- [x] Gastos de API <$50/mes monitoreados

### Dependencias
- ✅ Sprint 0 completado
- ✅ API Key de Google Maps
- ✅ Tarjeta de crédito para billing

### Riesgos
- 🔴 **Alto:** Costos inesperados de API si alto tráfico
- 🟡 **Medio:** Límites de cuotas de API
- 🟢 **Bajo:** Geocoding impreciso en zonas rurales

---

## 🎯 SPRINT 4: Delivery Avanzado

**Duración:** Semana 9-10 (10 días)  
**Objetivo:** Completar gestión de delivery (drivers, tracking, proofs)  
**Story Points:** 42

### Historias Incluidas

- ✅ **US-4.6:** Delivery Zones Editor (13 SP)
- ✅ **US-5.1:** Driver Management (8 SP)
- ✅ **US-5.2:** Driver Assignment (8 SP)
- ✅ **US-5.3:** Delivery Tracking Real-time (13 SP)

### Tasks Detalladas

**Día 1-3: Zones Editor**
- [ ] Crear migration 005_delivery_zones.sql
- [ ] Instalar `@turf/turf`
- [ ] Crear `app/components/Delivery/DeliveryZonesEditor.jsx`
- [ ] DrawingManager de Google Maps
- [ ] Guardar polígonos como GeoJSON
- [ ] Configurar fee y tiempo por zona
- [ ] Point-in-polygon validation
- [ ] Mostrar zonas coloreadas en mapa
- [ ] Testing con zonas reales

**Día 4-5: Driver Management**
- [ ] Crear migration 006_drivers_table.sql
- [ ] Crear `app/components/Admin/DriverManagement.jsx`
- [ ] Endpoints CRUD `/api/drivers`
- [ ] Lista con estado online/offline
- [ ] Toggle disponibilidad desde UI móvil
- [ ] Historial de entregas
- [ ] Testing

**Día 6-7: Driver Assignment**
- [ ] Crear `app/components/Delivery/DriverAssignment.jsx`
- [ ] Lógica auto-assign (menos carga)
- [ ] Reasignación manual
- [ ] Actualizar deliveryService
- [ ] Notificaciones push al driver
- [ ] Testing de asignación

**Día 8-10: Tracking Real-time**
- [ ] Crear `app/components/Public/DeliveryTracking.jsx`
- [ ] Endpoint público `/api/delivery/track/:id`
- [ ] WebSocket server setup
- [ ] Driver app envía GPS cada 30s
- [ ] Mapa con posición en tiempo real
- [ ] Polyline de ruta
- [ ] ETA actualizado
- [ ] Testing end-to-end
- [ ] Sprint Review
- [ ] Sprint Retrospective

### Definition of Done
- [x] Zonas de delivery configurables
- [x] Drivers gestionados desde admin
- [x] Auto-asignación funcional
- [x] Tracking público accesible sin auth
- [x] WebSocket estable sin drops
- [x] Demo con tracking en vivo

### Dependencias
- ✅ Sprint 3 completado (Google Maps)
- ✅ Sprint 2 completado (WhatsApp notifs)

### Riesgos
- 🟡 **Medio:** WebSocket drops en red móvil
- 🟡 **Medio:** GPS impreciso en interiores
- 🟢 **Bajo:** Zonas con polígonos complejos

---

## 🎯 SPRINT 5: PWA + Offline Mode

**Duración:** Semana 11-12 (10 días)  
**Objetivo:** App instalable con funcionalidad offline  
**Story Points:** 27

### Historias Incluidas

- ✅ **US-6.1:** Service Worker Setup (8 SP)
- ✅ **US-6.2:** Offline Storage con IndexedDB (13 SP)
- ✅ **US-6.3:** Offline Indicator (3 SP)
- ✅ **US-6.4:** PWA Manifest Completo (3 SP)

### Tasks Detalladas

**Día 1-3: Service Worker**
- [ ] Instalar `workbox-webpack-plugin`
- [ ] Crear `public/service-worker.js`
- [ ] Estrategias de cache (cache-first assets, network-first API)
- [ ] Precache de bundles críticos
- [ ] Update prompt con nueva versión
- [ ] Configurar en webpack.config.js
- [ ] Testing en dev y prod

**Día 4-7: Offline Storage**
- [ ] Instalar `dexie`
- [ ] Crear `app/services/offlineService.js`
- [ ] Schema IndexedDB: pendingOrders, pendingPayments, cachedMenu
- [ ] Queue de operaciones pendientes
- [ ] Sync automático al detectar online
- [ ] Retry logic con exponential backoff
- [ ] Resolución de conflictos
- [ ] Testing offline/online transitions

**Día 8: Offline Indicator**
- [ ] Crear hook `useNetworkStatus.js`
- [ ] Crear `app/components/shared/OfflineIndicator.jsx`
- [ ] Banner top con contador
- [ ] Colores según estado
- [ ] Integrar en App.jsx
- [ ] Testing

**Día 9-10: PWA Manifest**
- [ ] Script `generate-pwa-icons.js`
- [ ] Generar icons (72-512px)
- [ ] Completar `public/manifest.json`
- [ ] Meta tags en index.html
- [ ] Splash screens
- [ ] Lighthouse audit (>90)
- [ ] Testing instalación en Android/iOS
- [ ] Sprint Review
- [ ] Sprint Retrospective

### Definition of Done
- [x] Service worker registrado
- [x] App funciona offline básicamente
- [x] Queue sincroniza al volver online
- [x] Indicador offline visible
- [x] App instalable en móviles
- [x] Lighthouse PWA score >90

### Dependencias
- ✅ Sprint 0 completado

### Riesgos
- 🟡 **Medio:** PWA limitada en iOS Safari
- 🟢 **Bajo:** Conflictos en sync offline

---

## 🎯 SPRINT 6: Cash Register + Kitchen Printing

**Duración:** Semana 13-14 (10 días)  
**Objetivo:** Gestión de caja y printing para cocina  
**Story Points:** 28

### Historias Incluidas

- ✅ **US-9.1:** Apertura y Cierre de Caja (8 SP)
- ✅ **US-9.2:** Conteo de Denominaciones (5 SP)
- ✅ **US-9.3:** Receipt Preview (5 SP)
- ✅ **US-10.1:** Setup Kitchen Printers (5 SP)
- ✅ **US-10.2:** Print Job Queue (5 SP)

### Tasks Detalladas

**Día 1-3: Cash Register**
- [ ] Crear migration 007_shifts_table.sql
- [ ] Crear `server/services/cashDrawerService.js`
- [ ] Crear `app/components/Mostrador/CashRegister.jsx`
- [ ] Apertura de turno con saldo inicial
- [ ] Cierre de turno con conteo
- [ ] Cálculo de diferencia
- [ ] ESC/POS command para abrir cajón
- [ ] Testing

**Día 4-5: Denominaciones**
- [ ] UI para conteo de billetes/monedas
- [ ] Grid con denominaciones MXN
- [ ] Cálculo automático de totales
- [ ] Discrepancias resaltadas
- [ ] Export a PDF
- [ ] Testing

**Día 6-7: Receipt Preview**
- [ ] Crear `app/components/Receipt/ReceiptPreview.jsx`
- [ ] Template térmico 80mm
- [ ] QR code con URL ticket
- [ ] Customización de header/footer
- [ ] Preview antes de imprimir
- [ ] Reimpresión de tickets
- [ ] Testing

**Día 8-10: Kitchen Printing**
- [ ] Crear migration 008_kitchen_printers.sql
- [ ] Crear `server/services/kitchenPrintService.js`
- [ ] Configuración de printers por categoría
- [ ] Print job queue
- [ ] Retry logic
- [ ] UI de configuración
- [ ] Testing con printer real
- [ ] Sprint Review
- [ ] Sprint Retrospective

### Definition of Done
- [x] Turnos de caja funcionales
- [x] Conteo de denominaciones preciso
- [x] Receipts generados correctamente
- [x] Kitchen printers configurables
- [x] Jobs impresos sin pérdidas
- [x] Demo con hardware real

### Dependencias
- ✅ Sprint 0 completado
- ✅ Impresoras térmicas disponibles

### Riesgos
- 🟡 **Medio:** Compatibilidad de impresoras
- 🟢 **Bajo:** Jobs perdidos en queue

---

## 🎯 SPRINT 7: Loyalty System

**Duración:** Semana 15-16 (10 días)  
**Objetivo:** Programa de lealtad completo  
**Story Points:** 29

### Historias Incluidas

- ✅ **US-7.1:** Acumulación de Puntos (8 SP)
- ✅ **US-7.2:** Redención de Puntos (8 SP)
- ✅ **US-7.3:** Tiers de Loyalty (5 SP)
- ✅ **US-7.4:** Loyalty Dashboard (8 SP)

### Tasks Detalladas

**Día 1-3: Acumulación**
- [ ] Crear migration 009_loyalty_system.sql
- [ ] Crear `server/services/loyaltyService.js`
- [ ] Lógica: 1 punto / $10 MXN
- [ ] Integrar en paymentService
- [ ] Registro automático de clientes
- [ ] WhatsApp notificación de puntos
- [ ] Testing

**Día 4-6: Redención**
- [ ] Crear `app/components/Loyalty/RewardsDialog.jsx`
- [ ] Catálogo de rewards
- [ ] Validación de puntos suficientes
- [ ] Aplicar descuento a ticket
- [ ] Resta de puntos
- [ ] Endpoints CRUD rewards
- [ ] UI admin para gestionar rewards
- [ ] Testing

**Día 7-8: Tiers**
- [ ] Lógica de tiers (Bronze→Platinum)
- [ ] Multiplicadores por tier
- [ ] Auto-upgrade
- [ ] Crear `app/components/Loyalty/CustomerLoyaltyCard.jsx`
- [ ] Badge de tier
- [ ] Progreso visual
- [ ] WhatsApp notificación upgrade
- [ ] Testing

**Día 9-10: Dashboard**
- [ ] Crear `app/components/Reports/LoyaltyDashboard.jsx`
- [ ] Métricas: activos, emitidos, canjeados
- [ ] Gráficas con Chart.js
- [ ] Top 10 clientes
- [ ] Tasa de redención
- [ ] Export XLSX
- [ ] Sprint Review
- [ ] Sprint Retrospective

### Definition of Done
- [x] Puntos acumulados automáticamente
- [x] Redención funcional
- [x] Tiers con beneficios diferenciados
- [x] Dashboard con métricas clave
- [x] WhatsApp notificaciones activas
- [x] Export de reportes

### Dependencias
- ✅ Sprint 1 completado (users)
- ✅ Sprint 2 completado (WhatsApp)

### Riesgos
- 🟢 **Bajo:** Cálculo incorrecto de puntos
- 🟢 **Bajo:** Edge cases en tiers

---

## 🎯 SPRINT 8: MercadoPago + Reports

**Duración:** Semana 17-18 (10 días)  
**Objetivo:** Pagos digitales y reportes avanzados  
**Story Points:** 32

### Historias Incluidas

- ✅ **US-8.1:** Setup MercadoPago SDK (3 SP)
- ✅ **US-8.2:** Botón de Pago MercadoPago (8 SP)
- ✅ **US-8.3:** Reconciliación de Pagos (5 SP)
- ✅ **US-11.1:** Executive Dashboard (8 SP)
- ✅ **US-11.2:** Reportes con Export (8 SP)

### Tasks Detalladas

**Día 1-2: MercadoPago Setup**
- [ ] Instalar SDK `mercadopago`
- [ ] Configurar credentials (sandbox y prod)
- [ ] Crear `server/services/mercadopagoService.js`
- [ ] Health check de credenciales
- [ ] Testing de conexión

**Día 3-5: Botón de Pago**
- [ ] Crear migration 010_mercadopago_payments.sql
- [ ] Crear `app/components/Payment/MercadoPagoButton.jsx`
- [ ] Generar QR para punto de venta
- [ ] Generar link para delivery
- [ ] Polling de status
- [ ] Webhook handler
- [ ] Actualizar ticket al confirmar
- [ ] Testing end-to-end

**Día 6: Reconciliación**
- [ ] Guardar responses en DB
- [ ] Reporte de pagos por status
- [ ] Match con tickets
- [ ] Identificar discrepancias
- [ ] Export XLSX
- [ ] Testing

**Día 7-8: Executive Dashboard**
- [ ] Instalar Chart.js y react-chartjs-2
- [ ] Crear `app/components/Reports/ExecutiveDashboard.jsx`
- [ ] KPIs: ventas, tickets, ticket promedio
- [ ] Gráficas: ventas por día, por categoría, por método de pago
- [ ] Comparativas period-over-period
- [ ] Testing

**Día 9-10: Export de Reportes**
- [ ] Instalar jspdf, jspdf-autotable, xlsx
- [ ] Crear `app/components/Reports/SalesReports.jsx`
- [ ] Filtros avanzados
- [ ] Export a PDF
- [ ] Export a XLSX
- [ ] Testing
- [ ] Sprint Review
- [ ] Sprint Retrospective

### Definition of Done
- [x] Pagos con MercadoPago funcionales
- [x] QR generado correctamente
- [x] Webhook recibiendo notificaciones
- [x] Reconciliación precisa
- [x] Dashboard con métricas en tiempo real
- [x] Exports funcionando

### Dependencias
- ✅ Sprint 0 completado
- ✅ Cuenta MercadoPago activa

### Riesgos
- 🟡 **Medio:** Webhook delays de MercadoPago
- 🟢 **Bajo:** Discrepancias en reconciliación

---

## 🎯 SPRINT 9: Image Management + Misc

**Duración:** Semana 19-20 (10 días)  
**Objetivo:** Gestión de imágenes y features pendientes  
**Story Points:** 24

### Historias Incluidas

- ✅ **US-12.1:** Image Upload Service (8 SP)
- ✅ **US-12.2:** Image Optimization (5 SP)
- ✅ **US-12.3:** Image Gallery UI (5 SP)
- ✅ **US-5.4:** Delivery Proof (6 SP)

### Tasks Detalladas

**Día 1-3: Upload Service**
- [ ] Instalar multer y sharp
- [ ] Crear migration 011_product_images.sql
- [ ] Crear `server/routes/upload.routes.js`
- [ ] Crear `server/services/imageOptimizationService.js`
- [ ] Storage config (local o S3)
- [ ] Validación de tipos y tamaños
- [ ] Testing de upload

**Día 4-5: Optimization**
- [ ] Resize con sharp (thumbnail, medium, original)
- [ ] Compresión optimizada
- [ ] Formatos WebP
- [ ] Lazy loading en frontend
- [ ] CDN integration (opcional)
- [ ] Testing de performance

**Día 6-7: Gallery UI**
- [ ] Crear `app/components/Products/ImageUploader.jsx`
- [ ] Crear `app/components/Products/ImageGallery.jsx`
- [ ] Drag & drop upload
- [ ] Preview de imágenes
- [ ] Crop y edit básico
- [ ] Asignar a productos
- [ ] Testing

**Día 8-10: Delivery Proof**
- [ ] Crear migration 012_delivery_proofs.sql
- [ ] Crear `app/components/Delivery/DeliveryProof.jsx`
- [ ] Captura de foto con camera API
- [ ] Firma con react-signature-canvas
- [ ] GPS automático
- [ ] Comentarios
- [ ] Guardar en DB
- [ ] Testing
- [ ] Sprint Review
- [ ] Sprint Retrospective

### Definition of Done
- [x] Upload de imágenes funcional
- [x] Optimización automática
- [x] Gallery UI intuitiva
- [x] Delivery proof capturado correctamente
- [x] Performance mejorada con WebP
- [x] Storage funcionando

### Dependencias
- ✅ Sprint 0 completado
- ✅ Sprint 4 completado (Delivery)

### Riesgos
- 🟡 **Medio:** Storage capacity (si local)
- 🟢 **Bajo:** Formatos incompatibles

---

## 🎯 SPRINT 10: Performance Optimization

**Duración:** Semana 21-22 (10 días)  
**Objetivo:** Optimizar rendimiento de la app  
**Story Points:** 30

### Historias Incluidas

- ✅ **US-13.1:** Code Splitting (8 SP)
- ✅ **US-13.2:** Virtualización de Listas (8 SP)
- ✅ **US-13.3:** Bundle Optimization (5 SP)
- ✅ **US-13.4:** API Response Caching (5 SP)
- ✅ **US-13.5:** Database Query Optimization (4 SP)

### Tasks Detalladas

**Día 1-3: Code Splitting**
- [ ] Implementar React.lazy en rutas
- [ ] Suspense con Loading fallbacks
- [ ] Split por modo (Mesas, Mostrador, Delivery)
- [ ] Prefetch de chunks críticos
- [ ] Testing de load times
- [ ] Bundle analyzer

**Día 4-5: Virtualización**
- [ ] Instalar react-window o react-virtualized
- [ ] Virtualizar lista de productos en Menu
- [ ] Virtualizar lista de tickets
- [ ] Virtualizar DataGrids
- [ ] Testing con >1000 items

**Día 6-7: Bundle Optimization**
- [ ] Tree shaking aggressive
- [ ] Remover dependencies no usadas
- [ ] Comprimir assets
- [ ] Optimizar webpack config
- [ ] Lighthouse audit
- [ ] Target: <3s Time to Interactive

**Día 8-9: API Caching**
- [ ] Implementar Redis (opcional)
- [ ] Cache en dataManager mejorado
- [ ] Stale-while-revalidate strategy
- [ ] Cache headers HTTP
- [ ] Testing de hit rate

**Día 10: DB Optimization**
- [ ] Analizar slow queries con EXPLAIN
- [ ] Agregar índices faltantes
- [ ] Optimizar joins
- [ ] Connection pooling tuning
- [ ] Sprint Review
- [ ] Sprint Retrospective

### Definition of Done
- [x] Bundles <500KB gzipped
- [x] Time to Interactive <3s
- [x] Listas largas sin lag
- [x] Cache hit rate >70%
- [x] Queries <100ms
- [x] Lighthouse Performance >90

### Dependencias
- ✅ Todos los sprints anteriores (para optimizar código existente)

### Riesgos
- 🟢 **Bajo:** Regresiones en funcionalidad
- 🟢 **Bajo:** Over-optimization premature

---

## 🎯 SPRINT 11: UI/UX Polish

**Duración:** Semana 23-24 (10 días)  
**Objetivo:** Pulir diseño y experiencia de usuario  
**Story Points:** 28

### Historias Incluidas

- ✅ **US-14.1:** Tema Extendido (5 SP)
- ✅ **US-14.2:** Animaciones y Transiciones (8 SP)
- ✅ **US-14.3:** Componentes Shared Avanzados (5 SP)
- ✅ **US-14.4:** Responsive Improvements (5 SP)
- ✅ **US-14.5:** Accessibility (5 SP)

### Tasks Detalladas

**Día 1-2: Tema Extendido**
- [ ] Paleta delivery (pending→delivered colors)
- [ ] Paleta loyalty (bronze→platinum)
- [ ] Breakpoints custom
- [ ] Gradients system
- [ ] Typography variants custom
- [ ] Component overrides avanzados
- [ ] Dark map styles
- [ ] Glassmorphism effects
- [ ] Testing visual

**Día 3-5: Animaciones**
- [ ] Instalar framer-motion
- [ ] Page transitions
- [ ] Modal animations
- [ ] List item animations
- [ ] Micro-interactions (hover, focus)
- [ ] Loading states animados
- [ ] Skeleton screens
- [ ] Testing de performance

**Día 6-7: Shared Components**
- [ ] Crear `EmptyState.jsx` con ilustraciones
- [ ] Crear `LoadingStates.jsx` skeletons
- [ ] Crear `BottomNav.jsx` para móvil
- [ ] Crear `OptimizedImage.jsx`
- [ ] Refactorizar componentes existentes
- [ ] Testing

**Día 8-9: Responsive**
- [ ] Audit de breakpoints
- [ ] Mejoras en tablet (768-1024px)
- [ ] Mejoras en mobile SM (<375px)
- [ ] Touch targets >44px
- [ ] Swipe gestures
- [ ] Testing en devices reales

**Día 10: Accessibility**
- [ ] ARIA labels completos
- [ ] Keyboard navigation
- [ ] Screen reader testing
- [ ] Color contrast >4.5:1
- [ ] Focus indicators
- [ ] Lighthouse Accessibility >90
- [ ] Sprint Review
- [ ] Sprint Retrospective

### Definition of Done
- [x] Tema consistente en toda la app
- [x] Animaciones suaves (60fps)
- [x] Componentes reutilizables documentados
- [x] App responsive en todos los devices
- [x] Lighthouse Accessibility >90
- [x] Demo visual impresionante

### Dependencias
- ✅ Todos los features completos

### Riesgos
- 🟢 **Bajo:** Animaciones afectan performance
- 🟢 **Bajo:** Over-design

---

## 🎯 SPRINT 12: Testing & Bug Fixes

**Duración:** Semana 25-26 (10 días)  
**Objetivo:** Testing exhaustivo y corrección de bugs  
**Story Points:** 35

### Historias Incluidas

- ✅ **US-15.1:** Unit Tests (10 SP)
- ✅ **US-15.2:** Integration Tests (10 SP)
- ✅ **US-15.3:** E2E Tests con Cypress (10 SP)
- ✅ **US-15.4:** Bug Fixing (5 SP)

### Tasks Detalladas

**Día 1-3: Unit Tests**
- [ ] Instalar Jest y React Testing Library
- [ ] Tests para services (>80% coverage)
- [ ] Tests para utils
- [ ] Tests para hooks
- [ ] Tests para Redux actions/reducers
- [ ] CI integration
- [ ] Coverage report

**Día 4-6: Integration Tests**
- [ ] Tests de componentes con mock data
- [ ] Tests de flows completos
- [ ] Tests de error handling
- [ ] Tests de edge cases
- [ ] API mocking con MSW

**Día 7-9: E2E Tests**
- [ ] Setup Cypress
- [ ] Tests de login
- [ ] Tests de crear orden (mesas, mostrador, delivery)
- [ ] Tests de pagos
- [ ] Tests de reportes
- [ ] Tests de admin panel
- [ ] CI integration
- [ ] Video recording de tests

**Día 10: Bug Fixing**
- [ ] Revisar backlog de bugs
- [ ] Priorizar por severidad
- [ ] Fix de bugs críticos
- [ ] Regression testing
- [ ] Sprint Review
- [ ] Sprint Retrospective

### Definition of Done
- [x] Unit test coverage >80%
- [x] Integration tests >50 scenarios
- [x] E2E tests >30 critical paths
- [x] CI pipeline verde
- [x] Zero bugs críticos
- [x] Todos los tests pasando

### Dependencias
- ✅ Todos los features completos

### Riesgos
- 🟡 **Medio:** Tests flaky en CI
- 🟢 **Bajo:** Coverage insuficiente

---

## 🎯 SPRINT 13: Final Polish + Deploy

**Duración:** Semana 27-28 (10 días)  
**Objetivo:** Preparación para producción  
**Story Points:** 20

### Historias Incluidas

- ✅ **US-Deploy-1:** Production Setup (5 SP)
- ✅ **US-Deploy-2:** Monitoring & Logging (5 SP)
- ✅ **US-Deploy-3:** Documentation (5 SP)
- ✅ **US-Deploy-4:** Training Materials (5 SP)

### Tasks Detalladas

**Día 1-2: Production Setup**
- [ ] Configurar ambiente de producción
- [ ] SSL certificates
- [ ] Domain setup
- [ ] Environment variables
- [ ] Database backup strategy
- [ ] CDN para assets
- [ ] Load balancer (opcional)

**Día 3-4: Monitoring**
- [ ] Setup Sentry para error tracking
- [ ] Setup Google Analytics
- [ ] Winston logging en producción
- [ ] Health checks endpoints
- [ ] Alertas críticas (email/SMS)
- [ ] Dashboards de monitoreo

**Día 5-7: Documentation**
- [ ] API documentation completa (Swagger)
- [ ] User manual en español
- [ ] Admin guide
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] FAQ

**Día 8-10: Training**
- [ ] Video tutorials para usuarios
- [ ] Video tutorials para admins
- [ ] Capacitación presencial
- [ ] Q&A session
- [ ] Sprint Review Final
- [ ] Retrospectiva del Proyecto Completo
- [ ] 🎉 **LAUNCH TO PRODUCTION**

### Definition of Done
- [x] App desplegada en producción
- [x] Monitoring activo
- [x] Documentación completa
- [x] Usuarios capacitados
- [x] Zero issues críticos
- [x] Celebración del equipo 🎊

### Dependencias
- ✅ Todos los sprints anteriores completados
- ✅ Ambiente de producción listo

### Riesgos
- 🟡 **Medio:** Issues inesperados en producción
- 🟢 **Bajo:** Usuarios no capacitados

---

## 📊 MÉTRICAS Y KPIs

### Velocity Tracking

| Sprint | Planned SP | Completed SP | Velocity | Carry Over |
|--------|-----------|--------------|----------|------------|
| Sprint 0 | 18 | - | - | - |
| Sprint 1 | 34 | - | - | - |
| Sprint 2 | 34 | - | - | - |
| ... | ... | ... | ... | ... |

### Burn-down Chart

```
SP
416│
   │ ╲
350│  ╲___
   │      ╲___
250│          ╲___
   │              ╲___
150│                  ╲___
   │                      ╲___
 50│                          ╲___
  0└──────────────────────────────────▶ Sprints
    0  1  2  3  4  5  6  7  8  9 10 11 12 13
```

---

## 🚨 GESTIÓN DE RIESGOS

### Mitigación de Riesgos por Sprint

**Sprint 2 - WhatsApp Baileys:**
- **Riesgo:** Ban de número
- **Mitigación:** Usar número de prueba inicialmente, respetar rate limits

**Sprint 3 - Google Maps Costos:**
- **Riesgo:** Gastos >$100/mes
- **Mitigación:** Alertas de billing, cache agresivo, quota limits

**Sprint 5 - PWA en iOS:**
- **Riesgo:** Limitaciones de Safari
- **Mitigación:** Testing temprano en iOS, graceful degradation

---

## 📅 HITOS CLAVE

- **Fin Sprint 1 (Sem 4):** Base de datos y RBAC funcional
- **Fin Sprint 3 (Sem 8):** Delivery con Maps básico
- **Fin Sprint 5 (Sem 12):** App instalable offline
- **Fin Sprint 8 (Sem 18):** Pagos digitales y reportes
- **Fin Sprint 11 (Sem 24):** UI completamente pulida
- **Fin Sprint 13 (Sem 28):** 🚀 **LANZAMIENTO A PRODUCCIÓN**

---

**Documento generado:** 1 de Diciembre de 2025  
**Última actualización:** Pendiente (al iniciar Sprint 0)  
**Próxima revisión:** Fin de cada sprint
