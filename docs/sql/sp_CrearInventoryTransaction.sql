CREATE PROCEDURE sp_CrearInventoryTransaction
    @InventoryItemId INT,
    @Quantity DECIMAL(18,3),
    @Unit NVARCHAR(50),
    @SourceWarehouseId INT = NULL,
    @TargetWarehouseId INT = NULL,
    @TotalPrice DECIMAL(18,2) = 0
AS
    INSERT INTO InventoryTransactions (InventoryItem_Id, Quantity, Unit, SourceWarehouseId, TargetWarehouseId, TotalPrice)
    VALUES (@InventoryItemId, @Quantity, @Unit, @SourceWarehouseId, @TargetWarehouseId, @TotalPrice);
    SELECT SCOPE_IDENTITY() AS InventoryTransactionId;
