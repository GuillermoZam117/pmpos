CREATE PROCEDURE sp_GetInventoryItem
    @ItemId INT
AS
    SELECT * FROM InventoryItems WHERE Id = @ItemId;
