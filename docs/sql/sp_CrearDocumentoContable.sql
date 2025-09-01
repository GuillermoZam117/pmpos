CREATE PROCEDURE sp_CrearDocumentoContable
    @Name NVARCHAR(255),
    @Date DATETIME
AS
    INSERT INTO AccountTransactionDocuments (Name, Date)
    VALUES (@Name, @Date);
    SELECT SCOPE_IDENTITY() AS DocumentId;
