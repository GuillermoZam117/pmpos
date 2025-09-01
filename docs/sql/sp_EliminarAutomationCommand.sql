CREATE PROCEDURE sp_EliminarAutomationCommand
    @CommandId INT
AS
    DELETE FROM AutomationCommands WHERE Id = @CommandId;
