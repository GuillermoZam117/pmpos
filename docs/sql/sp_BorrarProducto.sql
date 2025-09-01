CREATE PROCEDURE sp_BorrarProducto
    @ProductoId INT
AS
    DELETE FROM MenuItems WHERE Id = @ProductoId;
