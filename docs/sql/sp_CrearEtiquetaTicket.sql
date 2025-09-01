CREATE PROCEDURE sp_CrearEtiquetaTicket
    @Name NVARCHAR(255),
    @TicketTagGroupId INT,
    @SortOrder INT
AS
    INSERT INTO TicketTags (Name, TicketTagGroupId, SortOrder)
    VALUES (@Name, @TicketTagGroupId, @SortOrder);
    SELECT SCOPE_IDENTITY() AS TagId;
