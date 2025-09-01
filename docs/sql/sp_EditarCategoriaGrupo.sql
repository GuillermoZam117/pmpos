CREATE PROCEDURE sp_EditarCategoriaGrupo
    @OldCode NVARCHAR(255),
    @NewCode NVARCHAR(255)
AS
    UPDATE MenuItems SET GroupCode = @NewCode WHERE GroupCode = @OldCode;
