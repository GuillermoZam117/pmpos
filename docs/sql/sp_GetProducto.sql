CREATE PROCEDURE sp_GetProducto
    @ProductoId INT
AS
    SELECT * FROM MenuItems WHERE Id = @ProductoId;
