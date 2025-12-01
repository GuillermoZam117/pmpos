# 📋 HISTORIAS DE USUARIO - PMPOS

**Fecha:** 1 de Diciembre de 2025  
**Versión:** 2.5.6

---

## 🎯 ÍNDICE DE EPICS

1. [Epic 1: Database & Infrastructure](#epic-1-database--infrastructure)
2. [Epic 2: RBAC y Gestión de Usuarios](#epic-2-rbac-y-gestión-de-usuarios)
3. [Epic 3: WhatsApp Bot Integration](#epic-3-whatsapp-bot-integration)
4. [Epic 4: Google Maps Integration](#epic-4-google-maps-integration)
5. [Epic 5: Delivery Avanzado](#epic-5-delivery-avanzado)
6. [Epic 6: PWA y Modo Offline](#epic-6-pwa-y-modo-offline)
7. [Epic 7: Sistema de Loyalty](#epic-7-sistema-de-loyalty)
8. [Epic 8: MercadoPago Integration](#epic-8-mercadopago-integration)
9. [Epic 9: Cash Register & Drawer](#epic-9-cash-register--drawer)
10. [Epic 10: Kitchen Printing](#epic-10-kitchen-printing)
11. [Epic 11: Reportes Avanzados](#epic-11-reportes-avanzados)
12. [Epic 12: Image Management](#epic-12-image-management)
13. [Epic 13: Performance Optimization](#epic-13-performance-optimization)
14. [Epic 14: UI/UX Polish](#epic-14-uiux-polish)
15. [Epic 15: Testing & QA](#epic-15-testing--qa)

---

## Epic 1: Database & Infrastructure

**Objetivo:** Establecer base de datos PostgreSQL propia con sistema de migraciones

### US-1.1: Setup PostgreSQL Database

**Como** desarrollador  
**Quiero** configurar PostgreSQL como base de datos secundaria  
**Para** almacenar datos propios independientes de SambaPOS

**Criterios de Aceptación:**
- ✅ PostgreSQL instalado en servidor OCI Ubuntu 24.04
- ✅ Pool de conexiones configurado en `server/config/database.js`
- ✅ Variables de entorno en `.env`: `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD`
- ✅ Health check endpoint `/api/health/postgres` retorna status
- ✅ Logs de conexión con winston

**Tasks:**
- Instalar `pg@^8.11.0` y `pg-pool@^3.6.0`
- Crear `server/config/database.js` con pool config
- Actualizar `server/.env.example` con variables PG
- Crear health check en `server/routes/health.routes.js`

**Story Points:** 3

---

### US-1.2: Sistema de Migraciones

**Como** desarrollador  
**Quiero** un sistema de migraciones SQL versionadas  
**Para** mantener schema consistente entre ambientes

**Criterios de Aceptación:**
- ✅ Tabla `schema_migrations` creada con (version, name, executed_at)
- ✅ Script `npm run migrate:up` ejecuta migraciones pendientes
- ✅ Script `npm run migrate:down` revierte última migración
- ✅ Script `npm run migrate:create <name>` genera archivo de migración
- ✅ Migraciones numeradas secuencialmente (001, 002, etc.)

**Tasks:**
- Crear `server/database/migrate.js` runner
- Crear `server/database/migrations/000_schema_migrations.sql`
- Agregar scripts en `server/package.json`
- Documentar en `server/database/README.md`

**Story Points:** 5

---

### US-1.3: Schema Inicial

**Como** desarrollador  
**Quiero** el schema base con tablas core  
**Para** soportar funcionalidades propias

**Criterios de Aceptación:**
- ✅ Tablas creadas: `users`, `roles`, `permissions`, `user_roles`
- ✅ Indices en foreign keys
- ✅ Constraints de integridad referencial
- ✅ Defaults y NOT NULL apropiados
- ✅ Campos `created_at`, `updated_at` en todas las tablas

**Tasks:**
- Crear `server/database/migrations/001_initial_schema.sql`
- Crear `server/database/schema.sql` (schema completo de referencia)
- Ejecutar migración en dev y staging

**Story Points:** 3

---

### US-1.4: Seeds de Desarrollo

**Como** desarrollador  
**Quiero** datos de prueba pre-cargados  
**Para** facilitar desarrollo local

**Criterios de Aceptación:**
- ✅ Script `npm run seed:dev` ejecuta seeds
- ✅ Roles predefinidos: admin, manager, cashier, waiter, driver
- ✅ Usuario admin default (pin: 9999)
- ✅ Usuarios de prueba para cada rol
- ✅ Seeds solo se ejecutan en ambientes dev/staging

**Tasks:**
- Crear `server/database/seeds/dev-data.sql`
- Crear `server/database/seed.js` runner
- Agregar check de NODE_ENV antes de ejecutar

**Story Points:** 2

---

## Epic 2: RBAC y Gestión de Usuarios

**Objetivo:** Sistema completo de roles y permisos

### US-2.1: Modelo de Datos RBAC

**Como** administrador  
**Quiero** definir roles y permisos granulares  
**Para** controlar acceso a funcionalidades

**Criterios de Aceptación:**
- ✅ Tabla `roles` con (id, name, description, is_active)
- ✅ Tabla `permissions` con (id, resource, action, description)
- ✅ Tabla `role_permissions` (role_id, permission_id)
- ✅ Tabla `user_roles` (user_id, role_id)
- ✅ 5 roles predefinidos insertados
- ✅ 50+ permisos definidos (tickets:create, orders:modify, reports:view, etc.)

**Tasks:**
- Crear migration `002_rbac_tables.sql`
- Crear seeds con roles y permisos
- Documentar matriz de permisos en `docs/RBAC_MATRIX.md`

**Story Points:** 5

---

### US-2.2: Middleware de Autorización

**Como** desarrollador  
**Quiero** middleware para proteger rutas  
**Para** validar permisos en backend

**Criterios de Aceptación:**
- ✅ Middleware `requireRole(['admin', 'manager'])`
- ✅ Middleware `requirePermission('tickets:create')`
- ✅ Retorna 403 Forbidden si no autorizado
- ✅ Logs de intentos de acceso no autorizados
- ✅ Usuario en `req.user` desde JWT

**Tasks:**
- Crear `server/middleware/auth.middleware.js`
- Crear `server/services/rbacService.js`
- Agregar middleware a rutas sensibles

**Story Points:** 5

---

### US-2.3: Sincronización Usuarios SambaPOS

**Como** sistema  
**Quiero** sincronizar usuarios de SambaPOS a PostgreSQL  
**Para** mantener consistencia

**Criterios de Aceptación:**
- ✅ Tabla `users` con campos: sambapos_user_id, pin, name, email, is_active
- ✅ Endpoint `/api/users/sync` obtiene users de GraphQL
- ✅ Inserta nuevos usuarios
- ✅ Actualiza usuarios existentes
- ✅ Marca usuarios eliminados como inactivos
- ✅ Sync automático cada 1 hora

**Tasks:**
- Crear `server/services/userSyncService.js`
- Crear endpoint en `server/controllers/users.controller.js`
- Configurar cron job con `node-cron`

**Story Points:** 8

---

### US-2.4: UI de Gestión de Usuarios

**Como** administrador  
**Quiero** UI para gestionar usuarios y roles  
**Para** asignar permisos sin tocar DB

**Criterios de Aceptación:**
- ✅ Componente `app/components/Admin/UserManagement.jsx`
- ✅ DataGrid con lista de usuarios
- ✅ Filtros por rol y estado
- ✅ Dialog para editar roles de usuario
- ✅ Checkboxes para roles múltiples
- ✅ Guardar cambios con confirmación
- ✅ Solo accesible para role admin

**Tasks:**
- Crear `UserManagement.jsx` con MUI DataGrid
- Crear `UserRolesDialog.jsx`
- Agregar ruta `/admin/users` protegida
- Crear endpoints GET/PUT en backend

**Story Points:** 8

---

## Epic 3: WhatsApp Bot Integration

**Objetivo:** Bot de WhatsApp para notificaciones y autogestión

### US-3.1: Setup Baileys Library

**Como** desarrollador  
**Quiero** integrar @whiskeysockets/baileys  
**Para** conectar WhatsApp sin API oficial

**Criterios de Aceptación:**
- ✅ Dependencia `@whiskeysockets/baileys@^7.1.0` instalada
- ✅ Servicio `server/services/whatsapp-bot.service.js` creado
- ✅ QR code generado en consola para auth
- ✅ Sesión persistida en `server/whatsapp-session/`
- ✅ Reconexión automática si se desconecta
- ✅ Logs con pino

**Tasks:**
- Instalar baileys, qrcode, qrcode-terminal, pino
- Portar código de FactJS `whatsapp-bot.service.ts`
- Crear `server/services/whatsapp-bot.service.js`
- Configurar auth handler y session store

**Story Points:** 8

---

### US-3.2: Webhook de Mensajes

**Como** bot  
**Quiero** recibir mensajes entrantes  
**Para** procesar comandos de clientes

**Criterios de Aceptación:**
- ✅ Handler para evento `messages.upsert`
- ✅ Guarda mensajes en tabla `whatsapp_messages`
- ✅ Identifica comandos: `/pedido`, `/estado`, `/menu`
- ✅ Ignora mensajes propios y de grupos
- ✅ Timeout de 5 min para responder

**Tasks:**
- Crear migration `003_whatsapp_tables.sql`
- Crear `server/services/whatsapp-message-handler.js`
- Implementar command parser
- Conectar con webhooks de Baileys

**Story Points:** 8

---

### US-3.3: Notificaciones de Delivery

**Como** cliente  
**Quiero** recibir notificaciones de mi pedido en WhatsApp  
**Para** estar informado del estado

**Criterios de Aceptación:**
- ✅ Mensaje cuando pedido es confirmado
- ✅ Mensaje cuando está listo para recoger
- ✅ Mensaje cuando sale a ruta con link de tracking
- ✅ Mensaje cuando es entregado
- ✅ Templates de mensajes en tabla `whatsapp_templates`
- ✅ Variables reemplazadas: {nombre}, {ticket}, {monto}, etc.

**Tasks:**
- Crear `server/services/whatsapp-notification.service.js`
- Crear templates en migration
- Integrar con deliveryService transitions
- Agregar config UI para enable/disable

**Story Points:** 8

---

### US-3.4: UI de Configuración WhatsApp

**Como** administrador  
**Quiero** configurar WhatsApp desde UI  
**Para** gestionar QR, templates y estado

**Criterios de Aceptación:**
- ✅ Componente `app/components/Settings/WhatsAppSettings.jsx`
- ✅ Muestra QR code para autenticación
- ✅ Estado de conexión (conectado/desconectado)
- ✅ Botón para desconectar sesión
- ✅ Lista de templates editables
- ✅ Toggle para habilitar/deshabilitar notificaciones por tipo

**Tasks:**
- Crear WhatsAppSettings.jsx
- Crear endpoint `/api/whatsapp/qr` (SSE)
- Crear endpoint `/api/whatsapp/status`
- Crear endpoints CRUD para templates

**Story Points:** 5

---

## Epic 4: Google Maps Integration

**Objetivo:** Integración completa de Google Maps para delivery

### US-4.1: Setup Google Maps API

**Como** desarrollador  
**Quiero** configurar Google Maps APIs  
**Para** usar servicios de mapas

**Criterios de Aceptación:**
- ✅ API Key guardada en variable de entorno `GOOGLE_MAPS_API_KEY`
- ✅ APIs habilitadas: Maps JavaScript, Places, Geocoding, Distance Matrix, Directions
- ✅ Restricciones de dominio configuradas
- ✅ Billing account activa con alertas
- ✅ Componente `GoogleMapsLoader` wrapper

**Tasks:**
- Instalar `@react-google-maps/api@^2.19.3`
- Crear `app/config/googleMapsConfig.js`
- Crear `app/components/Maps/GoogleMapsLoader.jsx`
- Documentar en `.env.example`

**Story Points:** 3

---

### US-4.2: DeliveryMapView Component

**Como** operador  
**Quiero** ver mapa con deliveries activos  
**Para** monitorear rutas en tiempo real

**Criterios de Aceptación:**
- ✅ Componente `DeliveryMapView.jsx` con GoogleMap
- ✅ Marcadores por cada delivery con color según estado
- ✅ InfoWindow al click muestra datos del pedido
- ✅ Cluster de marcadores cercanos
- ✅ Centro del mapa en coordenadas del restaurante
- ✅ Botón para centrar en delivery específico

**Tasks:**
- Crear `app/components/Delivery/DeliveryMapView.jsx`
- Usar `@react-google-maps/api` hooks
- Instalar `@googlemaps/markerclusterer@^2.5.0`
- Agregar custom marker icons por estado

**Story Points:** 8

---

### US-4.3: AddressAutocomplete Component

**Como** operador  
**Quiero** autocompletar direcciones  
**Para** capturar direcciones correctas rápidamente

**Criterios de Aceptación:**
- ✅ Componente `AddressAutocomplete.jsx` con Places Autocomplete
- ✅ Restricción a país México
- ✅ Al seleccionar dirección, extrae: street, number, colony, city, state, postal_code
- ✅ Geocoding para obtener lat/lng
- ✅ Validación de campos requeridos
- ✅ Integrado en wizard de nuevo delivery

**Tasks:**
- Crear `AddressAutocomplete.jsx` con `use-places-autocomplete`
- Instalar `use-places-autocomplete@^4.0.1`
- Crear parser de address_components
- Integrar en SalesModeDashboard wizard

**Story Points:** 8

---

### US-4.4: Cálculo de Delivery Fee

**Como** sistema  
**Quiero** calcular costo de envío automáticamente  
**Para** cobrar fee según distancia

**Criterios de Aceptación:**
- ✅ Servicio `deliveryCalculationService.js`
- ✅ Usa Distance Matrix API para calcular distancia
- ✅ Formula: fee = base_fee + (km * rate_per_km)
- ✅ Configuración en tabla `delivery_config`: base_fee, rate_per_km, max_distance
- ✅ Valida que distancia <= max_distance
- ✅ Cache de 5 min para misma dirección

**Tasks:**
- Crear `app/services/deliveryCalculationService.js`
- Crear migration `004_delivery_config.sql`
- Crear UI para config en Settings
- Integrar cálculo en wizard antes de confirmar

**Story Points:** 8

---

### US-4.5: Optimización de Rutas

**Como** dispatcher  
**Quiero** sugerir orden de entregas  
**Para** optimizar ruta del repartidor

**Criterios de Aceptación:**
- ✅ Servicio `routeOptimizationService.js`
- ✅ Usa Directions API con waypoints
- ✅ Ordena deliveries por menor tiempo total
- ✅ Considera ventanas de tiempo
- ✅ Muestra ruta en mapa con polyline
- ✅ Tiempo estimado total visible

**Tasks:**
- Crear `app/services/routeOptimizationService.js`
- Implementar algoritmo nearest neighbor
- Integrar DirectionsRenderer en DeliveryMapView
- Crear botón "Optimizar Ruta" en UI

**Story Points:** 13

---

### US-4.6: Delivery Zones Editor

**Como** administrador  
**Quiero** definir zonas de entrega  
**Para** asignar fees y validar cobertura

**Criterios de Aceptación:**
- ✅ Componente `DeliveryZonesEditor.jsx`
- ✅ Mapa con herramientas de dibujo (polygon)
- ✅ Guarda polígonos como GeoJSON en tabla `delivery_zones`
- ✅ Asigna fee y tiempo estimado por zona
- ✅ Validación si dirección cae dentro de zona
- ✅ Muestra zonas coloreadas en mapa

**Tasks:**
- Crear `app/components/Delivery/DeliveryZonesEditor.jsx`
- Usar DrawingManager de Google Maps
- Crear migration `005_delivery_zones.sql`
- Instalar `@turf/turf@^7.0.0` para validación point-in-polygon

**Story Points:** 13

---

## Epic 5: Delivery Avanzado

**Objetivo:** Completar módulo de delivery con tracking y gestión

### US-5.1: Driver Management

**Como** administrador  
**Quiero** gestionar repartidores  
**Para** asignar entregas

**Criterios de Aceptación:**
- ✅ Tabla `drivers` con (user_id, vehicle_type, plate, is_available, current_location)
- ✅ Componente `app/components/Admin/DriverManagement.jsx`
- ✅ Lista de drivers con estado online/offline
- ✅ Asignación de delivery a driver
- ✅ Driver puede marcar disponible/no disponible desde app
- ✅ Historial de entregas por driver

**Tasks:**
- Crear migration `006_drivers_table.sql`
- Crear endpoints CRUD `/api/drivers`
- Crear DriverManagement.jsx
- Agregar toggle de disponibilidad en UI móvil

**Story Points:** 8

---

### US-5.2: Driver Assignment

**Como** dispatcher  
**Quiero** asignar deliveries a drivers  
**Para** distribuir carga de trabajo

**Criterios de Aceptación:**
- ✅ Componente `DriverAssignment.jsx`
- ✅ Lista de drivers disponibles con carga actual
- ✅ Auto-asignación al driver con menos deliveries
- ✅ Reasignación manual posible
- ✅ Notificación al driver cuando se le asigna
- ✅ Actualiza estado delivery a EN RUTA

**Tasks:**
- Crear `app/components/Delivery/DriverAssignment.jsx`
- Agregar campo `driver_id` a tickets
- Crear lógica de auto-assign en deliveryService
- Integrar notificaciones push

**Story Points:** 8

---

### US-5.3: Delivery Tracking Real-time

**Como** cliente  
**Quiero** ver ubicación del repartidor  
**Para** saber cuándo llega mi pedido

**Criterios de Aceptación:**
- ✅ Página pública `/track/:ticketId` sin auth
- ✅ Mapa muestra ubicación actual del driver
- ✅ Polyline de ruta sugerida
- ✅ ETA actualizado cada minuto
- ✅ Estados del pedido visible
- ✅ WebSocket para updates de posición

**Tasks:**
- Crear `app/components/Public/DeliveryTracking.jsx`
- Crear endpoint público `/api/delivery/track/:id`
- Implementar WebSocket en server
- Driver app envía posición cada 30s

**Story Points:** 13

---

### US-5.4: Delivery Proof

**Como** driver  
**Quiero** capturar prueba de entrega  
**Para** confirmar recepción

**Criterios de Aceptación:**
- ✅ Componente `DeliveryProof.jsx`
- ✅ Captura foto de evidencia
- ✅ Firma del cliente en canvas
- ✅ Captura GPS automática
- ✅ Comentarios opcionales
- ✅ Guarda en tabla `delivery_proofs`

**Tasks:**
- Crear migration `007_delivery_proofs.sql`
- Crear `app/components/Delivery/DeliveryProof.jsx`
- Usar `react-signature-canvas` para firma
- Integrar con camera API del navegador

**Story Points:** 8

---

### US-5.5: Customer Rating

**Como** cliente  
**Quiero** calificar mi entrega  
**Para** dar feedback del servicio

**Criterios de Aceptación:**
- ✅ Link en WhatsApp post-entrega para calificar
- ✅ Página `/rate/:ticketId` con estrellas 1-5
- ✅ Comentario opcional
- ✅ Guarda en tabla `delivery_ratings`
- ✅ Muestra rating promedio por driver
- ✅ Dashboard de ratings en admin

**Tasks:**
- Crear migration `008_delivery_ratings.sql`
- Crear `app/components/Public/DeliveryRating.jsx`
- Crear endpoint POST `/api/delivery/rate`
- Agregar link en WhatsApp template

**Story Points:** 5

---

## Epic 6: PWA y Modo Offline

**Objetivo:** App instalable con funcionalidad offline

### US-6.1: Service Worker Setup

**Como** usuario  
**Quiero** instalar la app en mi dispositivo  
**Para** acceso rápido como app nativa

**Criterios de Aceptación:**
- ✅ Service worker registrado en `public/service-worker.js`
- ✅ Estrategias de cache: cache-first para assets, network-first para API
- ✅ Precache de bundles críticos
- ✅ Actualización automática de SW
- ✅ Prompt "Nueva versión disponible"

**Tasks:**
- Instalar `workbox-webpack-plugin@^7.0.0`
- Crear `public/service-worker.js` con Workbox
- Configurar en webpack.config.js
- Crear `app/components/UpdatePrompt.jsx`

**Story Points:** 8

---

### US-6.2: Offline Storage con IndexedDB

**Como** usuario offline  
**Quiero** crear órdenes sin conexión  
**Para** sincronizar cuando vuelva online

**Criterios de Aceptación:**
- ✅ Servicio `offlineService.js` con Dexie
- ✅ Stores: pendingOrders, pendingPayments, cachedMenu
- ✅ Queue de operaciones pendientes
- ✅ Sync automático al detectar online
- ✅ Indicador visual de items pendientes
- ✅ Resolución de conflictos

**Tasks:**
- Instalar `dexie@^3.2.0`
- Crear `app/services/offlineService.js`
- Definir schema de IndexedDB
- Crear sync queue con retry logic

**Story Points:** 13

---

### US-6.3: Offline Indicator

**Como** usuario  
**Quiero** ver claramente cuando estoy offline  
**Para** saber que mis acciones se sincronizarán después

**Criterios de Aceptación:**
- ✅ Componente `OfflineIndicator.jsx` tipo banner
- ✅ Aparece en top de la app cuando offline
- ✅ Muestra contador de operaciones pendientes
- ✅ Color: warning cuando offline, success cuando syncing
- ✅ Desaparece cuando online y queue vacía

**Tasks:**
- Crear `app/components/shared/OfflineIndicator.jsx`
- Crear hook `useNetworkStatus.js`
- Integrar en App.jsx
- Conectar con offlineService

**Story Points:** 3

---

### US-6.4: PWA Manifest Completo

**Como** usuario móvil  
**Quiero** iconos y configuración PWA completa  
**Para** experiencia de app instalada

**Criterios de Aceptación:**
- ✅ Manifest.json completo con name, short_name, icons, theme_color
- ✅ Icons en tamaños: 72, 96, 128, 144, 152, 192, 384, 512
- ✅ Splash screen configurado
- ✅ Display mode: standalone
- ✅ Start URL correcta
- ✅ Pasa Lighthouse PWA audit >90

**Tasks:**
- Generar icons con script `generate-pwa-icons.js`
- Completar `public/manifest.json`
- Agregar meta tags en index.html
- Ejecutar Lighthouse audit

**Story Points:** 3

---

## Epic 7: Sistema de Loyalty

**Objetivo:** Programa de lealtad con puntos y recompensas

### US-7.1: Acumulación de Puntos

**Como** cliente  
**Quiero** acumular puntos en mis compras  
**Para** obtener recompensas

**Criterios de Aceptación:**
- ✅ Tabla `customer_loyalty` con (customer_id, points_balance, tier, joined_at)
- ✅ Tabla `loyalty_transactions` con (customer_id, ticket_id, points, type, created_at)
- ✅ Configuración: 1 punto por cada $10 MXN
- ✅ Puntos se acumulan al cerrar ticket
- ✅ Registro automático de cliente en primera compra
- ✅ Notificación WhatsApp de puntos ganados

**Tasks:**
- Crear migration `009_loyalty_system.sql`
- Crear `server/services/loyaltyService.js`
- Integrar en paymentService al cerrar ticket
- Agregar template WhatsApp de puntos

**Story Points:** 8

---

### US-7.2: Redención de Puntos

**Como** cliente  
**Quiero** canjear puntos por descuentos  
**Para** ahorrar en mi compra

**Criterios de Aceptación:**
- ✅ Componente `RewardsDialog.jsx` muestra recompensas disponibles
- ✅ Catálogo en tabla `loyalty_rewards` con (name, points_cost, discount_amount, is_active)
- ✅ Validación de puntos suficientes
- ✅ Aplica descuento al ticket actual
- ✅ Resta puntos de balance
- ✅ Registra en loyalty_transactions con type='redemption'

**Tasks:**
- Crear `app/components/Loyalty/RewardsDialog.jsx`
- Crear endpoints GET /api/loyalty/rewards y POST /api/loyalty/redeem
- Integrar botón en PaymentProcessor
- Crear UI admin para gestionar rewards

**Story Points:** 8

---

### US-7.3: Tiers de Loyalty

**Como** cliente frecuente  
**Quiero** subir de nivel (Bronze→Silver→Gold→Platinum)  
**Para** obtener mejores beneficios

**Criterios de Aceptación:**
- ✅ Tiers definidos: Bronze (0-500pts), Silver (501-1500), Gold (1501-3000), Platinum (3001+)
- ✅ Beneficios por tier: Bronze 1x, Silver 1.2x, Gold 1.5x, Platinum 2x multiplier
- ✅ Auto-upgrade al alcanzar puntos requeridos
- ✅ CustomerLoyaltyCard muestra tier con badge
- ✅ Progreso visual a siguiente tier
- ✅ Notificación WhatsApp al subir de tier

**Tasks:**
- Agregar lógica de tiers en loyaltyService
- Crear `app/components/Loyalty/CustomerLoyaltyCard.jsx`
- Diseñar badges de tiers en theme
- Agregar template WhatsApp de upgrade

**Story Points:** 5

---

### US-7.4: Loyalty Dashboard

**Como** administrador  
**Quiero** ver métricas del programa  
**Para** evaluar efectividad

**Criterios de Aceptación:**
- ✅ Componente `LoyaltyDashboard.jsx`
- ✅ Métricas: clientes activos, puntos emitidos/canjeados, tier distribution
- ✅ Gráfica de acumulación mensual
- ✅ Top 10 clientes por puntos
- ✅ Tasa de redención %
- ✅ Export a XLSX

**Tasks:**
- Crear `app/components/Reports/LoyaltyDashboard.jsx`
- Crear endpoints de métricas
- Usar Chart.js para gráficas
- Integrar export con XLSX

**Story Points:** 8

---

## Epic 8: MercadoPago Integration

**Objetivo:** Pagos digitales con MercadoPago

### US-8.1: Setup MercadoPago SDK

**Como** desarrollador  
**Quiero** configurar SDK de MercadoPago  
**Para** procesar pagos

**Criterios de Aceptación:**
- ✅ Dependencia `mercadopago@^2.0.11` instalada
- ✅ Credentials en env: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`
- ✅ Servicio `mercadopagoService.js` inicializado
- ✅ Health check de credenciales
- ✅ Sandbox vs producción por env

**Tasks:**
- Instalar mercadopago SDK
- Crear `server/services/mercadopagoService.js`
- Configurar credentials en .env
- Crear test de conexión

**Story Points:** 3

---

### US-8.2: Botón de Pago MercadoPago

**Como** cajero  
**Quiero** ofrecer pago con MercadoPago  
**Para** cobrar con QR o link

**Criterios de Aceptación:**
- ✅ Componente `MercadoPagoButton.jsx` en PaymentProcessor
- ✅ Genera QR code para pago en punto de venta
- ✅ Genera link de pago para delivery
- ✅ Polling de status cada 5s hasta confirmar
- ✅ Webhook para notificación instantánea
- ✅ Actualiza ticket cuando pago confirmado

**Tasks:**
- Crear `app/components/Payment/MercadoPagoButton.jsx`
- Crear endpoint POST `/api/mercadopago/create-payment`
- Configurar webhook en MP dashboard
- Crear `server/controllers/mercadopago.controller.js`

**Story Points:** 8

---

### US-8.3: Reconciliación de Pagos

**Como** administrador  
**Quiero** reconciliar pagos de MercadoPago  
**Para** validar ingresos

**Criterios de Aceptación:**
- ✅ Tabla `mercadopago_payments` con (payment_id, ticket_id, amount, status, mp_response)
- ✅ Reporte de pagos con status: approved, pending, rejected
- ✅ Match de payments con tickets
- ✅ Identificación de discrepancias
- ✅ Export a XLSX

**Tasks:**
- Crear migration `010_mercadopago_payments.sql`
- Guardar response de MP en DB
- Crear reporte en UI
- Implementar lógica de reconciliación

**Story Points:** 5

---

---

**Total Story Points hasta aquí:** ~250  
**Continúa en sección 2...**


