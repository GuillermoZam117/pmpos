CREATE PROCEDURE sp_EditarCuenta
    @AccountId INT,
    @Name NVARCHAR(255),
    @Description NVARCHAR(255)
AS
    UPDATE AccountTransactionAccounts
    SET Name = @Name, Description = @Description
    WHERE Id = @AccountId;
