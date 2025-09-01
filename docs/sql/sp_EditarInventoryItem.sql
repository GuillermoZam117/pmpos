CREATE PROCEDURE sp_EditarInventoryItem
    @ItemId INT,
    @Name NVARCHAR(255)
AS
    UPDATE InventoryItems SET Name = @Name WHERE Id = @ItemId;
