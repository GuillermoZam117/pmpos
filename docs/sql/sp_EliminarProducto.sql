CREATE PROCEDURE sp_EliminarProducto
    @ProductoId INT
AS
    DELETE FROM MenuItems WHERE Id = @ProductoId;
