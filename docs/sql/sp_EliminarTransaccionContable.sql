CREATE PROCEDURE sp_EliminarTransaccionContable
    @TransactionId INT
AS
    DELETE FROM AccountTransactions WHERE Id = @TransactionId;
