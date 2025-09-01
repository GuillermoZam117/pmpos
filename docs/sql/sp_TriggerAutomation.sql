CREATE PROCEDURE sp_TriggerAutomation
    @AutomationCommandId INT,
    @TicketId            INT            = NULL,
    @OrderUid            NVARCHAR(MAX)  = NULL,
    @UserId              INT            = NULL,
    @AdminId             INT            = NULL
AS
BEGIN
    -- Lógica de ejecución de automatización
END
