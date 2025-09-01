CREATE PROCEDURE sp_RecalcularTicket
    @TicketId INT
AS
    -- lógica de recálculo según tus SPs o cálculos existentes
    EXEC sp_RecalcularMontos @TicketId;
