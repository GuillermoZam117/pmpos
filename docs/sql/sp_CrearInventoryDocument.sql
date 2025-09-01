CREATE PROCEDURE sp_CrearInventoryDocument
    @Name NVARCHAR(255),
    @Date DATETIME
AS
    INSERT INTO InventoryDocuments (Name, Date) VALUES (@Name, @Date);
    SELECT SCOPE_IDENTITY() AS DocumentId;
