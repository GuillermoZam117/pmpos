CREATE PROCEDURE sp_RegistrarPago
    @TicketId INT,
    @Amount DECIMAL(18,2),
    @PaymentTypeId INT,
    @Description NVARCHAR(255) = NULL
AS
    INSERT INTO Payments (TicketId, Amount, PaymentTypeId, Description)
    VALUES (@TicketId, @Amount, @PaymentTypeId, @Description);
    SELECT SCOPE_IDENTITY() AS PagoId;
