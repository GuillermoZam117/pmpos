CREATE PROCEDURE sp_EditarTransaccionContable
    @TransactionId INT,
    @Name NVARCHAR(255),
    @Amount DECIMAL(18,2)
AS
    UPDATE AccountTransactions
    SET Name = @Name, Amount = @Amount
    WHERE Id = @TransactionId;
