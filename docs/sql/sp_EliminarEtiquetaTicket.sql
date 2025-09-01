CREATE PROCEDURE sp_EliminarEtiquetaTicket
    @TagId INT
AS
    DELETE FROM TicketTags WHERE Id = @TagId;
