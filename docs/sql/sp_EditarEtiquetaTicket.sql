CREATE PROCEDURE sp_EditarEtiquetaTicket
    @TagId INT,
    @Name NVARCHAR(255),
    @SortOrder INT
AS
    UPDATE TicketTags
    SET Name = @Name, SortOrder = @SortOrder
    WHERE Id = @TagId;
