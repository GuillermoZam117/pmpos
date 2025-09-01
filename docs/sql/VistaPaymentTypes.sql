CREATE VIEW dbo.VistaPaymentTypes AS
SELECT
    pt.Id AS PaymentTypeId,
    pt.Name AS MetodoPago
FROM PaymentTypes pt;
