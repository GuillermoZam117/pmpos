CREATE PROCEDURE sp_ObtenerProductoPorId
    @ProductoId INT
AS
    SELECT * FROM MenuItems WHERE Id = @ProductoId;
