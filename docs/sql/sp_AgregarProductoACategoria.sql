CREATE PROCEDURE sp_AgregarProductoACategoria
    @GroupCode NVARCHAR(255),
    @ProductoId INT
AS
    UPDATE MenuItems SET GroupCode = @GroupCode WHERE Id = @ProductoId;
