CREATE VIEW dbo.VistaInventario AS
SELECT
    it.Id AS InventarioId,
    it.InventoryItem_Id,
    ii.Name AS NombreItem,
    it.Date,
    it.Quantity,
    it.Unit,
    it.SourceWarehouseId,
    it.TargetWarehouseId,
    it.TotalPrice
FROM InventoryTransactions it
INNER JOIN InventoryItems ii ON it.InventoryItem_Id = ii.Id;
