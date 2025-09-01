CREATE PROCEDURE sp_EliminarDocumentoContable
    @DocumentId INT
AS
    DELETE FROM AccountTransactionDocuments WHERE Id = @DocumentId;
