CREATE VIEW dbo.VistaGastos AS
SELECT
    at.Id AS AccountTransactionId,
    atd.Date AS FechaDocumento,
    at.Name AS TipoMovimiento,
    at.Amount,
    at.AccountTransactionDocumentId,
    atd.Name AS Documento
FROM AccountTransactions at
INNER JOIN AccountTransactionDocuments atd ON at.AccountTransactionDocumentId = atd.Id;
