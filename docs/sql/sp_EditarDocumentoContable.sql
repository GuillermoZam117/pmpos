CREATE PROCEDURE sp_EditarDocumentoContable
    @DocumentId INT,
    @Name NVARCHAR(255),
    @Date DATETIME
AS
    UPDATE AccountTransactionDocuments
    SET Name = @Name, Date = @Date
    WHERE Id = @DocumentId;
