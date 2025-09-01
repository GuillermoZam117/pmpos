CREATE PROCEDURE sp_HistoryProducto
    @ProductoId INT
AS
    -- Lógica para obtener el historial del producto
    SELECT * FROM ProductHistory WHERE ProductoId = @ProductoId;
