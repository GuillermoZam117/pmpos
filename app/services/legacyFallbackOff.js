// Side-effect module to disable legacy GraphQL fallbacks by table
// Discovery must exclusively use dataManager.getActiveTickets()

import { ticketService } from './ticketService';

try {
  if (ticketService && typeof ticketService === 'object') {
    // Disable legacy lookup by table completely
    ticketService.getTicketByTable = async () => ({
      success: false,
      ticket: null,
      source: 'disabled',
      error: 'Legacy getTicketByTable disabled - use active tickets discovery'
    });
  }
} catch (_) {}

