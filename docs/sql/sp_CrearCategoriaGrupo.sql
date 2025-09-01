CREATE PROCEDURE sp_CrearCategoriaGrupo
    @GroupCode NVARCHAR(255)
AS
    -- No existe tabla, se crea en MenuItems al asociar
    UPDATE MenuItems SET GroupCode = @GroupCode WHERE Id = 0; -- placeholder
