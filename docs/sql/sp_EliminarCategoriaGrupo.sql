CREATE PROCEDURE sp_EliminarCategoriaGrupo
    @GroupCode NVARCHAR(255)
AS
    UPDATE MenuItems SET GroupCode = NULL WHERE GroupCode = @GroupCode;
