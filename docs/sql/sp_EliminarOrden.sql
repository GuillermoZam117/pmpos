CREATE PROCEDURE sp_EliminarOrden
    @OrderId INT
AS
    DELETE FROM Orders WHERE Id = @OrderId;
