# Esquema principal de SambaPOS extraído con sqlcmd

## Tablas y columnas relevantes

### Tickets
- Id: int
- LastUpdateTime: datetime
- TicketVersion: datetime
- TicketUid: nvarchar
- TicketNumber: nvarchar
- Date: datetime
- LastOrderDate: datetime
- LastPaymentDate: datetime
- PreOrder: bit
- IsClosed: bit
- IsLocked: bit
- RemainingAmount: decimal
- TotalAmount: decimal
- DepartmentId: int
- TerminalId: int
- TicketTypeId: int
- Note: nvarchar
- LastModifiedUserName: nvarchar
- TicketTags: nvarchar
- TicketStates: nvarchar
- TicketLogs: nvarchar
- LineSeparators: nvarchar
- ExchangeRate: decimal
- TaxIncluded: bit
- Name: nvarchar
- TransactionDocument_Id: int
- IsOpened: bit
- TotalAmountPreTax: decimal
- CreatedUserName: nvarchar

### Orders
- Id: int
- TicketId: int
- WarehouseId: int
- DepartmentId: int
- TerminalId: int
- MenuItemId: int
- MenuItemName: nvarchar
- PortionName: nvarchar
- Price: decimal
- Quantity: decimal
- PortionCount: int
- Locked: bit
- CalculatePrice: bit
- DecreaseInventory: bit
- IncreaseInventory: bit
- OrderNumber: int
- CreatingUserName: nvarchar
- CreatedDateTime: datetime
- LastUpdateDateTime: datetime
- AccountTransactionTypeId: int
- ProductTimerValueId: int
- GroupTagName: nvarchar
- GroupTagFormat: nvarchar
- Separator: nvarchar
- PriceTag: nvarchar
- Tag: nvarchar
- OrderUid: nvarchar
- Taxes: nvarchar
- OrderTags: nvarchar
- OrderStates: nvarchar
- DisablePortionSelection: bit

### OrderTags
- Id: int
- Name: nvarchar
- SortOrder: int
- OrderTagGroupId: int
- Price: decimal
- MenuItemId: int
- MaxQuantity: int
- Color: nvarchar
- Filter: nvarchar
- Description: nvarchar
- Rate: decimal
- Header: nvarchar
- Amount: decimal

### Payments
- Id: int
- TicketId: int
- PaymentTypeId: int
- DepartmentId: int
- Name: nvarchar
- Description: nvarchar
- Date: datetime
- AccountTransactionId: int
- Amount: decimal
- TenderedAmount: decimal
- UserId: int
- TerminalId: int
- ExchangeRate: decimal
- AccountTransaction_Id: int
- AccountTransaction_AccountTransactionDocumentId: int
- PaymentData: nvarchar
- CanAdjustTip: bit

### PaymentTypeMaps
- Id: int
- PaymentTypeId: int
- TerminalId: int
- DepartmentId: int
- UserRoleId: int
- TicketTypeId: int

### PaymentTypes
- Id: int
- SortOrder: int
- ButtonColor: nvarchar
- FontSize: int
- OrderStateName: nvarchar
- OrderStateValue: nvarchar
- ProcessorSettings: nvarchar
- ButtonHeader: nvarchar
- Name: nvarchar
- Account_Id: int
- AccountTransactionType_Id: int

### Terminals
- Id: int
- IsDefault: bit
- AutoLogout: bit
- ReportPrinterId: int
- TransactionPrinterId: int
- Name: nvarchar

### UserRoles
- Id: int
- IsAdmin: bit
- DepartmentId: int
- ManagementCommands: nvarchar
- Name: nvarchar

### Users
- Id: int
- PinCode: nvarchar
- Name: nvarchar
- UserRole_Id: int
- Password: nvarchar
- Terminal_Id: int
- SevenShiftsEmployeeId: int

### WorkPeriods
- Id: int
- StartDate: datetime
- EndDate: datetime
- StartDescription: nvarchar
- EndDescription: nvarchar
- Name: nvarchar
- WorkPeriodNumber: int
- StartById: int
- StartByName: nvarchar
- EndById: int
- EndByName: nvarchar

### AccountTransactionAccounts
- Id: int
- Name: nvarchar
- Description: nvarchar
- AccountTypeId: int
- AccountId: int
- AccountTransactionTypeId: int
- AccountTransactionDocumentId: int
- Balance: decimal
- LastUpdateTime: datetime

### AccountTransactionDocuments
- Id: int
- Name: nvarchar
- Date: datetime
- Description: nvarchar
- DocumentTypeId: int
- UserId: int
- TerminalId: int
- DepartmentId: int

### AccountTransactions
- Id: int
- Name: nvarchar
- Amount: decimal
- Date: datetime
- AccountTransactionTypeId: int
- SourceAccountId: int
- TargetAccountId: int
- DocumentId: int
- Description: nvarchar

### AccountTransactionValues
- Id: int
- AccountTransactionId: int
- Debit: decimal
- Credit: decimal
- Exchange: decimal

### AutomationCommands
- Id: int
- Name: nvarchar
- ButtonHeader: nvarchar
- Color: nvarchar
- Value: nvarchar
- AutomationCommandMapId: int
- SortOrder: int
- TerminalId: int
- DepartmentId: int

### Entities
- Id: int
- Name: nvarchar
- EntityTypeId: int
- CustomData: nvarchar

### EntityTypes
- Id: int
- Name: nvarchar
- EntityType: nvarchar
- CustomData: nvarchar

### InventoryDocuments
- Id: int
- Name: nvarchar
- Date: datetime
- Description: nvarchar
- UserId: int
- TerminalId: int
- DepartmentId: int

### InventoryItems
- Id: int
- Name: nvarchar
- GroupCode: nvarchar
- BaseUnit: nvarchar
- TransactionUnit: nvarchar
- Multiplier: decimal
- WarehouseId: int

### InventoryTransactions
- Id: int
- InventoryItem_Id: int
- Date: datetime
- Quantity: decimal
- Unit: nvarchar
- SourceWarehouseId: int
- TargetWarehouseId: int
- TotalPrice: decimal

### MenuItems
- Id: int
- Name: nvarchar
- GroupCode: nvarchar
- PortionName: nvarchar
- Price: decimal
- Tag: nvarchar
- Barcode: nvarchar
- CustomTags: nvarchar
- WarehouseId: int
- MenuItemType: int
- SortOrder: int

### MenuItemPriceDefinitions
- Id: int
- MenuItemId: int
- Price: decimal
- PriceTag: nvarchar
- PortionName: nvarchar
- MenuItemName: nvarchar

### MenuItemPortions
- Id: int
- MenuItemId: int
- Name: nvarchar
- Multiplier: decimal
- Price: decimal

### MenuItemTagGroups
- Id: int
- Name: nvarchar
- SortOrder: int
- MenuItemId: int
- Tag: nvarchar

### MenuItemTags
- Id: int
- MenuItemTagGroupId: int
- Name: nvarchar
- SortOrder: int
- Color: nvarchar
- Price: decimal

### OrderTagGroups
- Id: int
- Name: nvarchar
- SortOrder: int
- MenuItemId: int
- MaxQuantity: int
- Color: nvarchar
- Filter: nvarchar
- Description: nvarchar
- Rate: decimal
- Header: nvarchar

### Payments
- Id: int
- TicketId: int
- PaymentTypeId: int
- DepartmentId: int
- Name: nvarchar
- Description: nvarchar
- Date: datetime
- AccountTransactionId: int
- Amount: decimal
- TenderedAmount: decimal
- UserId: int
- TerminalId: int
- ExchangeRate: decimal
- AccountTransaction_Id: int
- AccountTransaction_AccountTransactionDocumentId: int
- PaymentData: nvarchar
- CanAdjustTip: bit

### ProductTimerValues
- Id: int
- OrderId: int
- StartTime: datetime
- EndTime: datetime
- Duration: int

### ScreenMenuItems
- Id: int
- ScreenMenuCategoryId: int
- MenuItemId: int
- Name: nvarchar
- ButtonColor: nvarchar
- FontSize: int
- SortOrder: int

### ScreenMenus
- Id: int
- Name: nvarchar
- SortOrder: int

### ScreenMenuCategories
- Id: int
- ScreenMenuId: int
- Name: nvarchar
- Header: nvarchar
- ColumnCount: int
- MenuItemButtonColor: nvarchar
- MenuItemFontSize: int
- PageCount: int
- MainButtonColor: nvarchar
- MainFontSize: int

### TicketLogs
- Id: int
- TicketId: int
- LogType: nvarchar
- LogData: nvarchar
- LogDate: datetime

### TicketTags
- Id: int
- TicketId: int
- TagName: nvarchar
- TagValue: nvarchar

### WarehouseConsumptions
- Id: int
- WarehouseId: int
- InventoryItemId: int
- Quantity: decimal
- Unit: nvarchar
- Date: datetime

### WarehouseTypes
- Id: int
- Name: nvarchar
- Description: nvarchar

### Warehouses
- Id: int
- Name: nvarchar
- WarehouseTypeId: int
- Description: nvarchar

### AccountTransactionDocumentTypes
- Id: int
- Name: nvarchar
- Description: nvarchar
- SortOrder: int

### AccountTransactionTypes
- Id: int
- Name: nvarchar
- DefaultSourceAccountTypeId: int
- DefaultTargetAccountTypeId: int

---

## Mapeo a modelo central (Prisma) y API de ingesta

Nota: Muchos campos de SambaPOS llegan como strings JSON embebidos en nvarchar (p. ej., `TicketTags`, `TicketStates`, `OrderTags`). En la ingesta se deben parsear a objetos JSON.

### Tickets → `Ticket` (central)
- SambaPOS `TicketUid` → `Ticket.posTicketUid`
- SambaPOS `TicketNumber` → `Ticket.number`
- SambaPOS `Date` → `Ticket.openedAt`
- SambaPOS `LastPaymentDate` → `Ticket.closedAt` (si `IsClosed = 1`)
- SambaPOS `IsClosed` → `Ticket.isClosed`
- SambaPOS `TotalAmount` → `Ticket.total`
- SambaPOS `TotalAmountPreTax` → `Ticket.totalPretax`
- SambaPOS `RemainingAmount` → `Ticket.remaining`
- SambaPOS `DepartmentId` → `Ticket.departmentId`
- SambaPOS `TerminalId` → `Ticket.terminalId`
- SambaPOS `TicketTags` (json en texto) → `Ticket.tags` (Json)
- SambaPOS `TicketStates` (json en texto) → `Ticket.states` (Json)
- SambaPOS `Note` → `Ticket.note`
- Idempotencia: usar `sourceType = 'sambapos'`, `sourceId = TicketUid` (o `Id` si no hay `TicketUid`), y `sourceHash` = SHA1 del payload normalizado.

Payload de ingesta sugerido (POST `/api/ingest/tickets`): ver ejemplos normalizados en `docs/sambapos_payload_examples.md`.

### Orders → `Order` (central)
- SambaPOS `OrderUid` (si existe) o `Id` → `Order.sourceId` (mantener para idempotencia)
- Enlace con ticket: usar `ticketPosUid = Tickets.TicketUid` en el payload de ingesta para resolver `Order.ticketId` en el servidor.
- SambaPOS `MenuItemId` → `Order.menuItemId`
- SambaPOS `MenuItemName` → `Order.name`
- SambaPOS `PortionName` → `Order.portion`
- SambaPOS `Quantity` → `Order.qty`
- SambaPOS `Price` → `Order.price`
- SambaPOS `PriceTag` → `Order.priceTag`
- SambaPOS `OrderTags` (json en texto) → `Order.tags` (Json)
- SambaPOS `OrderStates` (json en texto) → `Order.states` (Json)
Notas:
- Idempotencia por `branchId, sourceType, sourceId, sourceHash`.
- Recomendado enviar `ticketPosUid` en el payload (no `TicketId` entero) para desacoplar de claves locales.

### Payments → `Payment` (central)
- SambaPOS `Id` → `Payment.sourceId` (idempotencia)
- Enlace con ticket: `ticketPosUid = Tickets.TicketUid` (payload)
- Tipo de pago: usar `paymentTypeName = PaymentTypes.Name` y resolver a `Payment.paymentTypeId` mediante catálogo/mapeo por sucursal.
- SambaPOS `Amount` → `Payment.amount`
- SambaPOS `TenderedAmount` → `Payment.tenderedAmount`
- SambaPOS `Date` → `Payment.paidAt`
- SambaPOS `PaymentData` (json en texto) → `Payment.data` (Json)

Notas:
- Si el nombre de tipo de pago en POS no coincide con el catálogo central, usar `PaymentTypeMapping` por sucursal (`posPaymentType` → `centralPaymentTypeId`).
- Idempotencia por `branchId, sourceType, sourceId, sourceHash`.

---

## Consideraciones de ingestión
- Zona horaria: normalizar a UTC en el backend; conservar el `branch.timezone` para reporting.
- Decimales: enviar números, el backend los convierte a `Decimal(12,2)`/`(12,3)` según entidad.
- Strings JSON: parsear a objetos; si se envían como string, el backend debe parsearlos o almacenarlos en `raw`.
- Encabezados requeridos: `Authorization: Bearer <token>` y `x-branch-id: <uuid>`.
- AccountTypeId: int
- SortOrder: int

### AccountTypes
- Id: int
- Name: nvarchar
- Description: nvarchar
- SortOrder: int

### Departments
- Id: int
- Name: nvarchar
- Description: nvarchar
- SortOrder: int

### InventoryTransactionTypes
- Id: int
- Name: nvarchar
- SourceWarehouseTypeId: int
- TargetWarehouseTypeId: int
- SortOrder: int

### MenuItemTypes
- Id: int
- Name: nvarchar
- SortOrder: int

### ProgramSettings
- Id: int
- Name: nvarchar
- Value: nvarchar
- Description: nvarchar

### ScreenMenuItemProperties
- Id: int
- ScreenMenuItemId: int
- PropertyName: nvarchar
- PropertyValue: nvarchar

### States
- Id: int
- Name: nvarchar
- StateType: nvarchar
- Color: nvarchar
- SortOrder: int

### StateTypes
- Id: int
- Name: nvarchar
- Description: nvarchar
- SortOrder: int

### TaskTypes
- Id: int
- Name: nvarchar
- Description: nvarchar
- SortOrder: int

### Tasks
- Id: int
- TaskTypeId: int
- Name: nvarchar
- Description: nvarchar
- State: nvarchar
- StartDate: datetime
- EndDate: datetime
- UserId: int
- TerminalId: int

### TicketTypes
- Id: int
- Name: nvarchar
- Description: nvarchar
- SortOrder: int

### TransactionTypes
- Id: int
- Name: nvarchar
- SourceAccountTypeId: int
- TargetAccountTypeId: int
- SortOrder: int

### UserLogins
- Id: int
- UserId: int
- LoginDate: datetime
- TerminalId: int

### WarehouseConsumptionTypes
- Id: int
- Name: nvarchar
- Description: nvarchar
- SortOrder: int

### WarehouseTransactionTypes
- Id: int
- Name: nvarchar
- SourceWarehouseTypeId: int
- TargetWarehouseTypeId: int
- SortOrder: int

### WorkPeriodTypes
- Id: int
- Name: nvarchar
- Description: nvarchar
- SortOrder: int

### WorkPeriodLogs
- Id: int
- WorkPeriodId: int
- LogType: nvarchar
- LogData: nvarchar
- LogDate: datetime

### WorkPeriodTags
- Id: int
- WorkPeriodId: int
- TagName: nvarchar
- TagValue: nvarchar

### AccountTransactionValuesHistory
- Id: int
- AccountTransactionValueId: int
- ChangeDate: datetime
- OldDebit: decimal
- OldCredit: decimal
- OldExchange: decimal
- NewDebit: decimal
- NewCredit: decimal
- NewExchange: decimal

### AuditLogs
- Id: int
- UserId: int
- Action: nvarchar
- TableName: nvarchar
- RecordId: int
- ChangeDate: datetime
- OldValue: nvarchar
- NewValue: nvarchar

### EntityCustomFields
- Id: int
- EntityTypeId: int
- Name: nvarchar
- FieldType: nvarchar
- DefaultValue: nvarchar
- SortOrder: int

### EntityCustomFieldValues
- Id: int
- EntityId: int
- CustomFieldId: int
- Value: nvarchar

### MenuItemCustomTags
- Id: int
- MenuItemId: int
- TagName: nvarchar
- TagValue: nvarchar

### MenuItemTagMaps
- Id: int
- MenuItemTagId: int
- MenuItemId: int
- TagGroupId: int

### OrderTagMaps
- Id: int
- OrderTagId: int
- OrderTagGroupId: int
- MenuItemId: int

### ProgramSettingValues
- Id: int
- ProgramSettingId: int
- Value: nvarchar
- ChangeDate: datetime

### ScreenMenuItemMaps
- Id: int
- ScreenMenuItemId: int
- MenuItemId: int
- ScreenMenuCategoryId: int

### WarehouseConsumptionLogs
- Id: int
- WarehouseConsumptionId: int
- LogType: nvarchar
- LogData: nvarchar
- LogDate: datetime

### EntitiesLog
- Id: int
- EntityId: int
- EntityTypeId: int
- ChangeType: nvarchar
- ChangeDate: datetime
- ChangedBy: nvarchar

### PaidItems
- Id: int
- TicketId: int
- PaymentId: int
- Amount: decimal
- Date: datetime

### PeriodicConsumptionItems
- Id: int
- PeriodicConsumptionId: int
- InventoryItemId: int
- Quantity: decimal
- Unit: nvarchar

### ReportTemp
- Id: int
- ReportName: nvarchar
- Data: nvarchar
- CreatedDate: datetime

### PeriodicConsumptions
- Id: int
- StartDate: datetime
- EndDate: datetime
- WarehouseId: int
- Description: nvarchar

### Permissions
- Id: int
- UserRoleId: int
- PermissionName: nvarchar
- IsGranted: bit

### __MigrationHistory
- MigrationId: nvarchar
- ContextKey: nvarchar
- Model: varbinary
- ProductVersion: nvarchar

### AutomationCommandConfigLogs
- LogId: int
- CommandId: int
- Action: char
- Name: nvarchar
- Category: nvarchar
- LogDate: datetime
- ChangedBy: nvarchar

### PrinterMaps
- Id: int
- PrinterId: int
- TerminalId: int
- DepartmentId: int
- UserRoleId: int
- TicketTypeId: int

### Accounts
- Id: int
- AccountTypeId: int
- ForeignCurrencyId: int
- Name: nvarchar

### Printers
- Id: int
- Name: nvarchar
- PrinterType: int
- ShareName: nvarchar
- Port: nvarchar
- PrinterTemplateId: int

### AccountScreens
- Id: int
- Filter: int
- DisplayAsTree: bit
- SortOrder: int
- SettingData: nvarchar
- AutomationCommandMapData: nvarchar
- Name: nvarchar

### PrinterTemplates
- Id: int
- Name: nvarchar
- Template: nvarchar
- SortOrder: int

### AccountScreenValues
- Id: int
- AccountScreenId: int
- AccountTypeId: int
- AccountTypeName: nvarchar
- DisplayDetails: bit
- HideZeroBalanceAccounts: bit
- SortOrder: int

### PrintJobs
- Id: int
- PrinterId: int
- PrintJobType: int
- Name: nvarchar
- PrintJobData: nvarchar

### AccountTransactionDocumentAccountMaps
- Id: int
- AccountTransactionDocumentTypeId: int
- AccountId: int
- AccountName: nvarchar
- MappedAccountId: int
- MappedAccountName: nvarchar

### ProductTimerMaps
- Id: int
- ProductTimerId: int
- OrderId: int
- StartTime: datetime
- EndTime: datetime

### ProductTimers
- Id: int
- Name: nvarchar
- TimerType: int
- Duration: int

### AccountTransactionDocumentTypeAccountTransactionTypes
- AccountTransactionDocumentType_Id: int
- AccountTransactionType_Id: int

### AccountTransactionLogs
- LogId: int
- TransactionId: int
- Action: char
- DocumentId: int
- Name: nvarchar
- Amount: decimal
- LogDate: datetime
- ChangedBy: nvarchar

### RecipeItems
- Id: int
- RecipeId: int
- InventoryItemId: int
- Quantity: decimal
- Unit: nvarchar

### Recipes
- Id: int
- Name: nvarchar
- GroupCode: nvarchar
- PortionName: nvarchar
- Price: decimal
- Tag: nvarchar
- Barcode: nvarchar
- CustomTags: nvarchar
- WarehouseId: int
- MenuItemType: int
- SortOrder: int

### cliente_cfdi
- Id: int
- Nombre: nvarchar
- RFC: nvarchar
- Domicilio: nvarchar
- Email: nvarchar

### RefreshTokens
- Id: int
- UserId: int
- Token: nvarchar
- ExpiryDate: datetime

### configuracion_correo
- Id: int
- Host: nvarchar
- Port: int
- Username: nvarchar
- Password: nvarchar
- UseSSL: bit

### ReportSettings
- Id: int
- ReportName: nvarchar
- SettingsData: nvarchar

### sat_catalogs
- Id: int
- CatalogName: nvarchar
- Data: nvarchar

### ActionContainers
- Id: int
- AppActionId: int
- AppRuleId: int
- Name: nvarchar
- ParameterValues: nvarchar
- CustomConstraint: nvarchar
- SortOrder: int
- Async: bit

### AddonLicenses
- Id: int
- Key: nvarchar
- Name: nvarchar

### AppActions
- Id: int
- ActionType: nvarchar
- Parameter: nvarchar
- SortOrder: int
- Name: nvarchar

### AppRuleMaps
- Id: int
- AppRuleId: int
- TerminalId: int
- DepartmentId: int
- UserRoleId: int
- TicketTypeId: int

### AppRules
- Id: int
- EventName: nvarchar
- RuleConstraints: nvarchar
- ConstraintMatch: int
- EventConstraints: nvarchar
- SortOrder: int
- Tags: nvarchar
- Name: nvarchar

### audit_logs
- Id: int
- EntityType: nvarchar
- EntityId: int
- Action: nvarchar
- Field: nvarchar
- OldValue: nvarchar
- NewValue: nvarchar
- UserName: nvarchar
- Timestamp: datetime2
- IpAddress: nvarchar
- SessionId: nvarchar
- Notes: nvarchar

### AutoConfigurationTasks
- Id: int
- Description: nvarchar
- Language: nvarchar
- CreateBackup: bit
- TaskData: nvarchar
- SortOrder: int
- Name: nvarchar

### Calculations
- Id: int
- CalculationTypeId: int
- Name: nvarchar
- Amount: decimal
- CalculationMethod: int
- SortOrder: int

### CalculationSelectorCalculationTypes
- CalculationSelectorId: int
- CalculationTypeId: int

### CalculationSelectorMaps
- Id: int
- CalculationSelectorId: int
- TerminalId: int
- DepartmentId: int
- UserRoleId: int
- TicketTypeId: int

### CalculationSelectors
- Id: int
- Name: nvarchar
- SortOrder: int
- TerminalId: int
- DepartmentId: int

### CalculationTypes
- Id: int
- Name: nvarchar
- Description: nvarchar
- SortOrder: int

### ChangePayments
- Id: int
- TicketId: int
- OldPaymentTypeId: int
- NewPaymentTypeId: int
- Amount: decimal
- ChangeDate: datetime
- UserId: int
- TerminalId: int

### TicketEntities
- Id: int
- TicketId: int
- EntityId: int
- EntityTypeId: int
- CustomData: nvarchar

### TicketTagGroups
- Id: int
- Name: nvarchar
- SortOrder: int
- TicketId: int
- MaxQuantity: int
- Color: nvarchar
- Filter: nvarchar
- Description: nvarchar
- Rate: decimal
- Header: nvarchar

### ChangePaymentTypeMaps
- Id: int
- PaymentTypeMapId: int
- OldPaymentTypeId: int
- NewPaymentTypeId: int
- TerminalId: int
- DepartmentId: int
- UserRoleId: int
- TicketTypeId: int

### TicketTagMaps
- Id: int
- TicketTagId: int
- TicketTagGroupId: int
- MenuItemId: int

### ChangePaymentTypes
- Id: int
- PaymentTypeId: int
- OldValue: nvarchar
- NewValue: nvarchar
- TerminalId: int
- DepartmentId: int
- UserRoleId: int
- TicketTypeId: int

### CostItems
- Id: int
- Name: nvarchar
- Description: nvarchar
- SortOrder: int

### Triggers
- Id: int
- Name: nvarchar
- Description: nvarchar
- SortOrder: int

### CustomReports
- Id: int
- Name: nvarchar
- Description: nvarchar
- SortOrder: int

### DataExports
- Id: int
- Name: nvarchar
- Description: nvarchar
- SortOrder: int

### Departments
- (ya documentada arriba)

### Entities
- (ya documentada arriba)

### WarehouseConsumptions
- (ya documentada arriba)

### EntityCustomFields
- (ya documentada arriba)

### Warehouses
- (ya documentada arriba)

### EntityScreenItems
- Id: int
- EntityScreenId: int
- Name: nvarchar
- EntityId: int
- EntityState: nvarchar
- SortOrder: int
- LastUpdateTime: datetime

### WarehouseTypes
- (ya documentada arriba)

### EntityScreenMaps
- Id: int
- EntityScreenId: int
- Visibility: int
- TerminalId: int
- DepartmentId: int
- UserRoleId: int
- TicketTypeId: int

### Widgets
- Id: int
- Name: nvarchar
- UniqueId: nvarchar
- EntityScreenId: int
- XLocation: int
- YLocation: int
- Height: int
- Width: int
- Zindex: int
- CornerRadius: int
- Angle: float
- Scale: float
- Properties: nvarchar
- CreatorName: nvarchar
- AutoRefresh: bit
- AutoRefreshInterval: int
- Margin: nvarchar
- SettingData: nvarchar

### EntityScreens
- Id: int
- TicketTypeId: int
- EntityTypeId: int
- SortOrder: int
- DisplayMode: int
- BackgroundColor: nvarchar
- BackgroundImage: nvarchar
- FontSize: int
- ButtonFontSize: int
- PageCount: int
- RowCount: int
- ColumnCount: int
- ButtonHeight: int
- DisplayState: nvarchar
- StateFilter: nvarchar
- AskTicketType: bit
- SearchValueReplacePattern: nvarchar
- UseStateDisplayFormat: bit
- DetailTemplate: nvarchar
- Layout: nvarchar
- ButtonHeader: nvarchar
- Name: nvarchar
- DeferAutoUpdatesDuration: int

### ProcesamientoHistorial
- Id: int
- FechaInicio: datetime2
- FechaFin: datetime2
- TicketTypeId: int
- TicketsProcesados: int
- TicketsInvalidos: int
- Estado: varchar
- Error: nvarchar
- DetalleOperacion: nvarchar

### EntityStateLogs
- Id: int
- EntityId: int
- StateName: nvarchar
- StartState: nvarchar
- StartStateDate: datetime
- EndState: nvarchar
- EndStateDate: datetime
- CustomData: nvarchar
- Name: nvarchar

### EntityStateValues
- Id: int
- EntityId: int
- EntityStates: nvarchar

### EntityTypeAssignments
- Id: int
- TicketTypeId: int
- EntityTypeId: int
- EntityTypeName: nvarchar
- AskBeforeCreatingTicket: bit
- State: nvarchar
- CopyToNewTickets: bit
- SortOrder: int

### ProcesamientoDetalle
- Id: int
- ProcesamientoId: int
- TicketId: int
- EstadoAnterior: varchar
- EstadoNuevo: varchar
- FechaProcesamiento: datetime2
- Observaciones: nvarchar

### ForeignCurrencies
- Id: int
- CurrencySymbol: nvarchar
- ExchangeRate: decimal
- Rounding: decimal
- InverseExchangeRate: bit
- Name: nvarchar

### GraphqlClients
- Id: int
- Identifier: nvarchar
- Secret: nvarchar
- ApplicationType: int
- Active: bit
- RefreshTokenLifeTime: int
- AllowedOrigin: nvarchar
- AllowedFunctions: nvarchar
- AuthorizationType: int
- Name: nvarchar

### TicketsEliminados
- Id: int
- TicketId: int
- FechaEliminacion: datetime
- FechaOriginal: datetime
- Referencia: nvarchar
- MontoTotal: money
- TipoTicket: nvarchar
- UsuarioEliminacion: nvarchar
- EstadoRestauracion: int
- DatosTicket: nvarchar

### InventoryItemUnits
- Id: int
- InventoryItemId: int
- Name: nvarchar
- Multiplier: int
- ParentUnitName: nvarchar
- ParentUnitMultiplier: int
- DefaultCost: decimal
- IsDefaultTransactionUnit: bit

### InventoryTransactionDocuments
- Id: int
- Date: datetime
- InventoryDocumentTransactionTypeId: int
- TransactionAccountTransactionTypeId: int
- AccountTypeId: int
- AccountId: int
- Description: nvarchar
- ForeignCurrencyId: int
- Name: nvarchar
- AccountTransactionDocument_Id: int

### invoiced_tickets
- id: int
- ticket_id: text
- invoice_uuid: text
- invoice_date: datetime
- total: decimal
- client_rfc: text
- status: text

### InventoryTransactionDocumentTypes
- Id: int
- EntityTypeId: int
- DefaultEntityId: int
- ButtonHeader: nvarchar
- ButtonColor: nvarchar
- SortOrder: int
- Name: nvarchar
- AccountTransactionType_Id: int
- InventoryTransactionType_Id: int

### clients
- id: int
- rfc: varchar
- business_name: varchar
- postal_code: varchar
- email: varchar
- tax_regime: varchar
- street: varchar
- ext_number: varchar
- int_number: varchar
- colony: varchar
- city: varchar
- state: varchar
- country: varchar
- phone: varchar
- factura_com_id: varchar
- last_sync: datetime
- uid: varchar
- status: varchar

### MenuAssignments
- Id: int
- TicketTypeId: int
- TerminalId: int
- MenuId: int
- TerminalName: nvarchar
- SortOrder: int

### MenuItemPrices
- Id: int
- MenuItemPortionId: int
- PriceTag: nvarchar
- Price: decimal

### Numerators
- Id: int
- LastUpdateTime: timestamp
- Number: int
- NumberFormat: nvarchar
- Name: nvarchar

### alembic_version
- version_num: varchar

### ChangePaymentTypeMaps
- Id: int
- ChangePaymentTypeId: int
- TerminalId: int
- DepartmentId: int
- UserRoleId: int
- TicketTypeId: int

### TicketTagMaps
- Id: int
- TicketTagGroupId: int
- TerminalId: int
- DepartmentId: int
- UserRoleId: int
- TicketTypeId: int

### ChangePaymentTypes
- Id: int
- SortOrder: int
- Name: nvarchar
- Account_Id: int
- AccountTransactionType_Id: int

### CostItems
- Id: int
- WarehouseConsumptionId: int
- PeriodicConsumptionId: int
- MenuItemId: int
- PortionId: int
- PortionName: nvarchar
- Quantity: decimal
- CostPrediction: decimal
- Cost: decimal
- AvgPrice: decimal
- Name: nvarchar

### Triggers
- Id: int
- Expression: nvarchar
- LastTrigger: datetime
- Name: nvarchar

---

Este documento contiene el esquema principal para modelado y normalización en Prisma. Si necesitas relaciones, vistas, funciones o procedimientos almacenados, avísame.
