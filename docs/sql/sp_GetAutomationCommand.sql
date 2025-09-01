CREATE PROCEDURE sp_GetAutomationCommand
    @CommandId INT
AS
    SELECT * FROM AutomationCommands WHERE Id = @CommandId;
