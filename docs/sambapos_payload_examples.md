# Ejemplos reales de payloads extraídos de SambaPOS

# Índice de bloques de ejemplo
- InventoryTransactionDocumentTypes
- InventoryTransactionDocuments
- InventoryItems
- InventoryTransactionTypes

- Tickets
- Orders
- Payments
- PaymentTypeMaps
- PaymentTypes
- Terminals
- UserRoles
- Users
- WorkPeriods
- Entities
- EntityTypes
- EntityScreens
- MenuItems
- ScreenMenuItems
- Warehouses
- WarehouseTypes
- InventoryTransactions
- Departments
- WarehouseConsumptions
- EntityCustomFields

Nota: Para los contratos de ingesta normalizados (payloads que recibe la API central), ver `docs/sambapos_ingest_contracts.md`.

---

## TicketTags (synthetic examples)
```json
[
  { "Id": 90001, "TicketId": 26756, "TagName": "TICKET NO", "TagValue": "2" },
  { "Id": 90002, "TicketId": 26756, "TagName": "FACTURAS", "TagValue": "PUBLICO GENERAL" }
]
```

## TicketLogs (synthetic examples)
```json
[
  {
    "Id": 80001,
    "TicketId": 26756,
    "LogType": "PAGOS",
    "LogData": "Tarjeta de crédito = 243.00",
    "LogDate": "2025-02-05T10:54:34.574"
  },
  {
    "Id": 80002,
    "TicketId": 26756,
    "LogType": "ORDEN",
    "LogData": "POLLO (Normal) x1",
    "LogDate": "2025-02-05T10:54:31.037"
  }
]
```

## OrderTagGroups (synthetic examples)
```json
[
  {
    "Id": 6001,
    "Name": "SABORES SALSAS POLLO",
    "SortOrder": 10,
    "MenuItemId": 1783,
    "MaxQuantity": 2,
    "Color": "#FFCC9933",
    "Filter": null,
    "Description": "Selección de salsa",
    "Rate": 0.0,
    "Header": "SALSAS"
  }
]
```

## OrderTags (synthetic examples)
```json
[
  {
    "Id": 6101,
    "Name": "ADOBADO",
    "SortOrder": 10,
    "OrderTagGroupId": 6001,
    "Price": 0.00,
    "MenuItemId": 1783,
    "MaxQuantity": 1,
    "Color": "#FFE0E0E0",
    "Filter": null,
    "Description": null,
    "Rate": 0.0,
    "Header": null,
    "Amount": 0.00
  },
  {
    "Id": 6102,
    "Name": "JALAPEÑO",
    "SortOrder": 20,
    "OrderTagGroupId": 6001,
    "Price": 0.00,
    "MenuItemId": 1783,
    "MaxQuantity": 1,
    "Color": "#FFE0E0E0",
    "Filter": null,
    "Description": null,
    "Rate": 0.0,
    "Header": null,
    "Amount": 0.00
  }
]
```

## MenuItemPortions (synthetic examples)
```json
[
  { "Id": 3001, "MenuItemId": 1783, "Name": "Normal", "Multiplier": 1.0, "Price": 210.00 },
  { "Id": 3002, "MenuItemId": 1783, "Name": "Grande", "Multiplier": 1.5, "Price": 295.00 }
]
```

## MenuItemPriceDefinitions (synthetic examples)
```json
[
  { "Id": 3101, "MenuItemId": 1783, "Price": 210.00, "PriceTag": null, "PortionName": "Normal", "MenuItemName": "POLLO" },
  { "Id": 3102, "MenuItemId": 1783, "Price": 295.00, "PriceTag": "PROMO", "PortionName": "Grande", "MenuItemName": "POLLO" }
]
```

## ScreenMenus (synthetic examples)
```json
[
  { "Id": 101, "Name": "PRINCIPAL", "SortOrder": 10 },
  { "Id": 102, "Name": "BARRA", "SortOrder": 20 }
]
```

## ScreenMenuCategories (synthetic examples)
```json
[
  {
    "Id": 201,
    "ScreenMenuId": 101,
    "Name": "POLLOS",
    "Header": "POLLOS",
    "ColumnCount": 5,
    "MenuItemButtonColor": "#FFFFFFFF",
    "MenuItemFontSize": 36,
    "PageCount": 1,
    "MainButtonColor": "#FFEFEFEF",
    "MainFontSize": 24
  }
]
```

## AccountTransactionDocuments (synthetic examples)
```json
[
  {
    "Id": 50001,
    "Name": "Pago tarjeta",
    "Date": "2025-02-05T10:54:34.570",
    "Description": "Pago de ticket 2",
    "UserId": 31,
    "TerminalId": 1,
    "DepartmentId": 9
  }
]
```

## AccountTransactions (synthetic examples)
```json
[
  {
    "Id": 56083,
    "Name": "SALE",
    "Amount": 243.00,
    "Date": "2025-02-05T10:54:34.570",
    "AccountTransactionTypeId": 4,
    "SourceAccountId": 6,
    "TargetAccountId": 10,
    "DocumentId": 50001,
    "Description": "Venta ticket 2"
  }
]
```

## AccountTransactionValues (synthetic examples)
```json
[
  { "Id": 70001, "AccountTransactionId": 56083, "Debit": 243.00, "Credit": 0.00, "Exchange": 1.0 },
  { "Id": 70002, "AccountTransactionId": 56083, "Debit": 0.00, "Credit": 243.00, "Exchange": 1.0 }
]
```
- EntityScreenItems
- EntityScreenMaps
- Widgets
- EntityStateValues
- EntityTypeAssignments
- TicketsEliminados
- clients
- MenuAssignments
- MenuItemPrices
- Numerators
- alembic_version
- TicketTagMaps
- ProcesamientoHistorial
- EntityStateLogs
- ProcesamientoDetalle
- ForeignCurrencies
- InventoryItemUnits
- InventoryTransactionDocuments
- invoiced_tickets
- ChangePaymentTypeMaps
- ChangePaymentTypes
- CostItems
- Triggers

Este documento contiene ejemplos de datos reales para Tickets, Orders y Payments, extraídos directamente de la base de datos SambaPOS. Sirven como referencia para definir los contratos de ingesta y los Zod schemas.

---

## Tickets

```json
[
  {
    "Id": 26756,
    "LastUpdateTime": "2025-02-05T10:54:34.777",
    "TicketVersion": "2025-02-05T10:54:34.000",
    "TicketUid": "vesSxNL13kSMWAPhJGaKtg",
    "TicketNumber": "2",
    "Date": "2025-02-05T10:54:20.023",
    "LastOrderDate": "2025-02-05T10:54:31.037",
    "LastPaymentDate": "2025-02-05T10:54:34.570",
    "PreOrder": 0,
    "IsClosed": 1,
    "IsLocked": 0,
    "RemainingAmount": 0.00,
    "TotalAmount": 243.00,
    "DepartmentId": 9,
    "TerminalId": 1,
    "TicketTypeId": 4,
    "Note": null,
    "LastModifiedUserName": "GUILLERMO SISTEMAS",
    "TicketTags": "[{\"TN\":\"TICKET NO\",\"TT\":1,\"TV\":\"2\"},{\"TN\":\"FACTURAS\",\"TT\":0,\"TV\":\"PUBLICO GENERAL\"}]",
    "TicketStates": "[{\"D\":\"\/Date(1738774474616-0600)\/\",\"S\":\"Pagado\",\"SN\":\"Estado\",\"SV\":\"\"}]",
    "TicketLogs": "[{\"C\":\"PAGOS\",\"D\":\"\/Date(1738774474574-0600)\/\",\"L\":\"Tarjeta de crédito = 243.00\",\"N\":\"2\",\"U\":\"GUILLERMO SISTEMAS\"}]",
    "LineSeparators": "[]",
    "ExchangeRate": 1.0,
    "TaxIncluded": 0,
    "Name": null,
    "TransactionDocument_Id": 31329,
    "IsOpened": 0,
    "TotalAmountPreTax": 243.00,
    "CreatedUserName": "GUILLERMO SISTEMAS"
  },
  // ...otros tickets
]
```

## Orders

```json
[
  {
    "Id": 66747,
    "TicketId": 26756,
    "WarehouseId": 30,
    "DepartmentId": 9,
    "TerminalId": 1,
    "MenuItemId": 1783,
    "MenuItemName": "POLLO",
    "PortionName": "Normal",
    "Price": 210.00,
    "Quantity": 1.0,
    "PortionCount": 1,
    "Locked": 1,
    "CalculatePrice": 1,
    "DecreaseInventory": 1,
    "IncreaseInventory": 0,
    "OrderNumber": 2,
    "CreatingUserName": "GUILLERMO SISTEMAS",
    "CreatedDateTime": "2025-02-05T10:54:31.037",
    "LastUpdateDateTime": "2025-02-05T10:54:20.053",
    "AccountTransactionTypeId": 3,
    "ProductTimerValueId": null,
    "GroupTagName": null,
    "GroupTagFormat": null,
    "Separator": null,
    "PriceTag": null,
    "Tag": null,
    "OrderUid": "aVePR0sv5Ee0e2QGuzLX4Q",
    "Taxes": "[]",
    "OrderTags": "[{\"OI\":124,\"OK\":\"000010\",\"Q\":1,\"TN\":\"SABORES SALSAS POLLO\",\"TV\":\"ADOBADO\",\"UI\":31},{\"OI\":124,\"OK\":\"000120\",\"Q\":1,\"TN\":\"SABORES SALSAS POLLO\",\"TV\":\"JALAPEÑO\",\"UI\":31}]",
    "OrderStates": "[{\"D\":\"\/Date(1738774474766-0600)\/\",\"OK\":\"000000\",\"S\":\"Enviado\",\"SN\":\"Status\",\"SV\":\"\",\"U\":31}]",
    "DisablePortionSelection": 0
  },
  // ...otros orders
]
```

## Payments

```json
[
  {
    "Id": 25583,
    "TicketId": 26756,
    "PaymentTypeId": 2,
    "DepartmentId": 9,
    "Name": "Tarjeta de crédito",
    "Description": null,
    "Date": "2025-02-05T10:54:34.570",
    "AccountTransactionId": 0,
    "Amount": 243.00,
    "TenderedAmount": 243.00,
    "UserId": 31,
    "TerminalId": 1,
    "ExchangeRate": 1.0,
    "AccountTransaction_Id": 56083,
    "AccountTransaction_AccountTransactionDocumentId": 31329,
    "PaymentData": null,
    "CanAdjustTip": 0
  },
  // ...otros payments
]
```

## PaymentTypeMaps
```json
[
  { "Id": 22, "PaymentTypeId": 4, "TerminalId": 0, "DepartmentId": 1, "UserRoleId": 0, "TicketTypeId": 0 },
  { "Id": 23, "PaymentTypeId": 2, "TerminalId": 0, "DepartmentId": 10, "UserRoleId": 0, "TicketTypeId": 0 },
  { "Id": 24, "PaymentTypeId": 1, "TerminalId": 0, "DepartmentId": 11, "UserRoleId": 0, "TicketTypeId": 0 }
]
```

## PaymentTypes
```json
[
  { "Id": 1, "SortOrder": 10, "ButtonColor": "#FF85A543", "FontSize": 38, "OrderStateName": null, "OrderStateValue": null, "ProcessorSettings": "[]", "ButtonHeader": "EFECTIVO", "Name": "Efectivo", "Account_Id": 5, "AccountTransactionType_Id": 4 },
  { "Id": 2, "SortOrder": 20, "ButtonColor": "#FF83B5F1", "FontSize": 38, "OrderStateName": null, "OrderStateValue": null, "ProcessorSettings": "[{\"D\":null,\"N\":\"Execute Script\",\"O\":10,\"S\":\"{\\\"ConfirmMessageHandler\\\":\\\"\\\",\\\"PreProcessHandler\\\":\\\"\\\",\\\"PreValidationHandler\\\":\\\"\\\",\\\"ProcessHandler\\\":\\\"pay.UpdateDescription()\\\"}\"}]", "ButtonHeader": "TARJETA<br/>CREDITO", "Name": "Tarjeta de crédito", "Account_Id": 6, "AccountTransactionType_Id": 4 },
  { "Id": 3, "SortOrder": 70, "ButtonColor": "#FFCBAFED", "FontSize": 32, "OrderStateName": null, "OrderStateValue": null, "ProcessorSettings": "[]", "ButtonHeader": "CUPON", "Name": "Vale", "Account_Id": 7, "AccountTransactionType_Id": 4 }
]
```

## Terminals
```json
[
  { "Id": 1, "IsDefault": 0, "AutoLogout": 0, "ReportPrinterId": 1, "TransactionPrinterId": 1, "Name": "SERVIDOR" },
  { "Id": 2, "IsDefault": 0, "AutoLogout": 1, "ReportPrinterId": 1, "TransactionPrinterId": 1, "Name": "MESEROS" },
  { "Id": 3, "IsDefault": 0, "AutoLogout": 0, "ReportPrinterId": 10, "TransactionPrinterId": 10, "Name": "REPARTOS" }
]
```

## UserRoles
```json
[
  { "Id": 1, "IsAdmin": 1, "DepartmentId": 9, "ManagementCommands": null, "Name": "ADMIN" },
  { "Id": 2, "IsAdmin": 0, "DepartmentId": 9, "ManagementCommands": null, "Name": "MESERO" },
  { "Id": 3, "IsAdmin": 0, "DepartmentId": 7, "ManagementCommands": "Usuarios.Aplicaciones\nUsuarios.Lista de usuarios", "Name": "CAJERO" }
]
```

## Users
```json
[
  { "Id": 31, "PinCode": "2003444689", "Name": "GUILLERMO SISTEMAS", "UserRole_Id": 4, "Password": null, "Terminal_Id": 4, "SevenShiftsEmployeeId": 0 },
  { "Id": 89, "PinCode": "4455", "Name": "CAJERO", "UserRole_Id": 1, "Password": null, "Terminal_Id": 1, "SevenShiftsEmployeeId": 0 },
  { "Id": 90, "PinCode": "1133", "Name": "graphiql", "UserRole_Id": 1, "Password": "$SPHASH$V1$10000$cIXBFu6xtX6ol8BySSn2HOqcvfW8CsHrbmTaLR5dX5yAvqWp", "Terminal_Id": 1, "SevenShiftsEmployeeId": 0 }
]
```

## WorkPeriods
```json
[
  { "Id": 177, "StartDate": "2025-02-05T09:41:44.787", "EndDate": "2025-05-17T17:49:13.807", "StartDescription": null, "EndDescription": null, "Name": null, "WorkPeriodNumber": 1, "StartById": 31, "StartByName": "GUILLERMO SISTEMAS", "EndById": 31, "EndByName": "GUILLERMO SISTEMAS" },
  { "Id": 178, "StartDate": "2025-05-17T17:49:16.690", "EndDate": "2025-05-17T17:49:16.690", "StartDescription": null, "EndDescription": null, "Name": null, "WorkPeriodNumber": 2, "StartById": 31, "StartByName": "GUILLERMO SISTEMAS", "EndById": 0, "EndByName": null },
  { "Id": 183, "StartDate": "2025-07-04T15:00:25.423", "EndDate": "2025-07-04T15:00:26.590", "StartDescription": null, "EndDescription": null, "Name": "Work Period Test", "WorkPeriodNumber": 1, "StartById": 1, "StartByName": "API User", "EndById": 0, "EndByName": null }
]
```

## Entities
```json
[
  { "Id": 45894, "EntityTypeId": 1, "LastUpdateTime": "2024-01-11T11:47:33.967", "SearchString": null, "CustomData": "[{\"Name\":\"Telefono\",\"Value\":\"312123456789\"},{\"Name\":\"Direccion\",\"Value\":\"colima \"},{\"Name\":\"Colonia\",\"Value\":null},{\"Name\":\"Ciudad\",\"Value\":null},{\"Name\":\"Observaciones\",\"Value\":null},{\"Name\":\"LastTicketId\",\"Value\":null},{\"Name\":\"Disponible\",\"Value\":null}]", "Notes": null, "AccountId": 0, "WarehouseId": 0, "Name": "juan" },
  { "Id": 45895, "EntityTypeId": 1, "LastUpdateTime": "2024-02-18T10:25:48.357", "SearchString": null, "CustomData": "[{\"Name\":\"Telefono\",\"Value\":\"3123123432\"},{\"Name\":\"Direccion\",\"Value\":\"ALBERT EINSTEIN  871 MONTELLANO  VILLA DE ALVAREZ \"},{\"Name\":\"Colonia\",\"Value\":null},{\"Name\":\"Ciudad\",\"Value\":null},{\"Name\":\"Observaciones\",\"Value\":null},{\"Name\":\"LastTicketId\",\"Value\":null}]", "Notes": null, "AccountId": 0, "WarehouseId": 0, "Name": "MARICARMEN" },
  { "Id": 45900, "EntityTypeId": 1, "LastUpdateTime": "2024-01-17T07:39:36.127", "SearchString": null, "CustomData": "[{\"Name\":\"Telefono\",\"Value\":\"3125949330\"},{\"Name\":\"Direccion\",\"Value\":\"SAN FERNANDO 10 MAS CELULAR\"},{\"Name\":\"Colonia\",\"Value\":null},{\"Name\":\"Ciudad\",\"Value\":null},{\"Name\":\"Observaciones\",\"Value\":null},{\"Name\":\"LastTicketId\",\"Value\":null}]", "Notes": null, "AccountId": 0, "WarehouseId": 0, "Name": "ADRIAN FLORES" }
]
```

## EntityTypes
```json
[
  { "Id": 1, "SortOrder": 0, "EntityName": "Cliente", "AccountTypeId": 0, "WarehouseTypeId": 1, "AccountNameTemplate": "[Nombre]-[Telefono]", "PrimaryFieldName": "Nombre", "PrimaryFieldFormat": null, "DisplayFormat": null, "AccountBalanceDisplayFormat": null, "DefaultStates": null, "Name": "Clientes" },
  { "Id": 2, "SortOrder": 0, "EntityName": "Mesa", "AccountTypeId": 0, "WarehouseTypeId": 1, "AccountNameTemplate": null, "PrimaryFieldName": "Nombre", "PrimaryFieldFormat": null, "DisplayFormat": null, "AccountBalanceDisplayFormat": null, "DefaultStates": null, "Name": "Mesas" },
  { "Id": 3, "SortOrder": 0, "EntityName": "REPARTIDORES", "AccountTypeId": 0, "WarehouseTypeId": 0, "AccountNameTemplate": null, "PrimaryFieldName": "NOMBRE", "PrimaryFieldFormat": null, "DisplayFormat": null, "AccountBalanceDisplayFormat": null, "DefaultStates": "TS.Estado=Disponible", "Name": "REPARTIDORES" }
]
```

## EntityScreens
```json
[
  { "Id": 4, "TicketTypeId": 1, "EntityTypeId": 6, "SortOrder": 200, "DisplayMode": 1, "BackgroundColor": "Transparent", "BackgroundImage": "C:\\reportes\\TERRAZA PLANTA BAJA.png", "FontSize": 50, "ButtonFontSize": 0, "PageCount": 1, "RowCount": 0, "ColumnCount": 7, "ButtonHeight": 0, "DisplayState": null, "StateFilter": null, "AskTicketType": 0, "SearchValueReplacePattern": null, "UseStateDisplayFormat": 0, "DetailTemplate": null, "Layout": null, "ButtonHeader": "<sym>?<\/sym> PROVEEDORES", "Name": "PROVEEDORES", "DeferAutoUpdatesDuration": 0 },
  { "Id": 6, "TicketTypeId": 1, "EntityTypeId": 2, "SortOrder": 300, "DisplayMode": 2, "BackgroundColor": "Transparent", "BackgroundImage": "C:\\reportes\\MAPA3.png", "FontSize": 50, "ButtonFontSize": 0, "PageCount": 1, "RowCount": 0, "ColumnCount": 7, "ButtonHeight": 0, "DisplayState": "Status", "StateFilter": null, "AskTicketType": 0, "SearchValueReplacePattern": null, "UseStateDisplayFormat": 1, "DetailTemplate": null, "Layout": "SALON", "ButtonHeader": "SALON", "Name": "SALON", "DeferAutoUpdatesDuration": 0 },
  { "Id": 7, "TicketTypeId": 1, "EntityTypeId": 0, "SortOrder": 320, "DisplayMode": 3, "BackgroundColor": "Transparent", "BackgroundImage": null, "FontSize": 50, "ButtonFontSize": 0, "PageCount": 2, "RowCount": 0, "ColumnCount": 0, "ButtonHeight": 0, "DisplayState": null, "StateFilter": null, "AskTicketType": 0, "SearchValueReplacePattern": null, "UseStateDisplayFormat": 0, "DetailTemplate": null, "Layout": "<?xml version=\"1.0\" encoding=\"utf-16\"?><LayoutControl ID=\"LayoutControl\" ItemSpace=\"0\" Padding=\"0,0,0,0\"><LayoutGroup ID=\"784\" Header=\"\" Orientation=\"Vertical\" View=\"GroupBox\" Width=\"1030\" Height=\"NaN\"><Element ID=\"NxTv_LJP2k064UtUA551yyQ\" HorizontalAlignm <background red><sym>?<\/sym> REGISTRAR GASTO<\/background>", "ButtonHeader": "GASTOS2", "Name": "GASTOS2", "DeferAutoUpdatesDuration": 0 }
]
```

## EntityScreenItems
```json
[
  {
    "Id": 50,
    "EntityScreenId": 6,
    "Name": "SALON1",
    "EntityId": 46,
    "EntityState": null,
    "SortOrder": 10,
    "LastUpdateTime": "2018-07-04T20:02:59.370"
  },
  {
    "Id": 51,
    "EntityScreenId": 6,
    "Name": "SALON2",
    "EntityId": 47,
    "EntityState": null,
    "SortOrder": 20,
    "LastUpdateTime": "2018-07-04T20:02:59.370"
  },
  {
    "Id": 52,
    "EntityScreenId": 6,
    "Name": "SALON3",
    "EntityId": 48,
    "EntityState": null,
    "SortOrder": 30,
    "LastUpdateTime": "2018-07-04T20:02:59.370"
  }
]
```

## EntityScreenMaps
```json
[
  {
    "Id": 148,
    "EntityScreenId": 11,
    "Visibility": 0,
    "TerminalId": 0,
    "DepartmentId": 1,
    "UserRoleId": 4,
    "TicketTypeId": 0
  },
  {
    "Id": 149,
    "EntityScreenId": 11,
    "Visibility": 0,
    "TerminalId": 0,
    "DepartmentId": 1,
    "UserRoleId": 3,
    "TicketTypeId": 0
  },
  {
    "Id": 150,
    "EntityScreenId": 11,
    "Visibility": 0,
    "TerminalId": 0,
    "DepartmentId": 1,
    "UserRoleId": 1,
    "TicketTypeId": 0
  }
]
```

## Widgets
```json
[
  {
    "Id": 33,
    "Name": null,
    "UniqueId": null,
    "EntityScreenId": 6,
    "XLocation": 597,
    "YLocation": 539,
    "Height": 66,
    "Width": 132,
    "Zindex": 0,
    "CornerRadius": 0,
    "Angle": 0.0,
    "Scale": 0.0,
    "Properties": "{\"AutomationCommand\":null,\"Caption\":\"S2\",\"FontSize\":26,\"ResourceName\":\"SALON2\"}",
    "CreatorName": "EntityButtonCreator",
    "AutoRefresh": 1,
    "AutoRefreshInterval": 0,
    "Margin": null,
    "SettingData": "{\"SO\":0}"
  }
]
```

## EntityStateValues
```json
[
  {
    "Id": 1,
    "EntityId": 1,
    "EntityStates": "[{\"D\":\"\/Date(1755135890996-0600)\/\",\"S\":\"Nuevos pedidos\",\"SN\":\"Status\"}]"
  },
  {
    "Id": 2,
    "EntityId": 4,
    "EntityStates": "[{\"S\":\"Available\",\"SN\":\"Status\"}]"
  },
  {
    "Id": 3,
    "EntityId": 10,
    "EntityStates": "[{\"S\":\"Available\",\"SN\":\"Status\"}]"
  }
]
```

## EntityTypeAssignments
```json
[
  {
    "Id": 1,
    "TicketTypeId": 1,
    "EntityTypeId": 2,
    "EntityTypeName": "Mesas",
    "AskBeforeCreatingTicket": 0,
    "State": null,
    "CopyToNewTickets": 1,
    "SortOrder": 10
  },
  {
    "Id": 3,
    "TicketTypeId": 2,
    "EntityTypeId": 1,
    "EntityTypeName": "CLIENTES",
    "AskBeforeCreatingTicket": 0,
    "State": null,
    "CopyToNewTickets": 1,
    "SortOrder": 10
  },
  {
    "Id": 4,
    "TicketTypeId": 2,
    "EntityTypeId": 3,
    "EntityTypeName": "REPARTIDORES",
    "AskBeforeCreatingTicket": 0,
    "State": null,
    "CopyToNewTickets": 1,
    "SortOrder": 20
  }
]
```

## TicketsEliminados
```json
[
  {
    "Id": 1,
    "TicketId": 26775,
    "FechaEliminacion": "2025-05-18T13:13:06.360",
    "FechaOriginal": "2025-05-17T15:55:03.703",
    "Referencia": "20",
    "MontoTotal": 65.0,
    "TipoTicket": "Para LLevar",
    "UsuarioEliminacion": "admin",
    "EstadoRestauracion": 0,
    "DatosTicket": "{\"id\": 26775, \"ticket_number\": \"20\", \"fecha\": \"2025-05-17T15:55:03.703000\", \"tipo_id\": 4, \"tipo_nombre\": \"Para LLevar\", \"monto\": 65.0, \"items\": []}"
  }
]
```

## clients
```json
[
  {
    "id": 268,
    "rfc": "GOCM880131CF2",
    "business_name": "GAS MENGUC",
    "tax_regime": "601",
    "country": "MEX",
    "last_sync": "2025-01-28T08:56:32.080",
    "uid": "677f25fc4c78a",
    "status": "active"
  },
  {
    "id": 269,
    "rfc": "GME671220EJ2",
    "business_name": "GAS MENGUC",
    "tax_regime": "601",
    "country": "MEX",
    "last_sync": "2025-01-28T08:56:32.100",
    "uid": "677f2636cb563",
    "status": "active"
  },
  {
    "id": 270,
    "rfc": "MEG011006AC3",
    "business_name": "MEGAVET",
    "tax_regime": "601",
    "country": "MEX",
    "last_sync": "2025-01-28T08:56:32.120",
    "uid": "6780697768f1f",
    "status": "active"
  }
]
```

## MenuAssignments
```json
[
  {
    "Id": 3,
    "TicketTypeId": 3,
    "TerminalId": 1,
    "MenuId": 5,
    "TerminalName": "Server",
    "SortOrder": 10
  }
]
```

## MenuItemPrices
```json
[
  {
    "Id": 2176,
    "MenuItemPortionId": 10031,
    "PriceTag": null,
    "Price": 65.00
  },
  {
    "Id": 2177,
    "MenuItemPortionId": 10032,
    "PriceTag": null,
    "Price": 110.00
  },
  {
    "Id": 2178,
    "MenuItemPortionId": 10033,
    "PriceTag": null,
    "Price": 210.00
  }
]
```

## Numerators
```json
[
  {
    "Id": 1,
    "LastUpdateTime": "0x00000000006B9311",
    "Number": 27211,
    "NumberFormat": "#",
    "Name": "Generador de números de Ticket"
  },
  {
    "Id": 2,
    "LastUpdateTime": "0x00000000006BB252",
    "Number": 27171,
    "NumberFormat": "#",
    "Name": "Generador de números de orden"
  },
  {
    "Id": 3,
    "LastUpdateTime": "0x000000000069BE82",
    "Number": 27128,
    "NumberFormat": "#",
    "Name": "Generador de números de Ticket reparto"
  }
]
```

## alembic_version
```json
{
  "version_num": "346cace59137"
}
```

## TicketTagMaps
```json
[
  {
    "Id": 4,
    "TicketTagGroupId": 2,
    "TerminalId": 0,
    "DepartmentId": 7,
    "UserRoleId": 0,
    "TicketTypeId": 2
  },
  {
    "Id": 18,
    "TicketTagGroupId": 3,
    "TerminalId": 0,
    "DepartmentId": 0,
    "UserRoleId": 0,
    "TicketTypeId": 2
  },
  {
    "Id": 20,
    "TicketTagGroupId": 10,
    "TerminalId": 0,
    "DepartmentId": 7,
    "UserRoleId": 0,
    "TicketTypeId": 0
  }
]
```

## ProcesamientoHistorial
```json
[]
```

## EntityStateLogs
```json
[]
```

## ProcesamientoDetalle
```json
[]
```

## ForeignCurrencies
```json
[]
```

## InventoryItemUnits
```json
[]
```

## InventoryTransactionDocuments
```json
[]
```

## invoiced_tickets
```json
[]
```

## ChangePaymentTypeMaps
```json
[]
```

## ChangePaymentTypes
```json
[]
```

## CostItems
```json
[]
```

## Triggers
```json
[]
```

## VistaTickets
```json
[
  {
    "TicketId": 26756,
    "TicketNumber": "2",
    "Date": "2025-02-05T10:54:20.023",
    "TotalAmount": 243.00,
    "RemainingAmount": 0.00,
    "IsClosed": 1,
    "Cliente": null,
    "TicketTags": "[{\"TN\":\"TICKET NO\",\"TT\":1,\"TV\":\"2\"},{\"TN\":\"FACTURAS\",\"TT\":0,\"TV\":\"PUBLICO GENERAL\"}]"
  },
  {
    "TicketId": 26761,
    "TicketNumber": "3",
    "Date": "2025-05-13T21:35:49.173",
    "TotalAmount": 210.00,
    "RemainingAmount": 0.00,
    "IsClosed": 1,
    "Cliente": null,
    "TicketTags": "[{\"TN\":\"TICKET NO\",\"TT\":1,\"TV\":\"1\"},{\"TN\":\"FACTURAS\",\"TT\":0,\"TV\":\"PUBLICO GENERAL\"}]"
  },
  {
    "TicketId": 26765,
    "TicketNumber": "4",
    "Date": "2025-05-13T22:03:00.713",
    "TotalAmount": 65.00,
    "RemainingAmount": 0.00,
    "IsClosed": 1,
    "Cliente": null,
    "TicketTags": "[{\"TN\":\"TICKET NO\",\"TT\":1,\"TV\":\"3\"},{\"TN\":\"FACTURAS\",\"TT\":0,\"TV\":\"PUBLICO GENERAL\"}]"
  }
]
```

## VistaDetalleOrdenes
```json
[
  {
    "OrderId": 66747,
    "TicketId": 26756,
    "MenuItemId": 1783,
    "Producto": "POLLO",
    "Quantity": 1.0,
    "Price": 210.0,
    "Importe": 210.0,
    "PortionName": "Normal",
    "DecreaseInventory": 1,
    "IncreaseInventory": 0
  },
  {
    "OrderId": 66748,
    "TicketId": 26756,
    "MenuItemId": 1788,
    "Producto": "SALSA AGUACATE",
    "Quantity": 1.0,
    "Price": 10.0,
    "Importe": 10.0,
    "PortionName": "Normal",
    "DecreaseInventory": 1,
    "IncreaseInventory": 0
  },
  {
    "OrderId": 66749,
    "TicketId": 26756,
    "MenuItemId": 1790,
    "Producto": "PAPAS AL AJILLO",
    "Quantity": 1.0,
    "Price": 15.0,
    "Importe": 15.0,
    "PortionName": "MEDIA ORD",
    "DecreaseInventory": 1,
    "IncreaseInventory": 0
  }
]
```

## VistaPagos
```json
[
  {
    "PagoId": 25583,
    "TicketId": 26756,
    "Date": "2025-02-05T10:54:34.570",
    "Amount": 243.00,
    "MetodoPago": "Tarjeta de crédito",
    "Usuario": "Tarjeta de crédito",
    "Description": null
  },
  {
    "PagoId": 25588,
    "TicketId": 26761,
    "Date": "2025-05-13T21:35:52.057",
    "Amount": 210.00,
    "MetodoPago": "Tarjeta de crédito",
    "Usuario": "Tarjeta de crédito",
    "Description": null
  },
  {
    "PagoId": 25590,
    "TicketId": 26765,
    "Date": "2025-05-13T22:03:02.623",
    "Amount": 65.00,
    "MetodoPago": "Tarjeta de crédito",
    "Usuario": "Tarjeta de crédito",
    "Description": null
  }
]
```

## VistaClientes
```json
[
  {
    "ClienteId": 45894,
    "Nombre": "juan",
    "CustomData": "[{\"Name\":\"Telefono\",\"Value\":\"312123456789\"},{\"Name\":\"Direccion\",\"Value\":\"colima \"},{\"Name\":\"Colonia\",\"Value\":null},{\"Name\":\"Ciudad\",\"Value\":null},{\"Name\":\"Observaciones\",\"Value\":null},{\"Name\":\"LastTicketId\",\"Value\":null},{\"Name\":\"Disponible\",\"Value\":null}]"
  },
  {
    "ClienteId": 45895,
    "Nombre": "MARICARMEN",
    "CustomData": "[{\"Name\":\"Telefono\",\"Value\":\"3123123432\"},{\"Name\":\"Direccion\",\"Value\":\"ALBERT EINSTEIN  871 MONTELLANO  VILLA DE ALVAREZ \"},{\"Name\":\"Colonia\",\"Value\":null},{\"Name\":\"Ciudad\",\"Value\":null},{\"Name\":\"Observaciones\",\"Value\":null},{\"Name\":\"LastTicketId\",\"Value\":null}]"
  },
  {
    "ClienteId": 45900,
    "Nombre": "ADRIAN FLORES",
    "CustomData": "[{\"Name\":\"Telefono\",\"Value\":\"3125949330\"},{\"Name\":\"Direccion\",\"Value\":\"SAN FERNANDO 10 MAS CELULAR\"},{\"Name\":\"Colonia\",\"Value\":null},{\"Name\":\"Ciudad\",\"Value\":null},{\"Name\":\"Observaciones\",\"Value\":null},{\"Name\":\"LastTicketId\",\"Value\":null}]"
  }
]
```

## VistaDepartamentos
```json
[
  {
    "DepartamentoId": 7,
    "Departamento": "REPARTO"
  },
  {
    "DepartamentoId": 9,
    "Departamento": "COBRO RAPIDO"
  },
  {
    "DepartamentoId": 10,
    "Departamento": "APP"
  }
]
```

## VistaEntidades
```json
[
  {
    "EntidadId": 45894,
    "Nombre": "juan",
    "EntityTypeId": 1,
    "CustomData": "[{\"Name\":\"Telefono\",\"Value\":\"312123456789\"},{\"Name\":\"Direccion\",\"Value\":\"colima \"},{\"Name\":\"Colonia\",\"Value\":null},{\"Name\":\"Ciudad\",\"Value\":null},{\"Name\":\"Observaciones\",\"Value\":null},{\"Name\":\"LastTicketId\",\"Value\":null},{\"Name\":\"Disponible\",\"Value\":null}]"
  },
  {
    "EntidadId": 45895,
    "Nombre": "MARICARMEN",
    "EntityTypeId": 1,
    "CustomData": "[{\"Name\":\"Telefono\",\"Value\":\"3123123432\"},{\"Name\":\"Direccion\",\"Value\":\"ALBERT EINSTEIN  871 MONTELLANO  VILLA DE ALVAREZ \"},{\"Name\":\"Colonia\",\"Value\":null},{\"Name\":\"Ciudad\",\"Value\":null},{\"Name\":\"Observaciones\",\"Value\":null},{\"Name\":\"LastTicketId\",\"Value\":null}]"
  },
  {
    "EntidadId": 45900,
    "Nombre": "ADRIAN FLORES",
    "EntityTypeId": 1,
    "CustomData": "[{\"Name\":\"Telefono\",\"Value\":\"3125949330\"},{\"Name\":\"Direccion\",\"Value\":\"SAN FERNANDO 10 MAS CELULAR\"},{\"Name\":\"Colonia\",\"Value\":null},{\"Name\":\"Ciudad\",\"Value\":null},{\"Name\":\"Observaciones\",\"Value\":null},{\"Name\":\"LastTicketId\",\"Value\":null}]"
  }
]
```

## VistaAgendaPedidos

Ejemplo de payload:

[]

## VistaCierresCaja

Ejemplo de payload:

```json
[
  {
    "WorkPeriodId": 177,
    "StartDate": "2025-02-05 09:41:44.787",
    "EndDate": "2025-05-17 17:49:13.807",
    "StartDescription": null,
    "EndDescription": null,
    "Cerrado": 1
  },
  {
    "WorkPeriodId": 178,
    "StartDate": "2025-05-17 17:49:16.690",
    "EndDate": "2025-05-17 17:49:16.690",
    "StartDescription": null,
    "EndDescription": "NULL",
    "Cerrado": 1
  },
  {
    "WorkPeriodId": 183,
    "StartDate": "2025-07-04 15:00:25.423",
    "EndDate": "2025-07-04 15:00:26.590",
    "StartDescription": "NULL",
    "EndDescription": "NULL",
    "Cerrado": 1
  }
]
```

## VistaMenuCategorias

Ejemplo de payload:

```json
[
  { "Categoria": "EXTRAS" },
  { "Categoria": "POLLOS" },
  { "Categoria": "TEST" }
]
```

## VistaGastos
```json
[]
```

## VistaInventario
```json
[]
```

## VistaListasPrecios
```json
[]
```

## VistaMenuItems
```json
[]
```

## VistaMenuItemsPantalla
```json
[]
```

## VistaMenuPorciones
```json
[]
```

## VistaMenuPrecios
```json
[]
```

## VistaMenuPreciosPorLista
```json
[]
```

## VistaMenus
```json
[]
```

## VistaOrderTagMaps
```json
[]
```

## VistaOrderTagsPorProducto
```json
[]
```

## VistaPaymentTypes
```json
[]
```

## VistaScreenMenuCategories
```json
[]
```

## VistaScreenMenus
```json
[]
```

## VistaUsuarios
```json
[]
```

---

# Configuración y mejores prácticas de desarrollo para el stack Next.js 14 + React + Prisma + PostgreSQL

## Reglas generales
- Usar TypeScript en todo el proyecto (Next.js soporta TS nativamente).
- Validar todos los contratos de datos con Zod y/o Prisma schemas.
- Usar ESLint con la configuración recomendada para Next.js, React y TypeScript.
- Usar Prettier para formateo automático de código.
- Mantener dependencias actualizadas y seguras (npm audit, dependabot).
- Usar Husky para hooks de pre-commit (lint, test, format).
- Documentar todos los endpoints y modelos con comentarios JSDoc y/o archivos markdown.
- Usar variables de entorno con dotenv y Next.js env system.
- Versionar la base de datos con Prisma Migrate.
- Usar tests unitarios y de integración con Jest y React Testing Library.
- Usar GitHub Actions para CI/CD (lint, test, build, deploy).
- Mantener una rama principal protegida (main/master) y usar PRs para cambios.
- Usar convenciones de commits (Conventional Commits).
- Mantener un CHANGELOG.md actualizado.
- Usar Storybook para componentes UI reutilizables.
- Usar dependencias sólo si son necesarias y bien mantenidas.
- Revisar y refactorizar código legacy o duplicado.
- Mantener la arquitectura modular y desacoplada.
- Usar Docker para desarrollo y despliegue local.
- Usar .env.example y documentación de setup para onboarding rápido.

## Cómo guardar el avance y referencia de lo hecho vs lo pendiente
- Mantener un archivo `docs/avance.md` donde se registre:
  - Fecha, autor y descripción breve de cada avance relevante.
  - Listado de tareas completadas y pendientes.
  - Referencia a PRs, commits y archivos modificados.
  - Deuda técnica detectada y sugerencias de refactor.
- Usar issues y milestones en GitHub para rastrear tareas y deuda técnica.
- Documentar en cada PR lo que se resolvió y lo que queda pendiente.
- Actualizar el índice de documentación y los ejemplos de payloads cada vez que se agregue o modifique un modelo, vista o endpoint.
- Mantener un backlog de deuda técnica en el mismo archivo o en issues.
- Hacer revisiones periódicas del backlog y priorizar según impacto.

## Ejemplo de estructura para docs/avance.md

```
# Avance del proyecto SambaPOS Branches

## 2025-08-22
- [x] Extracción y documentación de payloads reales para todas las vistas principales.
- [x] Agregado bloques vacíos para vistas sin datos.
- [x] Configuración de reglas de desarrollo y documentación de mejores prácticas.
- [ ] Faltan ejemplos reales para vistas secundarias y algunos procedimientos.
- [ ] Refactorizar modelos para normalización de datos.
- [ ] Implementar tests de integración para endpoints críticos.

## Deuda técnica
- Falta validación estricta en algunos endpoints.
- Algunos modelos tienen campos legacy no usados.
- Faltan tests para lógica de negocio compleja.
```
