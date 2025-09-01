CREATE PROCEDURE sp_ListarValoresTransaccion
    @TransactionId INT
AS
    SELECT * FROM AccountTransactionValues WHERE AccountTransactionId = @TransactionId;
