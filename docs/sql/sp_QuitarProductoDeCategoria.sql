CREATE PROCEDURE sp_QuitarProductoDeCategoria
    @ProductoId INT
AS
    UPDATE MenuItems SET GroupCode = NULL WHERE Id = @ProductoId;
