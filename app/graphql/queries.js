// Canonical GraphQL queries and mutations (based on discovery docs)

export const GET_PAYMENT_TYPES = `
  query {
    getPaymentTypes { id name }
  }
`;

export const GET_OPEN_TICKETS = `
  query {
    getTickets(isClosed: false, orderBy: date) {
      id number totalAmount remainingAmount
      entities { type name }
      orders { id menuItemName quantity price }
      states { stateName state }
    }
  }
`;

export const GET_ENTITY_SCREEN_ITEMS = `
  query ($name: String) {
    getEntityScreenItems(name: $name) {
      id name caption color labelColor state customData
    }
  }
`;

export const GET_PRODUCTS = `
  query {
    getProducts {
      id
      name
      groupCode
      barcode
      portions { id name price }
      tags { id name price }
    }
  }
`;

export const GET_MENU = `
  query ($name: String) {
    getMenu(name: $name) {
      categories {
        id
        name
        menuItems {
          id
          name
          caption
          quantity
          product {
            id
            name
            barcode
            groupCode
            price
            portions { id name price }
          }
        }
      }
    }
  }
`;

export const GET_TERMINAL_TICKET = `
  query ($terminalId: String) {
    getTerminalTicket(terminalId: $terminalId) {
      id number totalAmount remainingAmount
      orders { uid name quantity price portion orderTags }
    }
  }
`;

export const LOAD_TERMINAL_TICKET = `
  mutation ($terminalId: String, $ticketId: String) {
    loadTerminalTicket(terminalId: $terminalId, ticketId: $ticketId) {
      id number totalAmount remainingAmount
      orders { uid name quantity price portion }
    }
  }
`;

export const ADD_ORDER_TO_TERMINAL_TICKET = `
  mutation (
    $terminalId: String,
    $productName: String,
    $quantity: Float,
    $portion: String
  ) {
    addOrderToTerminalTicket(
      terminalId: $terminalId,
      productName: $productName,
      quantity: $quantity,
      portion: $portion
    ) {
      totalAmount
      remainingAmount
    }
  }
`;

export const ADD_ORDER_TO_TERMINAL_TICKET_BY_ID = `
  mutation (
    $terminalId: String,
    $productId: Int,
    $quantity: Float,
    $portion: String
  ) {
    addOrderToTerminalTicket(
      terminalId: $terminalId,
      productId: $productId,
      quantity: $quantity,
      portion: $portion
    ) {
      totalAmount
      remainingAmount
    }
  }
`;

export const CHANGE_ENTITY_OF_TERMINAL_TICKET = `
  mutation ($terminalId: String, $type: String, $name: String) {
    changeEntityOfTerminalTicket(terminalId: $terminalId, type: $type, name: $name) {
      id
      entities { name type }
    }
  }
`;

export const EXECUTE_PAYMENT = `
  mutation ($terminalId: String!, $paymentTypeName: String!, $amount: Float!) {
    executePayment(
      terminalId: $terminalId,
      paymentTypeName: $paymentTypeName,
      amount: $amount
    )
  }
`;

export const PAY_TERMINAL_TICKET = `
  mutation ($terminalId: String!, $paymentTypeName: String!, $amount: Float!) {
    payTerminalTicket(
      terminalId: $terminalId,
      paymentTypeName: $paymentTypeName,
      amount: $amount
    ) {
      ticketId
      amount
      remainingAmount
      errorMessage
    }
  }
`;

export const CLOSE_TERMINAL_TICKET = `
  mutation ($terminalId: String) {
    closeTerminalTicket(terminalId: $terminalId)
  }
`;

export const TICKET_DETAILS = `
  query ($ticketId: String) {
    ticket(id: $ticketId) {
      id number date totalAmount remainingAmount entityName ticketTags
      orders { uid name quantity price total portion orderTags }
      payments { amount paymentType date }
    }
  }
`;

export const GET_TABLE_TICKETS = `
  query ($entityName: String) {
    tickets(entityName: $entityName) {
      id number date totalAmount remainingAmount
    }
  }
`;

export default {
  GET_PAYMENT_TYPES,
  GET_OPEN_TICKETS,
  GET_ENTITY_SCREEN_ITEMS,
  GET_PRODUCTS,
  GET_MENU,
  GET_TERMINAL_TICKET,
  LOAD_TERMINAL_TICKET,
  CHANGE_ENTITY_OF_TERMINAL_TICKET,
  EXECUTE_PAYMENT,
  PAY_TERMINAL_TICKET,
  CLOSE_TERMINAL_TICKET,
  TICKET_DETAILS,
  GET_TABLE_TICKETS,
  ADD_ORDER_TO_TERMINAL_TICKET,
  ADD_ORDER_TO_TERMINAL_TICKET_BY_ID
};
