CREATE VIEW dbo.VistaDetalleOrdenes AS
SELECT
    o.Id AS OrderId,
    o.TicketId,
    o.MenuItemId,
    mi.Name AS Producto,
    o.Quantity,
    o.Price,
    (o.Price * o.Quantity) AS Importe,
    o.PortionName,
    o.DecreaseInventory,
    o.CreatedDateTime
FROM Orders o
INNER JOIN MenuItems mi ON o.MenuItemId = mi.Id;
