CREATE PROCEDURE sp_ActualizarPrecioProducto
    @ProductoId INT,
    @Precio DECIMAL(18,2)
AS
    UPDATE MenuItems SET Price = @Precio WHERE Id = @ProductoId;
