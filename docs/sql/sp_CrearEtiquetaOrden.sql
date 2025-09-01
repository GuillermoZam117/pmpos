CREATE PROCEDURE sp_CrearEtiquetaOrden
    @Name NVARCHAR(255),
    @OrderTagGroupId INT,
    @SortOrder INT
AS
    INSERT INTO OrderTags (Name, OrderTagGroupId, SortOrder)
    VALUES (@Name, @OrderTagGroupId, @SortOrder);
    SELECT SCOPE_IDENTITY() AS OrderTagId;
