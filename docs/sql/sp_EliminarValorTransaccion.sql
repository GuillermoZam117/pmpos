CREATE PROCEDURE sp_EliminarValorTransaccion
    @ValueId INT
AS
    DELETE FROM AccountTransactionValues WHERE Id = @ValueId;
