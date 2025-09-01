CREATE PROCEDURE sp_CrearCuenta
    @Name NVARCHAR(255),
    @Description NVARCHAR(255)
AS
    INSERT INTO AccountTransactionAccounts (Name, Description)
    VALUES (@Name, @Description);
    SELECT SCOPE_IDENTITY() AS AccountId;
