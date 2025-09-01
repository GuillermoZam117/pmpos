CREATE PROCEDURE sp_ExecuteAutomationCommand
    @CommandId INT,
    @Params NVARCHAR(MAX)
AS
    -- lógica de ejecución real
    EXEC sp_TriggerAutomation @CommandId, @Params;
