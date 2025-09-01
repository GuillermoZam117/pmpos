CREATE PROCEDURE sp_EliminarPorcion
    @PortionId INT
AS
    DELETE FROM MenuItemPortions WHERE Id = @PortionId;
