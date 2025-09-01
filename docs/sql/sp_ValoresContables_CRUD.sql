CREATE PROCEDURE sp_ValoresContables_CRUD
    @Action CHAR(1),       -- 'L','O','C','U','D'
    @Id     INT     = NULL,
    @TransactionId INT = NULL,
    @Debit  DECIMAL(16,2)= NULL,
    @Credit DECIMAL(16,2)= NULL,
    @Exchange DECIMAL(16,2)= NULL
AS
BEGIN
    -- Implementación CRUD de valores contables
END
