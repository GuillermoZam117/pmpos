CREATE PROCEDURE sp_CrearInventoryItem
    @Name NVARCHAR(255)
AS
    INSERT INTO InventoryItems (Name) VALUES (@Name);
    SELECT SCOPE_IDENTITY() AS ItemId;
