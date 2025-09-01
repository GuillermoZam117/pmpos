CREATE PROCEDURE sp_EditarProducto
    @ProductoId INT,
    @Name NVARCHAR(255),
    @GroupCode NVARCHAR(255) = NULL
AS
    UPDATE MenuItems SET Name = @Name, GroupCode = @GroupCode WHERE Id = @ProductoId;
