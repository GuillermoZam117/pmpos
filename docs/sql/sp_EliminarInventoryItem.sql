CREATE PROCEDURE sp_EliminarInventoryItem
    @ItemId INT
AS
    DELETE FROM InventoryItems WHERE Id = @ItemId;
