CREATE PROCEDURE sp_ActualizarOrden
    @OrderId INT,
    @Quantity DECIMAL(18,3),
    @Price DECIMAL(18,2)
AS
    UPDATE Orders SET Quantity = @Quantity, Price = @Price WHERE Id = @OrderId;
