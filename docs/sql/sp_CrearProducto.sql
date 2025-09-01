CREATE PROCEDURE sp_CrearProducto
    @Name NVARCHAR(255),
    @GroupCode NVARCHAR(255) = NULL
AS
    INSERT INTO MenuItems (Name, GroupCode) VALUES (@Name, @GroupCode);
    SELECT SCOPE_IDENTITY() AS ProductoId;
