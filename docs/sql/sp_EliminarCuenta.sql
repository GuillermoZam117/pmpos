CREATE PROCEDURE sp_EliminarCuenta
    @AccountId INT
AS
    DELETE FROM AccountTransactionAccounts WHERE Id = @AccountId;
