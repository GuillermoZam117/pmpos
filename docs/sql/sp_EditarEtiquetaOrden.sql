CREATE PROCEDURE sp_EditarEtiquetaOrden
    @OrderTagId INT,
    @Name NVARCHAR(255),
    @SortOrder INT
AS
    UPDATE OrderTags
    SET Name = @Name, SortOrder = @SortOrder
    WHERE Id = @OrderTagId;
