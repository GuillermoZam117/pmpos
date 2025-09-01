CREATE PROCEDURE sp_AutomationCommands_CRUD
    @Action            CHAR(1),          -- 'L','O','C','U','D'
    @Id                INT               = NULL,
    @Name              NVARCHAR(255)     = NULL,
    @Category          NVARCHAR(255)     = NULL
AS
BEGIN
    -- Implementación CRUD de comandos de automatización
END
