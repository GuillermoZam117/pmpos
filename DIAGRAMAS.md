# 🎨 DIAGRAMAS Y ARQUITECTURA - PMPOS

**Fecha:** 1 de Diciembre de 2025  
**Versión:** 2.5.6

---

## 📑 ÍNDICE

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Jerarquía de Componentes](#jerarquía-de-componentes)
3. [Flujo de Datos](#flujo-de-datos)
4. [Database Schema](#database-schema)
5. [Flujo de Delivery](#flujo-de-delivery)
6. [Flujo de WhatsApp Bot](#flujo-de-whatsapp-bot)
7. [Flujo de Autenticación](#flujo-de-autenticación)
8. [Flujo de Pagos](#flujo-de-pagos)

---

## Arquitectura del Sistema

### Arquitectura Actual

```mermaid
graph TB
    subgraph "Frontend - React 17"
        UI[UI Components]
        Redux[Redux Store]
        Services[Services Layer]
    end
    
    subgraph "Backend - Express"
        API[REST API]
        ReadService[Read Service MSSQL]
    end
    
    subgraph "Externo"
        SambaPOS[(SambaPOS MSSQL)]
        SignalR[SignalR Hub]
    end
    
    UI --> Redux
    Redux --> Services
    Services --> API
    API --> ReadService
    ReadService --> SambaPOS
    Services --> SignalR
    
    style UI fill:#42a5f5
    style Redux fill:#66bb6a
    style SambaPOS fill:#ef5350
```

### Arquitectura Objetivo (Target)

```mermaid
graph TB
    subgraph "Frontend PWA"
        UI[UI Components]
        Redux[Redux + Immutable]
        FrontServices[Services Layer]
        SW[Service Worker]
        IDB[(IndexedDB)]
    end
    
    subgraph "Backend Services"
        API[REST API]
        GraphQL[GraphQL Proxy]
        ReadService[Read Service MSSQL]
        WS[WebSocket Server]
    end
    
    subgraph "Base de Datos Propia"
        PG[(PostgreSQL)]
    end
    
    subgraph "Servicios Externos"
        SambaPOS[(SambaPOS MSSQL)]
        SignalR[SignalR Hub]
        WhatsApp[WhatsApp Baileys]
        Maps[Google Maps APIs]
        MP[MercadoPago API]
    end
    
    UI --> Redux
    Redux --> FrontServices
    FrontServices --> SW
    SW --> IDB
    FrontServices --> API
    FrontServices --> WS
    
    API --> PG
    API --> ReadService
    API --> WhatsApp
    API --> Maps
    API --> MP
    
    ReadService --> SambaPOS
    GraphQL --> SambaPOS
    FrontServices --> SignalR
    
    WhatsApp -.->|Notificaciones| UI
    WS -.->|Real-time| UI
    
    style UI fill:#42a5f5
    style PG fill:#4caf50
    style WhatsApp fill:#25d366
    style Maps fill:#ea4335
    style MP fill:#009ee3
```

---

## Jerarquía de Componentes

### Estructura Completa de Componentes

```mermaid
graph TD
    App[App.jsx]
    
    App --> Router[React Router]
    App --> Theme[ThemeProvider]
    App --> Redux[Redux Provider]
    
    Router --> Login[Login/PinPad]
    Router --> Dashboard[SalesModeDashboard]
    Router --> Tables[TableView]
    Router --> POS[POSViewMobile]
    Router --> Admin[Admin Panel]
    Router --> Reports[Reports]
    Router --> Settings[Settings]
    Router --> PublicTracking[DeliveryTracking Público]
    
    Dashboard --> QuickSale[QuickSaleGrid]
    Dashboard --> DeliveryWizard[Delivery Wizard]
    Dashboard --> DeliveryList[Lista de Deliveries]
    
    DeliveryList --> DeliveryMap[DeliveryMapView]
    DeliveryList --> DriverAssign[DriverAssignment]
    
    Tables --> TableCard[TableCard x N]
    
    POS --> Menu[Menu]
    POS --> Cart[Cart/Orders]
    POS --> Payment[PaymentProcessor]
    
    Menu --> MenuItem[MenuItem x N]
    Menu --> Categories[Category Tabs]
    
    Payment --> CashPayment[Cash Input]
    Payment --> CardPayment[Card Input]
    Payment --> MPPayment[MercadoPago Button]
    Payment --> LoyaltyReward[Rewards Dialog]
    
    Admin --> UserMgmt[UserManagement]
    Admin --> DriverMgmt[DriverManagement]
    Admin --> ZonesEditor[DeliveryZonesEditor]
    Admin --> WhatsAppConfig[WhatsAppSettings]
    
    Settings --> GeneralSettings[General]
    Settings --> MapsSettings[Google Maps]
    Settings --> PaymentSettings[Payment Methods]
    Settings --> LoyaltySettings[Loyalty Config]
    
    Reports --> ExecutiveDash[ExecutiveDashboard]
    Reports --> SalesReports[SalesReports]
    Reports --> DeliveryMetrics[DeliveryMetrics]
    Reports --> LoyaltyDash[LoyaltyDashboard]
    
    style App fill:#1976d2
    style Dashboard fill:#42a5f5
    style POS fill:#66bb6a
    style Admin fill:#ffa726
    style Reports fill:#ab47bc
```

---

## Flujo de Datos

### Redux State Flow

```mermaid
graph LR
    Component[Component]
    Action[Action Creator]
    Reducer[Reducer]
    Store[Redux Store]
    Service[Service]
    API[Backend API]
    
    Component -->|dispatch| Action
    Action -->|calls| Service
    Service -->|HTTP/GraphQL| API
    API -->|response| Service
    Service -->|dispatch| Action
    Action -->|type + payload| Reducer
    Reducer -->|new state| Store
    Store -->|subscribe| Component
    
    style Component fill:#42a5f5
    style Store fill:#66bb6a
    style Service fill:#ffa726
```

### DataManager Cache Flow

```mermaid
sequenceDiagram
    participant UI
    participant DataManager
    participant Cache
    participant GraphQL
    participant SignalR
    
    UI->>DataManager: loadTables()
    DataManager->>Cache: check cache
    
    alt Cache Hit
        Cache-->>DataManager: return cached data
        DataManager-->>UI: render tables
    else Cache Miss
        DataManager->>GraphQL: query getEntityScreens
        GraphQL-->>DataManager: tables data
        DataManager->>Cache: store in cache
        DataManager-->>UI: render tables
    end
    
    SignalR->>DataManager: update event
    DataManager->>Cache: invalidate
    DataManager->>UI: trigger refresh
```

---

## Database Schema

### Schema Completo PostgreSQL

```mermaid
erDiagram
    users ||--o{ user_roles : has
    users ||--o{ shifts : opens
    users ||--o{ drivers : is
    users ||--o{ loyalty_transactions : processes
    
    roles ||--o{ user_roles : assigned_to
    roles ||--o{ role_permissions : has
    permissions ||--o{ role_permissions : belongs_to
    
    users {
        int id PK
        int sambapos_user_id
        string pin
        string name
        string email
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    roles {
        int id PK
        string name
        string description
        boolean is_active
    }
    
    permissions {
        int id PK
        string resource
        string action
        string description
    }
    
    user_roles {
        int user_id FK
        int role_id FK
        timestamp assigned_at
    }
    
    role_permissions {
        int role_id FK
        int permission_id FK
    }
    
    drivers {
        int id PK
        int user_id FK
        string vehicle_type
        string plate
        boolean is_available
        point current_location
        timestamp created_at
    }
    
    shifts {
        int id PK
        int user_id FK
        timestamp opened_at
        timestamp closed_at
        decimal opening_balance
        decimal closing_balance
        decimal expected_cash
        decimal actual_cash
        decimal difference
        string notes
    }
    
    customer_loyalty ||--o{ loyalty_transactions : has
    customer_loyalty {
        int id PK
        int sambapos_entity_id FK
        int points_balance
        string tier
        timestamp joined_at
        timestamp updated_at
    }
    
    loyalty_transactions {
        int id PK
        int customer_id FK
        int ticket_id
        int points
        string type
        int processed_by FK
        timestamp created_at
    }
    
    loyalty_rewards {
        int id PK
        string name
        int points_cost
        decimal discount_amount
        string discount_type
        boolean is_active
        timestamp created_at
    }
    
    delivery_zones {
        int id PK
        string name
        jsonb polygon
        decimal fee
        int estimated_time_minutes
        boolean is_active
        timestamp created_at
    }
    
    delivery_proofs {
        int id PK
        int ticket_id
        string photo_url
        text signature_data
        point gps_location
        text notes
        timestamp created_at
    }
    
    delivery_ratings {
        int id PK
        int ticket_id
        int rating
        text comment
        timestamp created_at
    }
    
    mercadopago_payments {
        int id PK
        string payment_id
        int ticket_id
        decimal amount
        string status
        jsonb mp_response
        timestamp created_at
        timestamp updated_at
    }
    
    whatsapp_conversations {
        int id PK
        string phone_number
        int customer_id FK
        string last_message
        timestamp last_message_at
        timestamp created_at
    }
    
    whatsapp_messages {
        int id PK
        int conversation_id FK
        string message_id
        string from_number
        string to_number
        text body
        string direction
        timestamp created_at
    }
    
    whatsapp_templates {
        int id PK
        string name
        string event_type
        text template
        boolean is_active
        timestamp created_at
    }
    
    kitchen_printers {
        int id PK
        string name
        string ip_address
        int port
        string printer_type
        jsonb categories
        boolean is_active
        timestamp created_at
    }
    
    kitchen_print_jobs {
        int id PK
        int printer_id FK
        int ticket_id
        int order_id
        string status
        int retry_count
        timestamp created_at
        timestamp printed_at
    }
    
    product_images {
        int id PK
        int sambapos_menu_item_id
        string original_url
        string thumbnail_url
        string medium_url
        int size_bytes
        timestamp created_at
    }
    
    schema_migrations {
        int version PK
        string name
        timestamp executed_at
    }
```

---

## Flujo de Delivery

### Estados y Transiciones

```mermaid
stateDiagram-v2
    [*] --> NUEVO
    NUEVO --> PREPARANDO: Aceptar pedido
    PREPARANDO --> LISTO: Marcar listo
    LISTO --> EN_RUTA: Asignar driver
    EN_RUTA --> ENTREGADO: Confirmar entrega
    ENTREGADO --> PAGADO: Registrar pago
    PAGADO --> [*]
    
    NUEVO --> CANCELADO: Cancelar
    PREPARANDO --> CANCELADO: Cancelar
    CANCELADO --> [*]
    
    note right of PREPARANDO
        WhatsApp: "Tu pedido está siendo preparado"
    end note
    
    note right of LISTO
        WhatsApp: "Tu pedido está listo"
    end note
    
    note right of EN_RUTA
        WhatsApp: "Tu pedido va en camino"
        + Link de tracking
    end note
    
    note right of ENTREGADO
        WhatsApp: "Tu pedido fue entregado"
        + Link para calificar
    end note
```

### Flujo Completo de Delivery

```mermaid
sequenceDiagram
    participant Cliente
    participant UI
    participant Backend
    participant DeliveryService
    participant MapsAPI
    participant WhatsApp
    participant Driver
    
    Cliente->>UI: Solicita delivery
    UI->>UI: AddressAutocomplete
    UI->>MapsAPI: Geocode dirección
    MapsAPI-->>UI: lat/lng
    UI->>Backend: Calcular fee
    Backend->>MapsAPI: Distance Matrix
    MapsAPI-->>Backend: Distancia
    Backend-->>UI: Fee calculado
    UI->>Backend: Crear delivery
    Backend->>DeliveryService: Crear ticket
    DeliveryService-->>Backend: Ticket ID
    Backend->>WhatsApp: Notif: Pedido confirmado
    WhatsApp-->>Cliente: Mensaje
    
    Backend->>Driver: Auto-asignar
    Backend->>WhatsApp: Notif: En camino
    WhatsApp-->>Cliente: Mensaje + tracking link
    
    Driver->>Backend: Update posición GPS
    Backend->>UI: WebSocket update
    UI-->>Cliente: Mapa en tiempo real
    
    Driver->>Backend: Entregado + prueba
    Backend->>DeliveryService: Update estado
    Backend->>WhatsApp: Notif: Entregado + rating link
    WhatsApp-->>Cliente: Mensaje
    
    Cliente->>UI: Calificar entrega
    UI->>Backend: Submit rating
    Backend-->>UI: Gracias
```

---

## Flujo de WhatsApp Bot

### Arquitectura del Bot

```mermaid
graph TB
    subgraph "WhatsApp Bot Service"
        Baileys[Baileys Client]
        Auth[Auth Handler]
        Session[Session Store]
        MsgHandler[Message Handler]
        CmdParser[Command Parser]
    end
    
    subgraph "Handlers"
        StatusCmd[/estado Handler]
        MenuCmd[/menu Handler]
        PedidoCmd[/pedido Handler]
        DefaultH[Default Handler]
    end
    
    subgraph "Notification Service"
        Templates[Template Engine]
        Queue[Send Queue]
        Retry[Retry Logic]
    end
    
    subgraph "Database"
        Conversations[(Conversations)]
        Messages[(Messages)]
        TemplatesDB[(Templates)]
    end
    
    WhatsApp[WhatsApp Servers] --> Baileys
    Baileys --> Auth
    Auth --> Session
    Baileys --> MsgHandler
    MsgHandler --> CmdParser
    
    CmdParser --> StatusCmd
    CmdParser --> MenuCmd
    CmdParser --> PedidoCmd
    CmdParser --> DefaultH
    
    StatusCmd --> Conversations
    MenuCmd --> Messages
    PedidoCmd --> Messages
    
    Templates --> TemplatesDB
    Queue --> Baileys
    Retry --> Queue
    
    DeliveryService[Delivery Service] --> Templates
    LoyaltyService[Loyalty Service] --> Templates
    OrderService[Order Service] --> Templates
    
    Templates --> Queue
    
    style Baileys fill:#25d366
    style Templates fill:#42a5f5
```

### Flujo de Comando `/estado`

```mermaid
sequenceDiagram
    participant Cliente
    participant WhatsApp
    participant Bot
    participant DB
    participant SambaPOS
    
    Cliente->>WhatsApp: /estado 12345
    WhatsApp->>Bot: Message event
    Bot->>Bot: Parse command
    Bot->>DB: Find conversation
    DB-->>Bot: Conversation data
    Bot->>SambaPOS: Query ticket 12345
    SambaPOS-->>Bot: Ticket details
    Bot->>Bot: Format response
    Bot->>WhatsApp: Send message
    WhatsApp->>Cliente: "Tu pedido está EN RUTA..."
    Bot->>DB: Save message log
```

---

## Flujo de Autenticación

### Login y JWT Flow

```mermaid
sequenceDiagram
    participant UI
    participant AuthService
    participant Backend
    participant SambaPOS
    participant PostgreSQL
    
    UI->>AuthService: login(pin)
    AuthService->>Backend: POST /api/auth/login
    Backend->>SambaPOS: Query user by PIN
    SambaPOS-->>Backend: User data
    Backend->>PostgreSQL: Get roles & permissions
    PostgreSQL-->>Backend: User roles
    Backend->>Backend: Generate JWT
    Backend-->>AuthService: JWT token + user
    AuthService->>AuthService: Store in localStorage
    AuthService-->>UI: Success
    UI->>UI: Redirect to dashboard
    
    Note over UI,Backend: Siguientes requests
    UI->>Backend: GET /api/tickets (+ JWT header)
    Backend->>Backend: Verify JWT
    Backend->>Backend: Check permission
    alt Authorized
        Backend-->>UI: Tickets data
    else Unauthorized
        Backend-->>UI: 403 Forbidden
    end
```

### RBAC Middleware Flow

```mermaid
graph LR
    Request[HTTP Request]
    Auth[Auth Middleware]
    RBAC[RBAC Middleware]
    Controller[Controller]
    
    Request --> Auth
    Auth -->|Valid JWT| RBAC
    Auth -->|Invalid| Reject401[401 Unauthorized]
    
    RBAC -->|Has Permission| Controller
    RBAC -->|No Permission| Reject403[403 Forbidden]
    
    Controller --> Response[Response]
    
    style Auth fill:#42a5f5
    style RBAC fill:#ffa726
    style Controller fill:#66bb6a
    style Reject401 fill:#ef5350
    style Reject403 fill:#ef5350
```

---

## Flujo de Pagos

### Payment Processing Flow

```mermaid
sequenceDiagram
    participant Cajero
    participant UI
    participant PaymentService
    participant Backend
    participant MercadoPago
    participant LoyaltyService
    participant SambaPOS
    
    Cajero->>UI: Selecciona método: MP
    UI->>PaymentService: processMercadoPago()
    PaymentService->>Backend: POST /api/mercadopago/create-payment
    Backend->>MercadoPago: Create payment
    MercadoPago-->>Backend: QR code + payment_id
    Backend-->>PaymentService: QR data
    PaymentService-->>UI: Mostrar QR
    
    UI->>UI: Poll status cada 5s
    
    Note over MercadoPago: Cliente escanea y paga
    
    MercadoPago->>Backend: Webhook: approved
    Backend->>Backend: Verify signature
    Backend->>Backend: Save in DB
    Backend->>LoyaltyService: Acumular puntos
    LoyaltyService-->>Backend: Puntos added
    Backend->>SambaPOS: Close ticket
    SambaPOS-->>Backend: Ticket closed
    Backend->>Backend: Send WhatsApp notif
    
    UI->>Backend: Poll: GET /api/mercadopago/status/:id
    Backend-->>UI: Status: approved
    UI->>UI: Mostrar success
    UI->>Cajero: Pago completado
```

### Loyalty Points Flow

```mermaid
graph TD
    TicketClosed[Ticket Cerrado]
    CalcPoints[Calcular Puntos]
    GetCustomer[Obtener Cliente]
    CheckTier[Verificar Tier]
    ApplyMultiplier[Aplicar Multiplicador]
    SavePoints[Guardar Puntos]
    CheckUpgrade[¿Upgrade Tier?]
    UpdateTier[Actualizar Tier]
    NotifyWA[Notificar WhatsApp]
    End[Fin]
    
    TicketClosed --> CalcPoints
    CalcPoints --> GetCustomer
    GetCustomer --> CheckTier
    CheckTier --> ApplyMultiplier
    ApplyMultiplier --> SavePoints
    SavePoints --> CheckUpgrade
    CheckUpgrade -->|Sí| UpdateTier
    CheckUpgrade -->|No| NotifyWA
    UpdateTier --> NotifyWA
    NotifyWA --> End
    
    style TicketClosed fill:#42a5f5
    style SavePoints fill:#66bb6a
    style UpdateTier fill:#ffa726
    style NotifyWA fill:#25d366
```

---

**Documento generado:** 1 de Diciembre de 2025  
**Próxima revisión:** Al completar Sprint 2
